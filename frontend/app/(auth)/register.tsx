import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, Title, HelperText, SegmentedButtons } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const router = useRouter();

  const handleRegister = async () => {
    if (!email || !password || !name) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(email, password, name, role);
      router.replace('/(tabs)/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Title style={styles.title}>🎯 GoalTask</Title>
            <Text style={styles.subtitle}>Join and Start Achieving</Text>

            <View style={styles.form}>
              <TextInput
                label="Name"
                value={name}
                onChangeText={setName}
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              <TextInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                mode="outlined"
                style={styles.input}
                theme={{ colors: { primary: '#4CAF50' } }}
              />

              <Text style={styles.roleLabel}>Register as:</Text>
              <SegmentedButtons
                value={role}
                onValueChange={setRole}
                buttons={[
                  { value: 'user', label: 'User' },
                  { value: 'admin', label: 'Admin' },
                ]}
                style={styles.segmented}
              />

              {error ? <HelperText type="error" visible={true}>{error}</HelperText> : null}

              <Button
                mode="contained"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor="#4CAF50"
              >
                Register
              </Button>

              <Link href="/(auth)/login" asChild>
                <Button mode="text" textColor="#4CAF50">
                  Already have an account? Login
                </Button>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 48,
    color: '#4CAF50',
    marginBottom: 8,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginBottom: 40,
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#1a1a1a',
  },
  roleLabel: {
    color: '#888',
    marginBottom: 8,
    fontSize: 14,
  },
  segmented: {
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 6,
  },
});
