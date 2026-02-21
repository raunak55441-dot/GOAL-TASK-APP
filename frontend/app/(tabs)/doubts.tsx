import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Card, Title, Button, FAB, Portal, Modal, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import Constants from 'expo-constants';
import { format } from 'date-fns';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Doubts() {
  const { user } = useAuth();
  const [doubts, setDoubts] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadDoubts();
    requestPermissions();
  }, []);

  const requestPermissions = async () => {
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (cameraStatus !== 'granted' || mediaStatus !== 'granted') {
      alert('Camera and gallery permissions are required to upload doubts');
    }
  };

  const loadDoubts = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/doubts`);
      setDoubts(response.data);
    } catch (error) {
      console.error('Error loading doubts:', error);
    }
  };

  const pickImage = async (useCamera: boolean) => {
    try {
      let result;
      if (useCamera) {
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.7,
          base64: true,
        });
      }

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setSelectedImage(base64Image);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      alert('Failed to pick image');
    }
  };

  const submitDoubt = async () => {
    if (!selectedImage || !description.trim()) {
      alert('Please add an image and description');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API_URL}/api/doubts`, {
        image_base64: selectedImage,
        description: description.trim(),
      });
      
      setModalVisible(false);
      setSelectedImage(null);
      setDescription('');
      await loadDoubts();
      alert('Doubt submitted successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to submit doubt');
    } finally {
      setSubmitting(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDoubts();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Doubts</Title>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
        style={styles.scrollView}
      >
        {doubts.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="help-circle-outline" size={64} color="#888" />
              <Text style={styles.emptyText}>No doubts yet</Text>
              <Text style={styles.emptySubtext}>Tap the camera button to upload a doubt</Text>
            </Card.Content>
          </Card>
        ) : (
          doubts.map((doubt) => (
            <Card key={doubt.id} style={styles.doubtCard}>
              <Card.Content>
                <View style={styles.doubtHeader}>
                  <View style={styles.doubtUser}>
                    <MaterialCommunityIcons name="account-circle" size={24} color="#4CAF50" />
                    <Text style={styles.doubtUserName}>{doubt.user_name}</Text>
                  </View>
                  <View style={[
                    styles.statusChip,
                    doubt.status === 'answered' && styles.statusAnswered
                  ]}>
                    <Text style={styles.statusText}>
                      {doubt.status === 'answered' ? 'Answered' : 'Pending'}
                    </Text>
                  </View>
                </View>

                {doubt.image_base64 && (
                  <Image
                    source={{ uri: doubt.image_base64 }}
                    style={styles.doubtImage}
                    resizeMode="contain"
                  />
                )}

                <Text style={styles.doubtDescription}>{doubt.description}</Text>

                {doubt.admin_response && (
                  <View style={styles.responseContainer}>
                    <View style={styles.responseHeader}>
                      <MaterialCommunityIcons name="message-reply" size={20} color="#4CAF50" />
                      <Text style={styles.responseLabel}>Admin Response:</Text>
                    </View>
                    <Text style={styles.responseText}>{doubt.admin_response}</Text>
                  </View>
                )}

                <Text style={styles.doubtDate}>
                  {format(new Date(doubt.created_at), 'MMM dd, yyyy HH:mm')}
                </Text>
              </Card.Content>
            </Card>
          ))
        )}
      </ScrollView>

      {user?.role !== 'admin' && (
        <FAB
          icon="camera"
          style={styles.fab}
          onPress={() => pickImage(true)}
          color="#fff"
        />
      )}

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView>
              <Title style={styles.modalTitle}>Submit Doubt</Title>

              {selectedImage && (
                <Image
                  source={{ uri: selectedImage }}
                  style={styles.modalImage}
                  resizeMode="contain"
                />
              )}

              <Button
                mode="outlined"
                onPress={() => pickImage(false)}
                icon="image"
                style={styles.changeImageButton}
                textColor="#4CAF50"
              >
                Change Image
              </Button>

              <TextInput
                label="Description"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                mode="outlined"
                style={styles.textInput}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              <View style={styles.modalActions}>
                <Button
                  mode="text"
                  onPress={() => {
                    setModalVisible(false);
                    setSelectedImage(null);
                    setDescription('');
                  }}
                  textColor="#888"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={submitDoubt}
                  loading={submitting}
                  disabled={submitting}
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
  emptySubtext: {
    color: '#666',
    fontSize: 14,
    marginTop: 8,
  },
  doubtCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
  },
  doubtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  doubtUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  doubtUserName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  statusChip: {
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusAnswered: {
    backgroundColor: '#1b4d1b',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
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
  responseContainer: {
    backgroundColor: '#2a2a2a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  responseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  responseLabel: {
    color: '#4CAF50',
    fontSize: 12,
    fontWeight: 'bold',
  },
  responseText: {
    color: '#fff',
    fontSize: 14,
    lineHeight: 20,
  },
  doubtDate: {
    color: '#666',
    fontSize: 12,
  },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#4CAF50',
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
  modalImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#2a2a2a',
  },
  changeImageButton: {
    marginBottom: 16,
    borderColor: '#4CAF50',
  },
  textInput: {
    marginBottom: 16,
    backgroundColor: '#2a2a2a',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
