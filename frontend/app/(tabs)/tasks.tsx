import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Button, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Tasks() {
  const { user, refreshUser } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTasks();
    // Check for expired tasks every minute
    const interval = setInterval(() => {
      checkExpiredTasks();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const checkExpiredTasks = async () => {
    try {
      await axios.post(`${API_URL}/api/tasks/check-expired`);
      loadTasks();
    } catch (error) {
      console.error('Error checking expired tasks:', error);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await axios.patch(`${API_URL}/api/tasks/${taskId}`, { status: 'completed' });
      await refreshUser();
      await loadTasks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to complete task');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await checkExpiredTasks();
    await loadTasks();
    setRefreshing(false);
  };

  const getTimeRemaining = (task: any) => {
    if (!task.timer_seconds || !task.start_time) return null;
    
    const startTime = new Date(task.start_time);
    const now = new Date();
    const elapsed = (now.getTime() - startTime.getTime()) / 1000;
    const remaining = task.timer_seconds - elapsed;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    const seconds = Math.floor(remaining % 60);
    
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>My Tasks</Title>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <Chip
            selected={filter === 'all'}
            onPress={() => setFilter('all')}
            style={styles.filterChip}
            textStyle={{ color: filter === 'all' ? '#fff' : '#888' }}
          >
            All
          </Chip>
          <Chip
            selected={filter === 'pending'}
            onPress={() => setFilter('pending')}
            style={styles.filterChip}
            textStyle={{ color: filter === 'pending' ? '#fff' : '#888' }}
          >
            Pending
          </Chip>
          <Chip
            selected={filter === 'completed'}
            onPress={() => setFilter('completed')}
            style={styles.filterChip}
            textStyle={{ color: filter === 'completed' ? '#fff' : '#888' }}
          >
            Completed
          </Chip>
          <Chip
            selected={filter === 'failed'}
            onPress={() => setFilter('failed')}
            style={styles.filterChip}
            textStyle={{ color: filter === 'failed' ? '#fff' : '#888' }}
          >
            Failed
          </Chip>
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
        style={styles.scrollView}
      >
        {filteredTasks.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={64} color="#888" />
              <Text style={styles.emptyText}>No tasks yet</Text>
            </Card.Content>
          </Card>
        ) : (
          filteredTasks.map((task) => {
            const timeRemaining = getTimeRemaining(task);
            return (
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
                    <View style={styles.taskTitleContainer}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      {task.status === 'pending' && (
                        <Chip 
                          icon="star" 
                          style={styles.creditChip}
                          textStyle={{ fontSize: 12, color: '#FFD700' }}
                        >
                          +10 credits
                        </Chip>
                      )}
                    </View>
                    {task.status === 'pending' && user?.role !== 'admin' && (
                      <IconButton
                        icon="check-circle"
                        iconColor="#4CAF50"
                        size={32}
                        onPress={() => completeTask(task.id)}
                      />
                    )}
                    {task.status === 'completed' && (
                      <MaterialCommunityIcons name="check-circle" size={32} color="#4CAF50" />
                    )}
                    {task.status === 'failed' && (
                      <MaterialCommunityIcons name="close-circle" size={32} color="#f44336" />
                    )}
                  </View>

                  {task.description && (
                    <Text style={styles.taskDescription}>{task.description}</Text>
                  )}

                  <View style={styles.taskInfo}>
                    {task.timer_seconds && task.status === 'pending' && (
                      <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="timer" size={16} color="#2196F3" />
                        <Text style={[
                          styles.infoText,
                          timeRemaining === 'Expired' && styles.expiredText
                        ]}>
                          {timeRemaining || 'Calculating...'}
                        </Text>
                      </View>
                    )}
                    {task.due_date && (
                      <View style={styles.infoItem}>
                        <MaterialCommunityIcons name="calendar" size={16} color="#888" />
                        <Text style={styles.infoText}>
                          {format(new Date(task.due_date), 'MMM dd, yyyy HH:mm')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {task.completed_at && (
                    <Text style={styles.completedText}>
                      Completed: {format(new Date(task.completed_at), 'MMM dd, yyyy HH:mm')}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  filterChip: {
    marginRight: 8,
    backgroundColor: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyCard: {
    backgroundColor: '#1a1a1a',
    marginTop: 40,
  },
  emptyContent: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#888',
    fontSize: 18,
    marginTop: 16,
  },
  taskCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 12,
  },
  taskCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    opacity: 0.8,
  },
  taskFailed: {
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
    opacity: 0.6,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  taskTitleContainer: {
    flex: 1,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  creditChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2a2a',
    marginTop: 4,
  },
  taskDescription: {
    color: '#ccc',
    fontSize: 14,
    marginTop: 8,
    lineHeight: 20,
  },
  taskInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoText: {
    color: '#888',
    fontSize: 13,
  },
  expiredText: {
    color: '#f44336',
    fontWeight: 'bold',
  },
  completedText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 8,
  },
});
