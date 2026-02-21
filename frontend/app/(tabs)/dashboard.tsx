import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Animated } from 'react-native';
import { Text, Card, Title, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';
import { LinearGradient } from 'expo-linear-gradient';

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
  const [stats, setStats] = useState({ completed: 0, pending: 0, failed: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [quote] = useState(motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)]);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    loadData();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    const interval = setInterval(() => {
      checkExpiredTasks();
    }, 30000);

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
      const total = response.data.length;
      
      setStats({ completed, pending, failed, total });
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

  const completionRate = stats.total > 0 ? stats.completed / stats.total : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
      >
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back,</Text>
              <Title style={styles.userName}>{user?.name}!</Title>
            </View>
            <View style={styles.roleChip}>
              <MaterialCommunityIcons 
                name={user?.role === 'admin' ? 'shield-star' : 'account-circle'} 
                size={18} 
                color="#fff" 
              />
              <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
            </View>
          </View>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <Card style={[styles.statCard, styles.totalCard]}>
              <Card.Content style={styles.statContent}>
                <View style={styles.statIcon}>
                  <MaterialCommunityIcons name="format-list-checks" size={28} color="#667eea" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Total Tasks</Text>
                  <Title style={[styles.statValue, { color: '#667eea' }]}>{stats.total}</Title>
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, styles.pendingCard]}>
              <Card.Content style={styles.statContent}>
                <View style={styles.statIcon}>
                  <MaterialCommunityIcons name="clock-outline" size={28} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Pending</Text>
                  <Title style={[styles.statValue, { color: '#f59e0b' }]}>{stats.pending}</Title>
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, styles.completedCard]}>
              <Card.Content style={styles.statContent}>
                <View style={styles.statIcon}>
                  <MaterialCommunityIcons name="check-circle" size={28} color="#10b981" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Completed</Text>
                  <Title style={[styles.statValue, { color: '#10b981' }]}>{stats.completed}</Title>
                </View>
              </Card.Content>
            </Card>

            <Card style={[styles.statCard, styles.failedCard]}>
              <Card.Content style={styles.statContent}>
                <View style={styles.statIcon}>
                  <MaterialCommunityIcons name="close-circle" size={28} color="#ef4444" />
                </View>
                <View>
                  <Text style={styles.statLabel}>Failed</Text>
                  <Title style={[styles.statValue, { color: '#ef4444' }]}>{stats.failed}</Title>
                </View>
              </Card.Content>
            </Card>
          </View>

          {/* Credits Card */}
          <Card style={styles.creditsCard}>
            <Card.Content>
              <View style={styles.creditsHeader}>
                <View style={styles.creditsLeft}>
                  <View style={styles.creditsIconContainer}>
                    <MaterialCommunityIcons name="star" size={32} color="#fbbf24" />
                  </View>
                  <View>
                    <Text style={styles.creditsLabel}>Your Credits</Text>
                    <Title style={styles.creditsValue}>{user?.credits || 0}</Title>
                  </View>
                </View>
                <MaterialCommunityIcons name="arrow-right" size={24} color="#666" />
              </View>
            </Card.Content>
          </Card>

          {/* Progress Section */}
          <Card style={styles.progressCard}>
            <Card.Content>
              <View style={styles.progressHeader}>
                <Text style={styles.progressTitle}>Overall Progress</Text>
                <Text style={styles.progressPercentage}>{Math.round(completionRate * 100)}%</Text>
              </View>
              <ProgressBar 
                progress={completionRate} 
                color="#10b981" 
                style={styles.progressBar}
              />
              <Text style={styles.progressSubtitle}>
                {stats.completed} of {stats.total} tasks completed
              </Text>
            </Card.Content>
          </Card>

          {/* Motivational Quote */}
          <Card style={styles.quoteCard}>
            <Card.Content>
              <View style={styles.quoteIcon}>
                <MaterialCommunityIcons name="format-quote-open" size={24} color="#667eea" />
              </View>
              <Text style={styles.quoteText}>{quote}</Text>
            </Card.Content>
          </Card>

          {/* Recent Tasks */}
          {tasks.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Title style={styles.sectionTitle}>Recent Tasks</Title>
                <Text style={styles.sectionLink}>View All</Text>
              </View>
              {tasks.slice(0, 3).map((task) => (
                <Card 
                  key={task.id} 
                  style={[
                    styles.taskCard,
                    task.status === 'completed' && styles.taskCompleted,
                    task.status === 'failed' && styles.taskFailed,
                  ]}
                >
                  <Card.Content style={styles.taskContent}>
                    <View style={styles.taskHeader}>
                      <Text style={styles.taskTitle}>{task.title}</Text>
                      <View style={[
                        styles.taskStatusBadge,
                        task.status === 'completed' && styles.statusCompleted,
                        task.status === 'failed' && styles.statusFailed,
                        task.status === 'pending' && styles.statusPending,
                      ]}>
                        <MaterialCommunityIcons
                          name={
                            task.status === 'completed' 
                              ? 'check' 
                              : task.status === 'failed' 
                              ? 'close' 
                              : 'clock-outline'
                          }
                          size={14}
                          color="#fff"
                        />
                      </View>
                    </View>
                    {task.description && (
                      <Text style={styles.taskDescription} numberOfLines={2}>{task.description}</Text>
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
    backgroundColor: '#f8f9fa',
  },
  content: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 4,
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#667eea',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  roleText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  totalCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#667eea',
  },
  pendingCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  completedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  failedCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  creditsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  creditsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  creditsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  creditsIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#fef3c7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creditsLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  creditsValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  progressCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  progressPercentage: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#10b981',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e5e7eb',
    marginBottom: 8,
  },
  progressSubtitle: {
    fontSize: 13,
    color: '#6b7280',
  },
  quoteCard: {
    backgroundColor: '#ede9fe',
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 0,
  },
  quoteIcon: {
    marginBottom: 8,
  },
  quoteText: {
    fontSize: 15,
    lineHeight: 24,
    color: '#5b21b6',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  sectionLink: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
  },
  taskCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  taskCompleted: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  taskFailed: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    opacity: 0.6,
  },
  taskContent: {
    paddingVertical: 8,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  taskTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 12,
  },
  taskStatusBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusCompleted: {
    backgroundColor: '#10b981',
  },
  statusFailed: {
    backgroundColor: '#ef4444',
  },
  statusPending: {
    backgroundColor: '#f59e0b',
  },
  taskDescription: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 18,
  },
});