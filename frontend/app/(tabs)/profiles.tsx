import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';
import { getProfiles } from '@/src/services/api';

export default function Profiles() {
  const router = useRouter();
  const { profiles, setProfiles, activeProfile, setActiveProfile, user } = useStore();
  const [refreshing, setRefreshing] = useState(false);

  const loadProfiles = async () => {
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch (error) {
      console.error('Failed to load profiles:', error);
    }
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfiles();
    setRefreshing(false);
  };

  const canAddProfile = () => true; // All features unlocked

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profiles</Text>
        <Text style={styles.subtitle}>Manage your family & pet profiles</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />
        }
      >
        <View style={styles.profilesList}>
          {profiles.map((profile) => (
            <TouchableOpacity
              key={profile.id}
              style={[
                styles.profileCard,
                profile.id === activeProfile?.id && styles.profileCardActive,
              ]}
              onPress={async () => {
                await setActiveProfile(profile);
              }}
            >
              <View style={styles.profileLeft}>
                <View style={[
                  styles.profileIcon,
                  profile.id === activeProfile?.id && styles.profileIconActive,
                ]}>
                  <Ionicons 
                    name={profile.profile_type === 'pet' ? 'paw' : 'person'} 
                    size={28} 
                    color={profile.id === activeProfile?.id ? '#00d4ff' : '#808080'}
                  />
                </View>
                <View>
                  <View style={styles.profileNameRow}>
                    <Text style={[
                      styles.profileName,
                      profile.id === activeProfile?.id && styles.profileNameActive,
                    ]}>
                      {profile.name}
                    </Text>
                    {profile.id === activeProfile?.id && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.profileMeta}>
                    {profile.profile_type === 'pet' 
                      ? `Pet • ${profile.pet_type}` 
                      : `Human • ${profile.age_value} ${profile.age_unit}`}
                  </Text>
                </View>
              </View>
              {profile.id === activeProfile?.id && (
                <Ionicons name="checkmark-circle" size={24} color="#00d4ff" />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => router.push('/profile/create')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#00d4ff" />
          <Text style={styles.addButtonText}>Add New Profile</Text>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#808080',
  },
  scrollView: {
    flex: 1,
  },
  profilesList: {
    padding: 24,
    gap: 12,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  profileCardActive: {
    borderColor: '#00d4ff',
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  profileLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  profileIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileIconActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
  },
  profileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileNameActive: {
    color: '#00d4ff',
  },
  activeBadge: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
  },
  profileMeta: {
    fontSize: 14,
    color: '#808080',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginHorizontal: 24,
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00d4ff',
    borderStyle: 'dashed',
  },
  addButtonDisabled: {
    borderStyle: 'solid',
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderColor: '#ffaa00',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00d4ff',
  },
  limitInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    margin: 24,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 170, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 170, 0, 0.3)',
  },
  limitText: {
    flex: 1,
    fontSize: 13,
    color: '#ffaa00',
    lineHeight: 20,
  },
});
