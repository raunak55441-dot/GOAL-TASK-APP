import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Title, Chip, IconButton, Badge } from 'react-native-paper';
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

  const getPriorityColor = (task: any) => {
    if (task.timer_seconds && task.timer_seconds < 3600) return '#ef4444'; // High
    if (task.due_date) {
      const dueDate = new Date(task.due_date);
      const now = new Date();
      const diff = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      if (diff < 24) return '#ef4444'; // High
      if (diff < 72) return '#f59e0b'; // Medium
    }
    return '#10b981'; // Low
  };

  const getPriorityLabel = (task: any) => {
    const color = getPriorityColor(task);
    if (color === '#ef4444') return 'HIGH';
    if (color === '#f59e0b') return 'MEDIUM';
    return 'LOW';
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  const taskCounts = {
    all: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    failed: tasks.filter(t => t.status === 'failed').length,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Title style={styles.title}>My Tasks</Title>
          <Text style={styles.subtitle}>{taskCounts.all} tasks in total</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
            onPress={() => setFilter('all')}
          >
            <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
              All ({taskCounts.all})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
            onPress={() => setFilter('pending')}
          >
            <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
              Pending ({taskCounts.pending})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
            onPress={() => setFilter('completed')}
          >
            <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
              Completed ({taskCounts.completed})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterTab, filter === 'failed' && styles.filterTabActive]}
            onPress={() => setFilter('failed')}
          >
            <Text style={[styles.filterText, filter === 'failed' && styles.filterTextActive]}>
              Failed ({taskCounts.failed})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#667eea" />}
        style={styles.scrollView}
      >
        {filteredTasks.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No tasks yet</Text>
            <Text style={styles.emptySubtext}>Tasks will appear here when assigned</Text>
          </View>
        ) : (
          filteredTasks.map((task) => {
            const timeRemaining = getTimeRemaining(task);
            const priorityColor = getPriorityColor(task);
            const priorityLabel = getPriorityLabel(task);

            return (
              <Card 
                key={task.id} 
                style={[
                  styles.taskCard,
                  task.status === 'completed' && styles.taskCompleted,
                  task.status === 'failed' && styles.taskFailed,
                ]}
              >
                <Card.Content style={styles.taskContent}>
                  {/* Task Header */}
                  <View style={styles.taskHeader}>
                    <View style={styles.taskLeft}>
                      {task.status === 'pending' && (
                        <TouchableOpacity
                          style={styles.checkbox}
                          onPress={() => completeTask(task.id)}
                        >
                          <MaterialCommunityIcons name="check" size={20} color="#fff" />
                        </TouchableOpacity>
                      )}
                      {task.status === 'completed' && (
                        <View style={[styles.checkbox, styles.checkboxCompleted]}>
                          <MaterialCommunityIcons name="check" size={20} color="#fff" />
                        </View>
                      )}
                      {task.status === 'failed' && (
                        <View style={[styles.checkbox, styles.checkboxFailed]}>
                          <MaterialCommunityIcons name="close" size={20} color="#fff" />
                        </View>
                      )}
                      <View style={styles.taskTitleContainer}>
                        <Text style={[
                          styles.taskTitle,
                          task.status === 'completed' && styles.taskTitleCompleted,
                          task.status === 'failed' && styles.taskTitleFailed,
                        ]}>
                          {task.title}
                        </Text>
                        {task.status === 'pending' && (
                          <View style={[styles.priorityBadge, { backgroundColor: priorityColor }]}>
                            <Text style={styles.priorityText}>{priorityLabel}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Task Description */}
                  {task.description && (
                    <Text style={styles.taskDescription}>{task.description}</Text>
                  )}

                  {/* Task Meta */}
                  <View style={styles.taskMeta}>
                    {task.timer_seconds && task.status === 'pending' && (
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="timer-outline" size={16} color="#6b7280" />
                        <Text style={[
                          styles.metaText,
                          timeRemaining === 'Expired' && styles.expiredText
                        ]}>
                          {timeRemaining || 'Calculating...'}
                        </Text>
                      </View>
                    )}
                    {task.due_date && (
                      <View style={styles.metaItem}>
                        <MaterialCommunityIcons name="calendar-outline" size={16} color="#6b7280" />
                        <Text style={styles.metaText}>
                          {format(new Date(task.due_date), 'MMM dd, HH:mm')}
                        </Text>
                      </View>
                    )}
                    {task.status === 'pending' && (
                      <View style={styles.creditBadge}>
                        <MaterialCommunityIcons name="star" size={14} color="#fbbf24" />
                        <Text style={styles.creditText}>+10</Text>
                      </View>
                    )}
                  </View>

                  {/* Completion Date */}
                  {task.completed_at && (
                    <View style={styles.completionInfo}>
                      <MaterialCommunityIcons name="check-circle" size={14} color="#10b981" />
                      <Text style={styles.completionText}>
                        Completed on {format(new Date(task.completed_at), 'MMM dd, HH:mm')}
                      </Text>
                    </View>
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
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterTabActive: {
    backgroundColor: '#667eea',
    borderColor: '#667eea',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  filterTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 8,
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  taskCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    opacity: 0.9,
  },
  taskFailed: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    opacity: 0.6,
  },
  taskContent: {
    paddingVertical: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  taskLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxCompleted: {
    backgroundColor: '#10b981',
  },
  checkboxFailed: {
    backgroundColor: '#ef4444',
  },
  taskTitleContainer: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 6,
    lineHeight: 22,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#6b7280',
  },
  taskTitleFailed: {
    textDecorationLine: 'line-through',
    color: '#9ca3af',
  },
  priorityBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  taskDescription: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
    marginLeft: 40,
  },
  taskMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginLeft: 40,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: '#6b7280',
  },
  expiredText: {
    color: '#ef4444',
    fontWeight: '600',
  },
  creditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  creditText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    marginLeft: 40,
  },
  completionText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '500',
  },
});
