import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';
import { getScans } from '@/src/services/api';
import { useRouter } from 'expo-router';

export default function History() {
  const router = useRouter();
  const { activeProfile, scans, setScans } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'food' | 'cosmetic'>('all');

  const loadScans = async () => {
    try {
      const data = await getScans(activeProfile?.id);
      setScans(data);
    } catch (error) {
      console.error('Failed to load scans:', error);
    }
  };

  useEffect(() => {
    loadScans();
  }, [activeProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadScans();
    setRefreshing(false);
  };

  const filteredScans = filter === 'all' 
    ? scans 
    : scans.filter(s => s.category === filter);

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

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <Text style={styles.subtitle}>Profile: {activeProfile?.name}</Text>
      </View>

      <View style={styles.filters}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'food' && styles.filterButtonActive]}
          onPress={() => setFilter('food')}
        >
          <Text style={[styles.filterText, filter === 'food' && styles.filterTextActive]}>
            Food
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'cosmetic' && styles.filterButtonActive]}
          onPress={() => setFilter('cosmetic')}
        >
          <Text style={[styles.filterText, filter === 'cosmetic' && styles.filterTextActive]}>
            Cosmetic
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00d4ff" />
        }
      >
        {filteredScans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="time-outline" size={64} color="#404040" />
            <Text style={styles.emptyText}>No scans found</Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredScans.map((scan) => (
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
                  <View style={styles.scanInfo}>
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
                    <Text style={styles.scanDate}>
                      {new Date(scan.created_at).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#808080" />
              </TouchableOpacity>
            ))}
          </View>
        )}
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
  filters: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 12,
    marginBottom: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderColor: '#00d4ff',
  },
  filterText: {
    fontSize: 14,
    color: '#808080',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#00d4ff',
  },
  scrollView: {
    flex: 1,
  },
  list: {
    padding: 24,
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
    marginBottom: 12,
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
  scanInfo: {
    gap: 4,
  },
  scanCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
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
  scanDate: {
    fontSize: 12,
    color: '#808080',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
  },
});
