import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Text, Card, Title, Button, TextInput, SegmentedButtons, Portal, Modal, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Admin() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('tasks');
  const [users, setUsers] = useState<any[]>([]);
  const [doubts, setDoubts] = useState<any[]>([]);
  
  // Task form
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [hasTimer, setHasTimer] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState('');
  const [hasDueDate, setHasDueDate] = useState(false);
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  // Reward form
  const [rewardModalVisible, setRewardModalVisible] = useState(false);
  const [rewardName, setRewardName] = useState('');
  const [rewardCost, setRewardCost] = useState('');
  const [rewardImage, setRewardImage] = useState<string | null>(null);
  
  // Doubt response
  const [responseModalVisible, setResponseModalVisible] = useState(false);
  const [selectedDoubt, setSelectedDoubt] = useState<any>(null);
  const [doubtResponse, setDoubtResponse] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadAdminData();
    }
  }, []);

  const loadAdminData = async () => {
    try {
      const [usersRes, doubtsRes] = await Promise.all([
        axios.get(`${API_URL}/api/users`),
        axios.get(`${API_URL}/api/doubts`),
      ]);
      setUsers(usersRes.data);
      setDoubts(doubtsRes.data);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  const createTask = async () => {
    if (!selectedUser || !taskTitle) {
      alert('Please select a user and enter task title');
      return;
    }

    try {
      const taskData: any = {
        user_id: selectedUser,
        title: taskTitle,
        description: taskDescription || undefined,
      };

      if (hasTimer && timerMinutes) {
        taskData.timer_seconds = parseInt(timerMinutes) * 60;
      }

      if (hasDueDate) {
        taskData.due_date = dueDate.toISOString();
      }

      await axios.post(`${API_URL}/api/tasks`, taskData);
      alert('Task created successfully!');
      setTaskModalVisible(false);
      resetTaskForm();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create task');
    }
  };

  const resetTaskForm = () => {
    setSelectedUser('');
    setTaskTitle('');
    setTaskDescription('');
    setHasTimer(false);
    setTimerMinutes('');
    setHasDueDate(false);
    setDueDate(new Date());
  };

  const pickRewardImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setRewardImage(base64Image);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image');
    }
  };

  const createReward = async () => {
    if (!rewardName || !rewardCost) {
      alert('Please enter reward name and cost');
      return;
    }

    try {
      await axios.post(`${API_URL}/api/rewards`, {
        name: rewardName,
        cost: parseInt(rewardCost),
        image_base64: rewardImage,
      });
      alert('Reward created successfully!');
      setRewardModalVisible(false);
      resetRewardForm();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create reward');
    }
  };

  const resetRewardForm = () => {
    setRewardName('');
    setRewardCost('');
    setRewardImage(null);
  };

  const respondToDoubt = async () => {
    if (!doubtResponse.trim()) {
      alert('Please enter a response');
      return;
    }

    try {
      await axios.patch(`${API_URL}/api/doubts/${selectedDoubt.id}`, {
        admin_response: doubtResponse,
      });
      alert('Response submitted successfully!');
      setResponseModalVisible(false);
      setSelectedDoubt(null);
      setDoubtResponse('');
      loadAdminData();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to submit response');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.unauthorized}>
          <MaterialCommunityIcons name="shield-lock" size={64} color="#888" />
          <Text style={styles.unauthorizedText}>Admin access required</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Admin Panel</Title>
      </View>

      <SegmentedButtons
        value={activeTab}
        onValueChange={setActiveTab}
        buttons={[
          { value: 'tasks', label: 'Tasks' },
          { value: 'rewards', label: 'Rewards' },
          { value: 'doubts', label: 'Doubts' },
        ]}
        style={styles.tabs}
      />

      <ScrollView style={styles.scrollView}>
        {activeTab === 'tasks' && (
          <View>
            <Card style={styles.actionCard}>
              <Card.Content>
                <Title style={styles.cardTitle}>Assign New Task</Title>
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={() => setTaskModalVisible(true)}
                  buttonColor="#4CAF50"
                >
                  Create Task
                </Button>
              </Card.Content>
            </Card>

            <Title style={styles.sectionTitle}>Users ({users.length})</Title>
            {users.map((u) => (
              <Card key={u.id} style={styles.userCard}>
                <Card.Content>
                  <View style={styles.userContent}>
                    <MaterialCommunityIcons name="account" size={32} color="#4CAF50" />
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{u.name}</Text>
                      <Text style={styles.userEmail}>{u.email}</Text>
                    </View>
                    <View style={styles.userCredits}>
                      <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                      <Text style={styles.userCreditsText}>{u.credits}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}

        {activeTab === 'rewards' && (
          <View>
            <Card style={styles.actionCard}>
              <Card.Content>
                <Title style={styles.cardTitle}>Add New Reward</Title>
                <Button
                  mode="contained"
                  icon="plus"
                  onPress={() => setRewardModalVisible(true)}
                  buttonColor="#4CAF50"
                >
                  Create Reward
                </Button>
              </Card.Content>
            </Card>
          </View>
        )}

        {activeTab === 'doubts' && (
          <View>
            <Title style={styles.sectionTitle}>
              Pending Doubts ({doubts.filter(d => d.status === 'pending').length})
            </Title>
            {doubts.filter(d => d.status === 'pending').map((doubt) => (
              <Card key={doubt.id} style={styles.doubtCard}>
                <Card.Content>
                  <View style={styles.doubtHeader}>
                    <Text style={styles.doubtUser}>{doubt.user_name}</Text>
                    <Chip icon="clock" textStyle={{ fontSize: 10 }}>Pending</Chip>
                  </View>
                  {doubt.image_base64 && (
                    <Image
                      source={{ uri: doubt.image_base64 }}
                      style={styles.doubtImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.doubtDescription}>{doubt.description}</Text>
                  <Button
                    mode="contained"
                    icon="reply"
                    onPress={() => {
                      setSelectedDoubt(doubt);
                      setResponseModalVisible(true);
                    }}
                    buttonColor="#2196F3"
                    style={styles.respondButton}
                  >
                    Respond
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Task Modal */}
      <Portal>
        <Modal
          visible={taskModalVisible}
          onDismiss={() => {
            setTaskModalVisible(false);
            resetTaskForm();
          }}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView>
              <Title style={styles.modalTitle}>Create New Task</Title>

              <Text style={styles.inputLabel}>Assign to:</Text>
              <View style={styles.userSelector}>
                {users.map((u) => (
                  <Chip
                    key={u.id}
                    selected={selectedUser === u.id}
                    onPress={() => setSelectedUser(u.id)}
                    style={styles.userChip}
                  >
                    {u.name}
                  </Chip>
                ))}
              </View>

              <TextInput
                label="Task Title *"
                value={taskTitle}
                onChangeText={setTaskTitle}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              <TextInput
                label="Description"
                value={taskDescription}
                onChangeText={setTaskDescription}
                multiline
                numberOfLines={3}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Add Timer?</Text>
                <Button
                  mode={hasTimer ? 'contained' : 'outlined'}
                  onPress={() => setHasTimer(!hasTimer)}
                  compact
                  buttonColor={hasTimer ? '#4CAF50' : undefined}
                  textColor={hasTimer ? '#fff' : '#4CAF50'}
                >
                  {hasTimer ? 'Yes' : 'No'}
                </Button>
              </View>

              {hasTimer && (
                <TextInput
                  label="Timer (minutes)"
                  value={timerMinutes}
                  onChangeText={setTimerMinutes}
                  keyboardType="numeric"
                  mode="outlined"
                  style={styles.input}
                  theme={{ colors: { primary: '#4CAF50' } }}
                />
              )}

              <View style={styles.optionRow}>
                <Text style={styles.optionLabel}>Add Due Date?</Text>
                <Button
                  mode={hasDueDate ? 'contained' : 'outlined'}
                  onPress={() => setHasDueDate(!hasDueDate)}
                  compact
                  buttonColor={hasDueDate ? '#4CAF50' : undefined}
                  textColor={hasDueDate ? '#fff' : '#4CAF50'}
                >
                  {hasDueDate ? 'Yes' : 'No'}
                </Button>
              </View>

              {hasDueDate && (
                <Button
                  mode="outlined"
                  onPress={() => setShowDatePicker(true)}
                  icon="calendar"
                  style={styles.dateButton}
                  textColor="#4CAF50"
                >
                  {dueDate.toLocaleString()}
                </Button>
              )}

              {showDatePicker && (
                <DateTimePicker
                  value={dueDate}
                  mode="datetime"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) setDueDate(selectedDate);
                  }}
                />
              )}

              <View style={styles.modalActions}>
                <Button
                  mode="text"
                  onPress={() => {
                    setTaskModalVisible(false);
                    resetTaskForm();
                  }}
                  textColor="#888"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={createTask}
                  buttonColor="#4CAF50"
                >
                  Create
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      {/* Reward Modal */}
      <Portal>
        <Modal
          visible={rewardModalVisible}
          onDismiss={() => {
            setRewardModalVisible(false);
            resetRewardForm();
          }}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView>
              <Title style={styles.modalTitle}>Create New Reward</Title>

              <TextInput
                label="Reward Name *"
                value={rewardName}
                onChangeText={setRewardName}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              <TextInput
                label="Cost (credits) *"
                value={rewardCost}
                onChangeText={setRewardCost}
                keyboardType="numeric"
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              {rewardImage && (
                <Image
                  source={{ uri: rewardImage }}
                  style={styles.rewardPreview}
                  resizeMode="contain"
                />
              )}

              <Button
                mode="outlined"
                onPress={pickRewardImage}
                icon="image"
                style={styles.imageButton}
                textColor="#4CAF50"
              >
                {rewardImage ? 'Change Image' : 'Add Image'}
              </Button>

              <View style={styles.modalActions}>
                <Button
                  mode="text"
                  onPress={() => {
                    setRewardModalVisible(false);
                    resetRewardForm();
                  }}
                  textColor="#888"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={createReward}
                  buttonColor="#4CAF50"
                >
                  Create
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>

      {/* Doubt Response Modal */}
      <Portal>
        <Modal
          visible={responseModalVisible}
          onDismiss={() => {
            setResponseModalVisible(false);
            setSelectedDoubt(null);
            setDoubtResponse('');
          }}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <ScrollView>
              <Title style={styles.modalTitle}>Respond to Doubt</Title>

              {selectedDoubt && (
                <>
                  {selectedDoubt.image_base64 && (
                    <Image
                      source={{ uri: selectedDoubt.image_base64 }}
                      style={styles.doubtImage}
                      resizeMode="contain"
                    />
                  )}
                  <Text style={styles.doubtDescription}>{selectedDoubt.description}</Text>
                </>
              )}

              <TextInput
                label="Your Response"
                value={doubtResponse}
                onChangeText={setDoubtResponse}
                multiline
                numberOfLines={4}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="text"
                  onPress={() => {
                    setResponseModalVisible(false);
                    setSelectedDoubt(null);
                    setDoubtResponse('');
                  }}
                  textColor="#888"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={respondToDoubt}
                  buttonColor="#4CAF50"
                >
                  Submit
                </Button>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
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
  tabs: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  unauthorized: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unauthorizedText: {
    color: '#888',
    fontSize: 18,
    marginTop: 16,
  },
  actionCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
  },
  cardTitle: {
    color: '#fff',
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#fff',
    marginBottom: 12,
  },
  userCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
  },
  userContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    color: '#888',
    fontSize: 12,
  },
  userCredits: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userCreditsText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  doubtCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 12,
  },
  doubtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doubtUser: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  doubtImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#2a2a2a',
  },
  doubtDescription: {
    color: '#ccc',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  respondButton: {
    marginTop: 8,
  },
  modal: {
    backgroundColor: '#1a1a1a',
    margin: 20,
    padding: 20,
    borderRadius: 8,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#fff',
    marginBottom: 16,
  },
  inputLabel: {
    color: '#888',
    fontSize: 14,
    marginBottom: 8,
  },
  userSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  userChip: {
    backgroundColor: '#2a2a2a',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#2a2a2a',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  optionLabel: {
    color: '#fff',
    fontSize: 16,
  },
  dateButton: {
    marginBottom: 16,
    borderColor: '#4CAF50',
  },
  imageButton: {
    marginBottom: 16,
    borderColor: '#4CAF50',
  },
  rewardPreview: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#2a2a2a',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 8,
  },
});
