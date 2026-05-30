import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';

export default function Settings() {
  const router = useRouter();
  const { user, logout } = useStore();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/');
          },
        },
      ]
    );
  };

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="person" size={20} color="#808080" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{user?.name}</Text>
              </View>
            </View>

            <View style={styles.separator} />

            <View style={styles.infoRow}>
              <Ionicons name="mail" size={20} color="#808080" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Subscription Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Subscription</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons 
                name={user?.subscription_status === 'premium' ? 'star' : 'star-outline'} 
                size={20} 
                color={user?.subscription_status === 'premium' ? '#ffaa00' : '#808080'} 
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Plan</Text>
                <Text style={[
                  styles.infoValue,
                  user?.subscription_status === 'premium' && styles.premiumText,
                ]}>
                  {user?.subscription_status === 'premium' ? 'Premium' : 'Free'}
                </Text>
              </View>
            </View>

            {user?.subscription_status === 'free' && (
              <>
                <View style={styles.separator} />
                <TouchableOpacity style={styles.upgradeSection}>
                  <View>
                    <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
                    <Text style={styles.upgradeFeatures}>
                      {'• Unlimited profiles\n• Pet profiles\n• Cosmetic scanning\n• Product comparison'}
                    </Text>
                    <Text style={styles.upgradePrice}>$4.99/month</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#00d4ff" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="shield-checkmark" size={20} color="#808080" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Version</Text>
                <Text style={styles.infoValue}>1.0.0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={20} color="#ff0044" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#808080',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#808080',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  premiumText: {
    color: '#ffaa00',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  upgradeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'rgba(0, 212, 255, 0.05)',
  },
  upgradeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00d4ff',
    marginBottom: 8,
  },
  upgradeFeatures: {
    fontSize: 13,
    color: '#a0a0a0',
    lineHeight: 20,
    marginBottom: 8,
  },
  upgradePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginBottom: 40,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 0, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ff0044',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ff0044',
  },
});
