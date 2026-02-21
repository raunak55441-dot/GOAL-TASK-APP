import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image } from 'react-native';
import { Text, Card, Title, Button, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import axios from 'axios';
import Constants from 'expo-constants';

const API_URL = Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || process.env.EXPO_PUBLIC_BACKEND_URL;

export default function Rewards() {
  const { user, refreshUser } = useAuth();
  const [rewards, setRewards] = useState<any[]>([]);
  const [redemptions, setRedemptions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [cart, setCart] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rewardsRes, redemptionsRes] = await Promise.all([
        axios.get(`${API_URL}/api/rewards`),
        axios.get(`${API_URL}/api/redemptions`),
      ]);
      setRewards(rewardsRes.data);
      setRedemptions(redemptionsRes.data);
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  };

  const addToCart = (rewardId: string) => {
    if (cart.includes(rewardId)) {
      setCart(cart.filter(id => id !== rewardId));
    } else {
      setCart([...cart, rewardId]);
    }
  };

  const redeemReward = async (rewardId: string) => {
    try {
      const reward = rewards.find(r => r.id === rewardId);
      if (!reward) return;

      if ((user?.credits || 0) < reward.cost) {
        alert('Not enough credits');
        return;
      }

      await axios.post(`${API_URL}/api/rewards/${rewardId}/redeem`);
      await refreshUser();
      await loadData();
      setCart(cart.filter(id => id !== rewardId));
      alert('Reward redeemed successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to redeem reward');
    }
  };

  const redeemCart = async () => {
    if (cart.length === 0) return;

    const totalCost = cart.reduce((sum, rewardId) => {
      const reward = rewards.find(r => r.id === rewardId);
      return sum + (reward?.cost || 0);
    }, 0);

    if ((user?.credits || 0) < totalCost) {
      alert('Not enough credits');
      return;
    }

    try {
      for (const rewardId of cart) {
        await axios.post(`${API_URL}/api/rewards/${rewardId}/redeem`);
      }
      await refreshUser();
      await loadData();
      setCart([]);
      alert('All rewards redeemed successfully!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to redeem rewards');
      await loadData();
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    await refreshUser();
    setRefreshing(false);
  };

  const cartTotal = cart.reduce((sum, rewardId) => {
    const reward = rewards.find(r => r.id === rewardId);
    return sum + (reward?.cost || 0);
  }, 0);

  const canAffordCart = (user?.credits || 0) >= cartTotal;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.title}>Reward Zone</Title>
        <View style={styles.creditsChip}>
          <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
          <Text style={styles.creditsText}>{user?.credits || 0}</Text>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />}
        style={styles.scrollView}
      >
        {cart.length > 0 && (
          <Card style={styles.cartCard}>
            <Card.Content>
              <View style={styles.cartHeader}>
                <Title style={styles.cartTitle}>Cart ({cart.length})</Title>
                <View style={styles.cartTotal}>
                  <MaterialCommunityIcons name="star" size={20} color="#FFD700" />
                  <Text style={[
                    styles.cartTotalText,
                    !canAffordCart && styles.insufficientText
                  ]}>
                    {cartTotal}
                  </Text>
                </View>
              </View>
              {!canAffordCart && (
                <Text style={styles.insufficientText}>Not enough credits</Text>
              )}
              <Button
                mode="contained"
                onPress={redeemCart}
                disabled={!canAffordCart}
                buttonColor="#4CAF50"
                style={styles.redeemButton}
              >
                Redeem All
              </Button>
            </Card.Content>
          </Card>
        )}

        <Title style={styles.sectionTitle}>Available Rewards</Title>
        {rewards.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Card.Content style={styles.emptyContent}>
              <MaterialCommunityIcons name="gift" size={64} color="#888" />
              <Text style={styles.emptyText}>No rewards available</Text>
            </Card.Content>
          </Card>
        ) : (
          rewards.map((reward) => {
            const inCart = cart.includes(reward.id);
            const canAfford = (user?.credits || 0) >= reward.cost;
            
            return (
              <Card key={reward.id} style={styles.rewardCard}>
                <Card.Content>
                  <View style={styles.rewardContent}>
                    {reward.image_base64 ? (
                      <Image
                        source={{ uri: reward.image_base64 }}
                        style={styles.rewardImage}
                      />
                    ) : (
                      <View style={styles.placeholderImage}>
                        <MaterialCommunityIcons name="gift" size={48} color="#4CAF50" />
                      </View>
                    )}
                    <View style={styles.rewardInfo}>
                      <Text style={styles.rewardName}>{reward.name}</Text>
                      <View style={styles.rewardCost}>
                        <MaterialCommunityIcons name="star" size={18} color="#FFD700" />
                        <Text style={styles.rewardCostText}>{reward.cost} credits</Text>
                      </View>
                    </View>
                    <View style={styles.rewardActions}>
                      <IconButton
                        icon={inCart ? 'cart-remove' : 'cart-plus'}
                        iconColor={inCart ? '#f44336' : canAfford ? '#4CAF50' : '#888'}
                        size={24}
                        onPress={() => canAfford && addToCart(reward.id)}
                        disabled={!canAfford && !inCart}
                      />
                      <IconButton
                        icon="check"
                        iconColor="#4CAF50"
                        size={24}
                        onPress={() => redeemReward(reward.id)}
                        disabled={!canAfford}
                      />
                    </View>
                  </View>
                </Card.Content>
              </Card>
            );
          })
        )}

        {redemptions.length > 0 && (
          <View style={styles.section}>
            <Title style={styles.sectionTitle}>My Redemptions</Title>
            {redemptions.map((redemption) => (
              <Card key={redemption.id} style={styles.redemptionCard}>
                <Card.Content>
                  <View style={styles.redemptionContent}>
                    <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
                    <View style={styles.redemptionInfo}>
                      <Text style={styles.redemptionName}>{redemption.reward_name}</Text>
                      <Text style={styles.redemptionDate}>
                        {new Date(redemption.redeemed_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.redemptionCost}>
                      <MaterialCommunityIcons name="star" size={16} color="#FFD700" />
                      <Text style={styles.redemptionCostText}>{redemption.cost}</Text>
                    </View>
                  </View>
                </Card.Content>
              </Card>
            ))}
          </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    color: '#fff',
    fontSize: 28,
  },
  creditsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  creditsText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  cartCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 16,
    borderColor: '#4CAF50',
    borderWidth: 2,
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cartTitle: {
    color: '#fff',
    fontSize: 18,
  },
  cartTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cartTotalText: {
    color: '#FFD700',
    fontSize: 20,
    fontWeight: 'bold',
  },
  insufficientText: {
    color: '#f44336',
    fontSize: 14,
    marginBottom: 8,
  },
  redeemButton: {
    marginTop: 8,
  },
  sectionTitle: {
    color: '#fff',
    marginBottom: 12,
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
  rewardCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 12,
  },
  rewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rewardImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
  },
  placeholderImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardInfo: {
    flex: 1,
  },
  rewardName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rewardCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rewardCostText: {
    color: '#FFD700',
    fontSize: 14,
  },
  rewardActions: {
    flexDirection: 'row',
  },
  section: {
    marginTop: 24,
  },
  redemptionCard: {
    backgroundColor: '#1a1a1a',
    marginBottom: 8,
    opacity: 0.8,
  },
  redemptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  redemptionInfo: {
    flex: 1,
  },
  redemptionName: {
    color: '#fff',
    fontSize: 14,
    marginBottom: 2,
  },
  redemptionDate: {
    color: '#888',
    fontSize: 12,
  },
  redemptionCost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  redemptionCostText: {
    color: '#888',
    fontSize: 12,
  },
});
