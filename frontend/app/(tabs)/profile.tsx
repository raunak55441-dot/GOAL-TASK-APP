import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Title, Button, Avatar, Divider, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function Profile() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Title style={styles.title}>Profile</Title>
        </View>

        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Icon 
              size={80} 
              icon="account" 
              style={styles.avatar}
              color="#fff"
            />
            <View style={styles.profileInfo}>
              <Text style={styles.name}>{user?.name}</Text>
              <Text style={styles.email}>{user?.email}</Text>
              <View style={styles.roleChip}>
                <MaterialCommunityIcons 
                  name={user?.role === 'admin' ? 'shield-account' : 'account'} 
                  size={16} 
                  color="#fff" 
                />
                <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.creditsCard}>
          <Card.Content>
            <View style={styles.creditsContent}>
              <MaterialCommunityIcons name="star" size={48} color="#FFD700" />
              <View style={styles.creditsInfo}>
                <Text style={styles.creditsLabel}>Total Credits</Text>
                <Title style={styles.creditsValue}>{user?.credits || 0}</Title>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.menuCard}>
          <List.Section>
            <List.Item
              title="Account Information"
              description="View your account details"
              left={props => <List.Icon {...props} icon="account-details" color="#4CAF50" />}
              titleStyle={styles.menuTitle}
              descriptionStyle={styles.menuDescription}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="Settings"
              description="Manage app preferences"
              left={props => <List.Icon {...props} icon="cog" color="#4CAF50" />}
              titleStyle={styles.menuTitle}
              descriptionStyle={styles.menuDescription}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="Help & Support"
              description="Get help and support"
              left={props => <List.Icon {...props} icon="help-circle" color="#4CAF50" />}
              titleStyle={styles.menuTitle}
              descriptionStyle={styles.menuDescription}
            />
            <Divider style={styles.divider} />
            <List.Item
              title="About"
              description="App version and info"
              left={props => <List.Icon {...props} icon="information" color="#4CAF50" />}
              titleStyle={styles.menuTitle}
              descriptionStyle={styles.menuDescription}
            />
          </List.Section>
        </Card>

        <Button
          mode="contained"
          onPress={handleLogout}
          icon="logout"
          style={styles.logoutButton}
          buttonColor="#f44336"
        >
          Logout
        </Button>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0c0c0c',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
  },
  profileCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  profileContent: {
    alignItems: 'center',
    padding: 16,
  },
  avatar: {
    backgroundColor: '#4CAF50',
    marginBottom: 16,
  },
  profileInfo: {
    alignItems: 'center',
  },
  name: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  email: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
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
    marginHorizontal: 16,
    marginBottom: 16,
  },
  creditsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  creditsInfo: {
    flex: 1,
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
  menuCard: {
    backgroundColor: '#1a1a1a',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  menuTitle: {
    color: '#fff',
  },
  menuDescription: {
    color: '#888',
  },
  divider: {
    backgroundColor: '#333',
  },
  logoutButton: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  versionText: {
    color: '#666',
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 24,
  },
});
