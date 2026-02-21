import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Animated } from 'react-native';
import { Text, Card, Title, Button, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

const motivationalQuotes = [
  "Success is the sum of small efforts repeated day in and day out.",
  "The only way to do great work is to love what you do.",
  "Believe you can and you're halfway there.",
  "Don't watch the clock; do what it does. Keep going.",
  "The future depends on what you do today.",
];

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [stats, setStats] = useState({ completed: 0, pending: 0, failed: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Check for expired tasks periodically
    const interval = setInterval(() => {
      checkExpiredTasks();
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      await refreshUser();
      const response = await axios.get(`${API_URL}/api/tasks`);
      setTasks(response.data);
      
      const completed = response.data.filter((t: any) => t.status === 'completed').length;
      const pending = response.data.filter((t: any) => t.status === 'pending').length;
      const failed = response.data.filter((t: any) => t.status === 'failed').length;
      
      setStats({ completed, pending, failed });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const checkExpiredTasks = async () => {
    try {
      await axios.post(`${API_URL}/api/tasks/check-expired`);
      loadData();
    } catch (error) {
      console.error('Error checking expired tasks:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalTasks = stats.completed + stats.pending + stats.failed;
  const completionRate = totalTasks > 0 ? stats.completed / totalTasks : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Welcome Section */}
          <View style={styles.header}>
            <Title style={styles.welcomeText}>Welcome back, {user?.name}!</Title>
            <View style={styles.roleChip}>
              <MaterialCommunityIcons 
                name={user?.role === 'admin' ? 'shield-account' : 'account'} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
            </View>
          </View>

          {/* Credits Display */}
          <Card style={styles.creditsCard}>
            <Card.Content style={styles.creditsContent}>
              <MaterialCommunityIcons name="star" size={48} color="#FFD700" />
              <View>
                <Text style={styles.creditsLabel}>Your Credits</Text>
                <Title style={styles.creditsValue}>{user?.credits || 0}</Title>
              </View>
            </Card.Content>
          </Card>

          {/* Motivational Quote */}
          <Card style={styles.quoteCard}>
            <Card.Content>
              <MaterialCommunityIcons name="format-quote-open" size={24} color="#4CAF50" />
              <Text style={styles.quoteText}>{quote}</Text>
            </Card.Content>
          </Card>

          {/* Progress Section */}
          <Card style={styles.statsCard}>
            <Card.Content>
              <Title style={styles.statsTitle}>Today's Progress</Title>
              <ProgressBar 
                progress={completionRate} 
                color="#4CAF50" 
                style={styles.progressBar}
              />
              <Text style={styles.progressText}>
                {Math.round(completionRate * 100)}% Completed
              </Text>

              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="checkbox-marked-circle" size={32} color="#4CAF50" />
                  <Text style={styles.statValue}>{stats.completed}</Text>
                  <Text style={styles.statLabel}>Completed</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="clock-outline" size={32} color="#2196F3" />
                  <Text style={styles.statValue}>{stats.pending}</Text>
                  <Text style={styles.statLabel}>Pending</Text>
                </View>
                <View style={styles.statItem}>
                  <MaterialCommunityIcons name="close-circle" size={32} color="#f44336" />
                  <Text style={styles.statValue}>{stats.failed}</Text>
                  <Text style={styles.statLabel}>Failed</Text>
                </View>
              </View>
            </Card.Content>
          </Card>

          {/* Recent Tasks */}
          {tasks.length > 0 && (
            <View style={styles.section}>
              <Title style={styles.sectionTitle}>Recent Tasks</Title>
              {tasks.slice(0, 3).map((task) => (
                <Card 
                  key={task.id} 
                  style={[
                    styles.taskCard,
                    task.status === 'completed' && styles.taskCompleted,
                    task.status === 'failed' && styles.taskFailed,
                  ]}
                >
                  <Card.Content>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <MaterialCommunityIcons
                        name={
                          task.status === 'completed' 
                            ? 'check-circle' 
                            : task.status === 'failed' 
                            ? 'close-circle' 
                            : 'clock-outline'
                        }
                        size={24}
                        color={
                          task.status === 'completed' 
                            ? '#4CAF50' 
                            : task.status === 'failed' 
                            ? '#f44336' 
                            : '#2196F3'
                        }
                      />
                    </View>
                    {task.description && (
                      <Text style={styles.taskDescription}>{task.description}</Text>
                    )}
                  </Card.Content>
                </Card>
              ))}
            </View>
          )}
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 24,
    flex: 1,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  creditsCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
  },
  creditsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  creditsLabel: {
    color: '#888',
    fontSize: 14,
  },
  creditsValue: {
    color: '#FFD700',
    fontSize: 32,
    fontWeight: 'bold',
  },
  quoteCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
  },
  quoteText: {
    color: '#ccc',
    fontSize: 16,
    fontStyle: 'italic',
    marginTop: 8,
    lineHeight: 24,
  },
  statsCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
  },
  statsTitle: {
    color: '#fff',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressText: {
    color: '#888',
    textAlign: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    color: '#888',
    fontSize: 12,
    marginTop: 4,
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#fff',
    marginBottom: 12,
  },
  taskCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
  },
  taskCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  taskFailed: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taskTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  taskDescription: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
});
