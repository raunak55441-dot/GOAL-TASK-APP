from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import jwt, JWTError
from bson import ObjectId

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.environ.get('SECRET_KEY', 'your-secret-key-change-in-production-2024')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "user"  # "user" or "admin"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    credits: int
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class TaskCreate(BaseModel):
    user_id: str
    title: str
    description: Optional[str] = None
    timer_seconds: Optional[int] = None
    due_date: Optional[datetime] = None

class TaskUpdate(BaseModel):
    status: str  # "pending", "completed", "failed"

class TaskResponse(BaseModel):
    id: str
    user_id: str
    title: str
    description: Optional[str]
    timer_seconds: Optional[int]
    due_date: Optional[datetime]
    status: str
    created_by: str
    created_at: datetime
    completed_at: Optional[datetime]
    start_time: Optional[datetime]

class RewardCreate(BaseModel):
    name: str
    cost: int
    image_base64: Optional[str] = None

class RewardResponse(BaseModel):
    id: str
    name: str
    cost: int
    image_base64: Optional[str]
    available: bool
    created_at: datetime

class RedemptionResponse(BaseModel):
    id: str
    user_id: str
    reward_id: str
    reward_name: str
    cost: int
    redeemed_at: datetime

class DoubtCreate(BaseModel):
    image_base64: str
    description: str

class DoubtResponse(BaseModel):
    id: str
    user_id: str
    user_name: str
    image_base64: str
    description: str
    admin_response: Optional[str]
    status: str  # "pending", "answered"
    created_at: datetime

class DoubtResponseUpdate(BaseModel):
    admin_response: str

# ==================== HELPER FUNCTIONS ====================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"_id": ObjectId(user_id)})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

async def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_dict = {
        "email": user.email,
        "password_hash": hash_password(user.password),
        "name": user.name,
        "role": user.role,
        "credits": 0,
        "created_at": datetime.utcnow()
    }
    
    result = await db.users.insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    
    # Create token
    access_token = create_access_token(data={"sub": str(result.inserted_id)})
    
    user_response = UserResponse(
        id=str(user_dict["_id"]),
        email=user_dict["email"],
        name=user_dict["name"],
        role=user_dict["role"],
        credits=user_dict["credits"],
        created_at=user_dict["created_at"]
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(user: UserLogin):
    # Find user
    db_user = await db.users.find_one({"email": user.email})
    if not db_user or not verify_password(user.password, db_user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    access_token = create_access_token(data={"sub": str(db_user["_id"])})
    
    user_response = UserResponse(
        id=str(db_user["_id"]),
        email=db_user["email"],
        name=db_user["name"],
        role=db_user["role"],
        credits=db_user["credits"],
        created_at=db_user["created_at"]
    )
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user_response
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        credits=current_user["credits"],
        created_at=current_user["created_at"]
    )

# ==================== TASK ROUTES ====================

@api_router.post("/tasks", response_model=TaskResponse)
async def create_task(task: TaskCreate, current_user: dict = Depends(get_admin_user)):
    task_dict = {
        "user_id": task.user_id,
        "title": task.title,
        "description": task.description,
        "timer_seconds": task.timer_seconds,
        "due_date": task.due_date,
        "status": "pending",
        "created_by": str(current_user["_id"]),
        "created_at": datetime.utcnow(),
        "completed_at": None,
        "start_time": datetime.utcnow() if task.timer_seconds else None
    }
    
    result = await db.tasks.insert_one(task_dict)
    task_dict["_id"] = result.inserted_id
    
    return TaskResponse(
        id=str(task_dict["_id"]),
        user_id=task_dict["user_id"],
        title=task_dict["title"],
        description=task_dict["description"],
        timer_seconds=task_dict["timer_seconds"],
        due_date=task_dict["due_date"],
        status=task_dict["status"],
        created_by=task_dict["created_by"],
        created_at=task_dict["created_at"],
        completed_at=task_dict["completed_at"],
        start_time=task_dict["start_time"]
    )

@api_router.get("/tasks", response_model=List[TaskResponse])
async def get_tasks(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        tasks = await db.tasks.find().sort("created_at", -1).to_list(1000)
    else:
        tasks = await db.tasks.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).to_list(1000)
    
    return [TaskResponse(
        id=str(task["_id"]),
        user_id=task["user_id"],
        title=task["title"],
        description=task.get("description"),
        timer_seconds=task.get("timer_seconds"),
        due_date=task.get("due_date"),
        status=task["status"],
        created_by=task["created_by"],
        created_at=task["created_at"],
        completed_at=task.get("completed_at"),
        start_time=task.get("start_time")
    ) for task in tasks]

@api_router.get("/tasks/user/{user_id}", response_model=List[TaskResponse])
async def get_user_tasks(user_id: str, current_user: dict = Depends(get_admin_user)):
    tasks = await db.tasks.find({"user_id": user_id}).sort("created_at", -1).to_list(1000)
    
    return [TaskResponse(
        id=str(task["_id"]),
        user_id=task["user_id"],
        title=task["title"],
        description=task.get("description"),
        timer_seconds=task.get("timer_seconds"),
        due_date=task.get("due_date"),
        status=task["status"],
        created_by=task["created_by"],
        created_at=task["created_at"],
        completed_at=task.get("completed_at"),
        start_time=task.get("start_time")
    ) for task in tasks]

@api_router.patch("/tasks/{task_id}", response_model=TaskResponse)
async def update_task(task_id: str, task_update: TaskUpdate, current_user: dict = Depends(get_current_user)):
    task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check permissions
    if current_user["role"] != "admin" and task["user_id"] != str(current_user["_id"]):
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Only allow certain status transitions
    if task["status"] in ["completed", "failed"]:
        raise HTTPException(status_code=400, detail="Cannot modify completed or failed tasks")
    
    update_data = {"status": task_update.status}
    
    # Check if task can be completed (timer hasn't expired)
    if task_update.status == "completed":
        if task.get("timer_seconds") and task.get("start_time"):
            elapsed = (datetime.utcnow() - task["start_time"]).total_seconds()
            if elapsed > task["timer_seconds"]:
                raise HTTPException(status_code=400, detail="Timer expired - task failed")
        
        if task.get("due_date") and datetime.utcnow() > task["due_date"]:
            raise HTTPException(status_code=400, detail="Due date passed - task failed")
        
        update_data["completed_at"] = datetime.utcnow()
        
        # Award credits
        await db.users.update_one(
            {"_id": ObjectId(task["user_id"])},
            {"$inc": {"credits": 10}}
        )
    
    await db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data}
    )
    
    updated_task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    
    return TaskResponse(
        id=str(updated_task["_id"]),
        user_id=updated_task["user_id"],
        title=updated_task["title"],
        description=updated_task.get("description"),
        timer_seconds=updated_task.get("timer_seconds"),
        due_date=updated_task.get("due_date"),
        status=updated_task["status"],
        created_by=updated_task["created_by"],
        created_at=updated_task["created_at"],
        completed_at=updated_task.get("completed_at"),
        start_time=updated_task.get("start_time")
    )

