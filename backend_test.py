#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Motivational Task Management App
Tests all authentication, task management, reward system, doubt system, and admin APIs
"""

import requests
import json
import base64
from datetime import datetime, timedelta
import time
import sys
import os

# Configuration
BACKEND_URL = "https://goaltask-manager.preview.emergentagent.com/api"

# Test data
TEST_USERS = {
    "admin": {
        "email": "admin@taskapp.com",
        "password": "admin123",
        "name": "Admin User",
        "role": "admin"
    },
    "user": {
        "email": "user@taskapp.com", 
        "password": "user123",
        "name": "Regular User",
        "role": "user"
    }
}

# Sample base64 image (1x1 pixel PNG)
SAMPLE_IMAGE_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="

class APITester:
    def __init__(self):
        self.tokens = {}
        self.users = {}
        self.tasks = []
        self.rewards = []
        self.doubts = []
        self.test_results = []
        
    def log_result(self, test_name, success, message="", details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "details": details
        }
        self.test_results.append(result)
        print(f"{status}: {test_name}")
        if message:
            print(f"   {message}")
        if not success and details:
            print(f"   Details: {details}")
        print()
        
    def make_request(self, method, endpoint, data=None, token=None, expect_success=True):
        """Make HTTP request with error handling"""
        url = f"{BACKEND_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
            
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method == "PATCH":
                response = requests.patch(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            if expect_success and response.status_code >= 400:
                return None, f"HTTP {response.status_code}: {response.text}"
            elif not expect_success and response.status_code < 400:
                return None, f"Expected failure but got HTTP {response.status_code}"
                
            return response.json() if response.content else {}, None
            
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"
        except json.JSONDecodeError as e:
            return None, f"Invalid JSON response: {str(e)}"
            
    def test_authentication(self):
        """Test all authentication endpoints"""
        print("=== TESTING AUTHENTICATION APIs ===")
        
        # Test user registration
        for role, user_data in TEST_USERS.items():
            response, error = self.make_request("POST", "/auth/register", user_data)
            
            if error:
                self.log_result(f"Register {role} user", False, error)
                continue
                
            if not response.get("access_token") or not response.get("user"):
                self.log_result(f"Register {role} user", False, "Missing token or user data")
                continue
                
            # Store token and user info
            self.tokens[role] = response["access_token"]
            self.users[role] = response["user"]
            
            # Verify user data
            user = response["user"]
            expected_role = user_data["role"]
            if user.get("role") != expected_role:
                self.log_result(f"Register {role} user", False, f"Expected role {expected_role}, got {user.get('role')}")
                continue
                
            self.log_result(f"Register {role} user", True, f"User ID: {user.get('id')}")
            
        # Test login
        for role, user_data in TEST_USERS.items():
            login_data = {"email": user_data["email"], "password": user_data["password"]}
            response, error = self.make_request("POST", "/auth/login", login_data)
            
            if error:
                self.log_result(f"Login {role} user", False, error)
                continue
                
            if not response.get("access_token"):
                self.log_result(f"Login {role} user", False, "No access token returned")
                continue
                
            self.log_result(f"Login {role} user", True, "Login successful")
            
        # Test invalid login
        invalid_login = {"email": "wrong@email.com", "password": "wrongpass"}
        response, error = self.make_request("POST", "/auth/login", invalid_login, expect_success=False)
        
        if error and "401" in error:
            self.log_result("Invalid login rejection", True, "Correctly rejected invalid credentials")
        else:
            self.log_result("Invalid login rejection", False, "Should have rejected invalid credentials")
            
        # Test /auth/me endpoint
        for role in ["admin", "user"]:
            if role not in self.tokens:
                continue
                
            response, error = self.make_request("GET", "/auth/me", token=self.tokens[role])
            
            if error:
                self.log_result(f"Get current user ({role})", False, error)
                continue
                
            if not response.get("id") or not response.get("email"):
                self.log_result(f"Get current user ({role})", False, "Missing user data")
                continue
                
            self.log_result(f"Get current user ({role})", True, f"Retrieved user: {response.get('name')}")
            
    def test_task_management(self):
        """Test task management APIs"""
        print("=== TESTING TASK MANAGEMENT APIs ===")
        
        if "admin" not in self.tokens or "user" not in self.users:
            self.log_result("Task Management Setup", False, "Missing admin token or user data")
            return
            
        admin_token = self.tokens["admin"]
        user_id = self.users["user"]["id"]
        
        # Test task creation with different configurations
        task_configs = [
            {
                "title": "Task with Timer",
                "description": "Complete within 30 seconds",
                "timer_seconds": 30,
                "user_id": user_id
            },
            {
                "title": "Task with Due Date", 
                "description": "Complete by tomorrow",
                "due_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
                "user_id": user_id
            },
            {
                "title": "Task with Both Timer and Due Date",
                "description": "Complete within 60 seconds and by tomorrow",
                "timer_seconds": 60,
                "due_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
                "user_id": user_id
            },
            {
                "title": "Simple Task",
                "description": "No timer or due date",
                "user_id": user_id
            }
        ]
        
        for i, task_config in enumerate(task_configs):
            response, error = self.make_request("POST", "/tasks", task_config, token=admin_token)
            
            if error:
                self.log_result(f"Create task {i+1}", False, error)
                continue
                
            if not response.get("id") or response.get("status") != "pending":
                self.log_result(f"Create task {i+1}", False, "Invalid task response")
                continue
                
            self.tasks.append(response)
            self.log_result(f"Create task {i+1}", True, f"Created: {task_config['title']}")
            
        # Test task listing for admin
        response, error = self.make_request("GET", "/tasks", token=admin_token)
        
        if error:
            self.log_result("List tasks (admin)", False, error)
        elif not isinstance(response, list):
            self.log_result("List tasks (admin)", False, "Expected list of tasks")
        else:
            self.log_result("List tasks (admin)", True, f"Retrieved {len(response)} tasks")
            
        # Test task listing for regular user
        if "user" in self.tokens:
            response, error = self.make_request("GET", "/tasks", token=self.tokens["user"])
            
            if error:
                self.log_result("List tasks (user)", False, error)
            elif not isinstance(response, list):
                self.log_result("List tasks (user)", False, "Expected list of tasks")
            else:
                user_tasks = [t for t in response if t.get("user_id") == user_id]
                self.log_result("List tasks (user)", True, f"User sees {len(user_tasks)} of their tasks")
                
        # Test task completion and credit award
        if self.tasks:
            task_to_complete = self.tasks[0]  # Simple task or first available
            task_id = task_to_complete["id"]
            
            # Get user credits before completion
            user_response, _ = self.make_request("GET", "/auth/me", token=self.tokens["user"])
            credits_before = user_response.get("credits", 0) if user_response else 0
            
            # Complete the task
            update_data = {"status": "completed"}
            response, error = self.make_request("PATCH", f"/tasks/{task_id}", update_data, token=self.tokens["user"])
            
            if error:
                self.log_result("Complete task", False, error)
            else:
                # Check credits after completion
                user_response, _ = self.make_request("GET", "/auth/me", token=self.tokens["user"])
                credits_after = user_response.get("credits", 0) if user_response else 0
                
                if credits_after == credits_before + 10:
                    self.log_result("Complete task & credit award", True, f"Credits: {credits_before} → {credits_after}")
                else:
                    self.log_result("Complete task & credit award", False, f"Expected +10 credits, got {credits_after - credits_before}")
                    
        # Test expired task checking
        response, error = self.make_request("POST", "/tasks/check-expired")
        
        if error:
            self.log_result("Check expired tasks", False, error)
        else:
            self.log_result("Check expired tasks", True, response.get("message", "Checked for expired tasks"))
            
        # Test completing an expired task (create a task with 1 second timer)
        expired_task_config = {
            "title": "Expired Task Test",
            "description": "Will expire in 1 second",
            "timer_seconds": 1,
            "user_id": user_id
        }
        
        response, error = self.make_request("POST", "/tasks", expired_task_config, token=admin_token)
        
        if not error and response.get("id"):
            expired_task_id = response["id"]
            
            # Wait for task to expire
            time.sleep(2)
            
            # Try to complete expired task
            update_data = {"status": "completed"}
            response, error = self.make_request("PATCH", f"/tasks/{expired_task_id}", update_data, 
                                              token=self.tokens["user"], expect_success=False)
            
            if error and "expired" in error.lower():
                self.log_result("Reject expired task completion", True, "Correctly rejected expired task")
            else:
                self.log_result("Reject expired task completion", False, "Should reject expired task completion")
                
        # Test modifying completed task
        if self.tasks:
            # Find a completed task or complete one
            completed_task_id = None
            for task in self.tasks:
                if task.get("status") == "completed":
                    completed_task_id = task["id"]
                    break
                    
            if completed_task_id:
                update_data = {"status": "pending"}
                response, error = self.make_request("PATCH", f"/tasks/{completed_task_id}", update_data,
                                                  token=self.tokens["user"], expect_success=False)
                
                if error and ("completed" in error.lower() or "failed" in error.lower()):
                    self.log_result("Reject completed task modification", True, "Correctly rejected modification")
                else:
                    self.log_result("Reject completed task modification", False, "Should reject completed task modification")
                    
    def test_reward_system(self):
        """Test reward system APIs"""
        print("=== TESTING REWARD SYSTEM APIs ===")
        
        if "admin" not in self.tokens:
            self.log_result("Reward System Setup", False, "Missing admin token")
            return
            
        admin_token = self.tokens["admin"]
        
        # Test reward creation with and without images
        reward_configs = [
            {
                "name": "Coffee Voucher",
                "cost": 50,
                "image_base64": SAMPLE_IMAGE_BASE64
            },
            {
                "name": "Movie Ticket",
                "cost": 100
            }
        ]
        
        for i, reward_config in enumerate(reward_configs):
            response, error = self.make_request("POST", "/rewards", reward_config, token=admin_token)
            
            if error:
                self.log_result(f"Create reward {i+1}", False, error)
                continue
                
            if not response.get("id") or not response.get("available"):
                self.log_result(f"Create reward {i+1}", False, "Invalid reward response")
                continue
                
            self.rewards.append(response)
            has_image = "with image" if reward_config.get("image_base64") else "without image"
            self.log_result(f"Create reward {i+1}", True, f"Created: {reward_config['name']} ({has_image})")
            
        # Test listing available rewards
        response, error = self.make_request("GET", "/rewards", token=self.tokens.get("user", admin_token))
        
        if error:
            self.log_result("List rewards", False, error)
        elif not isinstance(response, list):
            self.log_result("List rewards", False, "Expected list of rewards")
        else:
            self.log_result("List rewards", True, f"Retrieved {len(response)} rewards")
            
        # Test redemption with insufficient credits
        if self.rewards and "user" in self.tokens:
            expensive_reward = max(self.rewards, key=lambda r: r["cost"])
            reward_id = expensive_reward["id"]
            
            response, error = self.make_request("POST", f"/rewards/{reward_id}/redeem", 
                                              token=self.tokens["user"], expect_success=False)
            
            if error and "not enough credits" in error.lower():
                self.log_result("Reject insufficient credits", True, "Correctly rejected insufficient credits")
            else:
                self.log_result("Reject insufficient credits", False, "Should reject insufficient credits")
                
        # Test successful redemption (give user enough credits first)
        if self.rewards and "user" in self.tokens:
            # Find cheapest reward
            cheap_reward = min(self.rewards, key=lambda r: r["cost"])
            reward_cost = cheap_reward["cost"]
            
            # Award enough credits to user (simulate completing tasks)
            user_id = self.users["user"]["id"]
            
            # Get current credits
            user_response, _ = self.make_request("GET", "/auth/me", token=self.tokens["user"])
            current_credits = user_response.get("credits", 0) if user_response else 0
            
            if current_credits >= reward_cost:
                # Try redemption
                response, error = self.make_request("POST", f"/rewards/{cheap_reward['id']}/redeem", 
                                                  token=self.tokens["user"])
                
                if error:
                    self.log_result("Redeem reward", False, error)
                else:
                    # Check credits were deducted
                    user_response, _ = self.make_request("GET", "/auth/me", token=self.tokens["user"])
                    new_credits = user_response.get("credits", 0) if user_response else 0
                    
                    if new_credits == current_credits - reward_cost:
                        self.log_result("Redeem reward & deduct credits", True, 
                                      f"Credits: {current_credits} → {new_credits}")
                    else:
                        self.log_result("Redeem reward & deduct credits", False, 
                                      f"Expected -{reward_cost} credits, got {new_credits - current_credits}")
            else:
                self.log_result("Redeem reward", False, f"User has {current_credits} credits, need {reward_cost}")
                
        # Test redemption history
        response, error = self.make_request("GET", "/redemptions", token=self.tokens.get("user", admin_token))
        
        if error:
            self.log_result("Get redemption history", False, error)
        elif not isinstance(response, list):
            self.log_result("Get redemption history", False, "Expected list of redemptions")
        else:
            self.log_result("Get redemption history", True, f"Retrieved {len(response)} redemptions")
            
    def test_doubt_system(self):
        """Test doubt system APIs"""
        print("=== TESTING DOUBT SYSTEM APIs ===")
        
        if "user" not in self.tokens or "admin" not in self.tokens:
            self.log_result("Doubt System Setup", False, "Missing user or admin token")
            return
            
        user_token = self.tokens["user"]
        admin_token = self.tokens["admin"]
        
        # Test doubt creation with base64 image
        doubt_data = {
            "image_base64": SAMPLE_IMAGE_BASE64,
            "description": "I need help understanding this concept. Can you explain it better?"
        }
        
        response, error = self.make_request("POST", "/doubts", doubt_data, token=user_token)
        
        if error:
            self.log_result("Create doubt", False, error)
            return
            
        if not response.get("id") or response.get("status") != "pending":
            self.log_result("Create doubt", False, "Invalid doubt response")
            return
            
        doubt_id = response["id"]
        self.doubts.append(response)
        self.log_result("Create doubt", True, f"Created doubt with ID: {doubt_id}")
        
        # Test listing doubts as user
        response, error = self.make_request("GET", "/doubts", token=user_token)
        
        if error:
            self.log_result("List doubts (user)", False, error)
        elif not isinstance(response, list):
            self.log_result("List doubts (user)", False, "Expected list of doubts")
        else:
            user_doubts = [d for d in response if d.get("user_id") == self.users["user"]["id"]]
            self.log_result("List doubts (user)", True, f"User sees {len(user_doubts)} of their doubts")
            
        # Test listing doubts as admin
        response, error = self.make_request("GET", "/doubts", token=admin_token)
        
        if error:
            self.log_result("List doubts (admin)", False, error)
        elif not isinstance(response, list):
            self.log_result("List doubts (admin)", False, "Expected list of doubts")
        else:
            self.log_result("List doubts (admin)", True, f"Admin sees {len(response)} total doubts")
            
        # Test admin response to doubt
        admin_response_data = {
            "admin_response": "This is a great question! Here's the explanation you requested..."
        }
        
        response, error = self.make_request("PATCH", f"/doubts/{doubt_id}", admin_response_data, token=admin_token)
        
        if error:
            self.log_result("Admin respond to doubt", False, error)
        elif response.get("status") != "answered":
            self.log_result("Admin respond to doubt", False, "Status should be 'answered'")
        else:
            self.log_result("Admin respond to doubt", True, "Status changed to 'answered'")
            
    def test_admin_apis(self):
        """Test admin-specific APIs"""
        print("=== TESTING ADMIN APIs ===")
        
        if "admin" not in self.tokens or "user" not in self.tokens:
            self.log_result("Admin API Setup", False, "Missing admin or user token")
            return
            
        admin_token = self.tokens["admin"]
        user_token = self.tokens["user"]
        
        # Test admin listing all users
        response, error = self.make_request("GET", "/users", token=admin_token)
        
        if error:
            self.log_result("Admin list users", False, error)
        elif not isinstance(response, list):
            self.log_result("Admin list users", False, "Expected list of users")
        else:
            self.log_result("Admin list users", True, f"Admin retrieved {len(response)} users")
            
        # Test non-admin access to admin endpoint
        response, error = self.make_request("GET", "/users", token=user_token, expect_success=False)
        
        if error and "403" in error:
            self.log_result("Reject non-admin access", True, "Correctly rejected non-admin user")
        else:
            self.log_result("Reject non-admin access", False, "Should reject non-admin access")
            
    def run_all_tests(self):
        """Run all test suites"""
        print("🚀 Starting Backend API Testing...")
        print(f"Backend URL: {BACKEND_URL}")
        print("=" * 60)
        
        try:
            self.test_authentication()
            self.test_task_management()
            self.test_reward_system()
            self.test_doubt_system()
            self.test_admin_apis()
            
        except Exception as e:
            self.log_result("Test Execution", False, f"Unexpected error: {str(e)}")
            
        # Print summary
        print("=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        passed = sum(1 for r in self.test_results if "✅" in r["status"])
        failed = sum(1 for r in self.test_results if "❌" in r["status"])
        total = len(self.test_results)
        
        print(f"Total Tests: {total}")
        print(f"Passed: {passed}")
        print(f"Failed: {failed}")
        print(f"Success Rate: {(passed/total*100):.1f}%" if total > 0 else "0%")
        
        if failed > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if "❌" in result["status"]:
                    print(f"  - {result['test']}: {result['message']}")
                    
        return failed == 0

if __name__ == "__main__":
    tester = APITester()
    success = tester.run_all_tests()
    sys.exit(0 if success else 1)