import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';
import { getScans, getProfiles } from '@/src/services/api';

export default function Home() {
  const router = useRouter();
  const { user, activeProfile, profiles, scans, setScans, setProfiles, setActiveProfile } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const loadData = async () => {
    try {
      const [profilesData, scansData] = await Promise.all([
        getProfiles(),
        getScans(activeProfile?.id),
      ]);
      setProfiles(profilesData);
      setScans(scansData);
    } catch (error: any) {
      Alert.alert('Error', 'Failed to load data');
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return '#00ff88';
    if (score >= 6) return '#ffaa00';
    if (score >= 4) return '#ff6b00';
    return '#ff0044';
  };

  const getVerdictColor = (verdict: string) => {
    switch (verdict) {
      case 'safe': return '#00ff88';
      case 'caution': return '#ffaa00';
      case 'unhealthy': return '#ff6b00';
      case 'danger': return '#ff0044';
      default: return '#808080';
    }
  };

  const recentScans = scans.slice(0, 5);

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {user?.name}!</Text>
            <Text style={styles.subGreeting}>Stay safe, scan smart</Text>
          </View>
        </View>

        {/* Profile Switcher */}
        <View style={styles.profileSwitcher}>
          <Text style={styles.sectionTitle}>Active Profile</Text>
          <TouchableOpacity 
            style={styles.profileButton}
            onPress={() => setShowProfileDropdown(!showProfileDropdown)}
          >
            <View style={styles.profileInfo}>
              <Ionicons 
                name={activeProfile?.profile_type === 'pet' ? 'paw' : 'person'} 
                size={24} 
                color="#00d4ff" 
              />
              <View>
                <Text style={styles.profileName}>{activeProfile?.name || 'No Profile'}</Text>
                <Text style={styles.profileType}>
                  {activeProfile?.profile_type === 'pet' ? `Pet - ${activeProfile.pet_type}` : 'Human'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-down" size={20} color="#808080" />
          </TouchableOpacity>

          {showProfileDropdown && (
            <View style={styles.dropdown}>
              {profiles.map((profile) => (
                <TouchableOpacity
                  key={profile.id}
                  style={[
                    styles.dropdownItem,
                    profile.id === activeProfile?.id && styles.dropdownItemActive,
                  ]}
                  onPress={async () => {
                    await setActiveProfile(profile);
                    setShowProfileDropdown(false);
                  }}
                >
                  <Ionicons 
                    name={profile.profile_type === 'pet' ? 'paw' : 'person'} 
                    size={20} 
                    color={profile.id === activeProfile?.id ? '#00d4ff' : '#808080'} 
                  />
                  <Text style={[
                    styles.dropdownText,
                    profile.id === activeProfile?.id && styles.dropdownTextActive,
                  ]}>
                    {profile.name}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.dropdownItem}
                onPress={() => {
                  setShowProfileDropdown(false);
                  router.push('/profile/create');
                }}
              >
                <Ionicons name="add-circle-outline" size={20} color="#00d4ff" />
                <Text style={[styles.dropdownText, { color: '#00d4ff' }]}>Add Profile</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/scan')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="scan" size={32} color="#00d4ff" />
              </View>
              <Text style={styles.actionText}>Scan Product</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionCard}
              onPress={() => router.push('/(tabs)/history')}
            >
              <View style={styles.actionIcon}>
                <Ionicons name="time" size={32} color="#00d4ff" />
              </View>
              <Text style={styles.actionText}>View History</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Scans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentScans.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="scan-outline" size={48} color="#404040" />
              <Text style={styles.emptyText}>No scans yet</Text>
              <Text style={styles.emptySubtext}>Start scanning to see results here</Text>
            </View>
          ) : (
            <View style={styles.scansList}>
              {recentScans.map((scan) => (
                <TouchableOpacity
                  key={scan.id}
                  style={styles.scanCard}
                  onPress={() => router.push(`/results/${scan.id}`)}
                >
                  <View style={styles.scanLeft}>
                    <View style={[
                      styles.scoreCircle,
                      { backgroundColor: `${getScoreColor(scan.score)}20` }
                    ]}>
                      <Text style={[
                        styles.scoreText,
                        { color: getScoreColor(scan.score) }
                      ]}>
                        {scan.score.toFixed(1)}
                      </Text>
                    </View>
                    <View>
                      <Text style={styles.scanCategory}>{scan.category}</Text>
                      <View style={[
                        styles.verdictBadge,
                        { backgroundColor: `${getVerdictColor(scan.verdict)}20` }
                      ]}>
                        <Text style={[
                          styles.verdictText,
                          { color: getVerdictColor(scan.verdict) }
                        ]}>
                          {scan.verdict.toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#808080" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  subGreeting: {
    fontSize: 14,
    color: '#808080',
    marginTop: 4,
  },
  profileSwitcher: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  profileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  profileType: {
    fontSize: 12,
    color: '#808080',
    marginTop: 2,
  },
  dropdown: {
    marginTop: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  dropdownItemActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  dropdownText: {
    fontSize: 16,
    color: '#ffffff',
  },
  dropdownTextActive: {
    color: '#00d4ff',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  seeAll: {
    fontSize: 14,
    color: '#00d4ff',
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
  scansList: {
    gap: 12,
  },
  scanCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  scanLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  scoreCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scanCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
    textTransform: 'capitalize',
  },
  verdictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  verdictText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#808080',
    marginTop: 8,
  },
});
