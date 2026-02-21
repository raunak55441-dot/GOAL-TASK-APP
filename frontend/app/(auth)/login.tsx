import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import { Text, TextInput, Button, Title, HelperText } from 'react-native-paper';
import { useRouter, Link } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, password);
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
            <Text style={styles.subtitle}>Transform Tasks into Achievements</Text>

            <View style={styles.form}>
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

              {error ? <HelperText type="error" visible={true}>{error}</HelperText> : null}

              <Button
                mode="contained"
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                style={styles.button}
                buttonColor="#4CAF50"
              >
                Login
              </Button>

              <Link href="/(auth)/register" asChild>
                <Button mode="text" textColor="#4CAF50">
                  Don't have an account? Register
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
  button: {
    marginTop: 16,
    marginBottom: 16,
    paddingVertical: 6,
  },
});