@api_router.post("/tasks/check-expired")
async def check_expired_tasks():
    """Check and mark expired tasks as failed"""
    now = datetime.utcnow()
    
    # Check timer-based tasks
    timer_tasks = await db.tasks.find({
        "status": "pending",
        "timer_seconds": {"$ne": None},
        "start_time": {"$ne": None}
    }).to_list(1000)
    
    # Collect expired task IDs
    expired_timer_ids = [
        task["_id"] for task in timer_tasks 
        if (now - task["start_time"]).total_seconds() > task["timer_seconds"]
    ]
    
    failed_count = 0
    
    # Bulk update timer-based expired tasks
    if expired_timer_ids:
        result = await db.tasks.update_many(
            {"_id": {"$in": expired_timer_ids}},
            {"$set": {"status": "failed"}}
        )
        failed_count += result.modified_count
    
    # Bulk update due date-based expired tasks
    due_result = await db.tasks.update_many(
        {
            "status": "pending",
            "due_date": {"$lte": now}
        },
        {"$set": {"status": "failed"}}
    )
    failed_count += due_result.modified_count
    
    return {"message": f"Marked {failed_count} tasks as failed"}

# ==================== REWARD ROUTES ====================

@api_router.post("/rewards", response_model=RewardResponse)
async def create_reward(reward: RewardCreate, current_user: dict = Depends(get_admin_user)):
    reward_dict = {
        "name": reward.name,
        "cost": reward.cost,
        "image_base64": reward.image_base64,
        "available": True,
        "created_at": datetime.utcnow()
    }
    
    result = await db.rewards.insert_one(reward_dict)
    reward_dict["_id"] = result.inserted_id
    
    return RewardResponse(
        id=str(reward_dict["_id"]),
        name=reward_dict["name"],
        cost=reward_dict["cost"],
        image_base64=reward_dict["image_base64"],
        available=reward_dict["available"],
        created_at=reward_dict["created_at"]
    )

@api_router.get("/rewards", response_model=List[RewardResponse])
async def get_rewards(current_user: dict = Depends(get_current_user)):
    rewards = await db.rewards.find({"available": True}).to_list(1000)
    
    return [RewardResponse(
        id=str(reward["_id"]),
        name=reward["name"],
        cost=reward["cost"],
        image_base64=reward.get("image_base64"),
        available=reward["available"],
        created_at=reward["created_at"]
    ) for reward in rewards]

