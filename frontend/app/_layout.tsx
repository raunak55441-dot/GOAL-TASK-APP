import React from 'react';
import { Stack } from 'expo-router';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { AuthProvider } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';

const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#4CAF50',
    secondary: '#2196F3',
    background: '#0c0c0c',
    surface: '#1a1a1a',
    error: '#f44336',
  },
};

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/login" />
          <Stack.Screen name="(auth)/register" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthProvider>
    </PaperProvider>
  );
}