@api_router.post("/rewards/{reward_id}/redeem")
async def redeem_reward(reward_id: str, current_user: dict = Depends(get_current_user)):
    reward = await db.rewards.find_one({"_id": ObjectId(reward_id)})
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")
    
    if not reward["available"]:
        raise HTTPException(status_code=400, detail="Reward not available")
    
    # Check if user has enough credits
    user = await db.users.find_one({"_id": ObjectId(current_user["_id"])})
    if user["credits"] < reward["cost"]:
        raise HTTPException(status_code=400, detail="Not enough credits")
    
    # Deduct credits
    await db.users.update_one(
        {"_id": ObjectId(current_user["_id"])},
        {"$inc": {"credits": -reward["cost"]}}
    )
    
    # Record redemption
    redemption = {
        "user_id": str(current_user["_id"]),
        "reward_id": reward_id,
        "reward_name": reward["name"],
        "cost": reward["cost"],
        "redeemed_at": datetime.utcnow()
    }
    
    await db.redemptions.insert_one(redemption)
    
    return {"message": "Reward redeemed successfully", "remaining_credits": user["credits"] - reward["cost"]}

@api_router.get("/redemptions", response_model=List[RedemptionResponse])
async def get_redemptions(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        redemptions = await db.redemptions.find().sort("redeemed_at", -1).to_list(1000)
    else:
        redemptions = await db.redemptions.find({"user_id": str(current_user["_id"])}).sort("redeemed_at", -1).to_list(1000)
    
    return [RedemptionResponse(
        id=str(redemption["_id"]),
        user_id=redemption["user_id"],
        reward_id=redemption["reward_id"],
        reward_name=redemption["reward_name"],
        cost=redemption["cost"],
        redeemed_at=redemption["redeemed_at"]
    ) for redemption in redemptions]

# ==================== DOUBT ROUTES ====================

@api_router.post("/doubts", response_model=DoubtResponse)
async def create_doubt(doubt: DoubtCreate, current_user: dict = Depends(get_current_user)):
    doubt_dict = {
        "user_id": str(current_user["_id"]),
        "user_name": current_user["name"],
        "image_base64": doubt.image_base64,
        "description": doubt.description,
        "admin_response": None,
        "status": "pending",
        "created_at": datetime.utcnow()
    }
    
    result = await db.doubts.insert_one(doubt_dict)
    doubt_dict["_id"] = result.inserted_id
    
    return DoubtResponse(
        id=str(doubt_dict["_id"]),
        user_id=doubt_dict["user_id"],
        user_name=doubt_dict["user_name"],
        image_base64=doubt_dict["image_base64"],
        description=doubt_dict["description"],
        admin_response=doubt_dict["admin_response"],
        status=doubt_dict["status"],
        created_at=doubt_dict["created_at"]
    )

@api_router.get("/doubts", response_model=List[DoubtResponse])
async def get_doubts(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        doubts = await db.doubts.find().sort("created_at", -1).to_list(1000)
    else:
        doubts = await db.doubts.find({"user_id": str(current_user["_id"])}).sort("created_at", -1).to_list(1000)
    
    return [DoubtResponse(
        id=str(doubt["_id"]),
        user_id=doubt["user_id"],
        user_name=doubt["user_name"],
        image_base64=doubt["image_base64"],
        description=doubt["description"],
        admin_response=doubt.get("admin_response"),
        status=doubt["status"],
        created_at=doubt["created_at"]
    ) for doubt in doubts]

@api_router.patch("/doubts/{doubt_id}", response_model=DoubtResponse)
async def respond_to_doubt(doubt_id: str, response: DoubtResponseUpdate, current_user: dict = Depends(get_admin_user)):
    doubt = await db.doubts.find_one({"_id": ObjectId(doubt_id)})
    if not doubt:
        raise HTTPException(status_code=404, detail="Doubt not found")
    
    await db.doubts.update_one(
        {"_id": ObjectId(doubt_id)},
        {"$set": {"admin_response": response.admin_response, "status": "answered"}}
    )
    
    updated_doubt = await db.doubts.find_one({"_id": ObjectId(doubt_id)})
    
    return DoubtResponse(
        id=str(updated_doubt["_id"]),
        user_id=updated_doubt["user_id"],
        user_name=updated_doubt["user_name"],
        image_base64=updated_doubt["image_base64"],
        description=updated_doubt["description"],
        admin_response=updated_doubt["admin_response"],
        status=updated_doubt["status"],
        created_at=updated_doubt["created_at"]
    )

# ==================== USERS ROUTES (ADMIN) ====================

@api_router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(get_admin_user)):
    users = await db.users.find({"role": "user"}).to_list(1000)
    
    return [UserResponse(
        id=str(user["_id"]),
        email=user["email"],
        name=user["name"],
        role=user["role"],
        credits=user["credits"],
        created_at=user["created_at"]
    ) for user in users]

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
if __name__ == "__main__":
    import uvicorn
    import os

    port = int(os.environ.get("PORT", 10000))
    uvicorn.run(app, host="0.0.0.0", port=port)
