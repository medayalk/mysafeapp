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
import { SCAN_CATEGORIES } from '@/src/constants/breeds';

export default function History() {
  const router = useRouter();
  const { activeProfile, scans, setScans } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<string>('all');

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
    : scans.filter((s: any) => {
        // Match either category or subcategory
        const sub = (s.subcategory || 'unknown').toLowerCase();
        const cat = (s.category || 'unknown').toLowerCase();
        // Legacy filter compatibility
        if (filter === 'food' && cat === 'food') return true;
        if (filter === 'cosmetic' && cat === 'cosmetic') return true;
        return sub === filter;
      });

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

  const formatSubcategory = (sub?: string) => {
    if (!sub) return '';
    return sub.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Count scans per category for badges
  const getCategoryCount = (categoryKey: string): number => {
    if (categoryKey === 'all') return scans.length;
    return scans.filter((s: any) => {
      const sub = (s.subcategory || 'unknown').toLowerCase();
      const cat = (s.category || 'unknown').toLowerCase();
      if (categoryKey === 'food' && cat === 'food') return true;
      if (categoryKey === 'cosmetic' && cat === 'cosmetic') return true;
      return sub === categoryKey;
    }).length;
  };

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan History</Text>
        <Text style={styles.subtitle}>Profile: {activeProfile?.name || 'None'}</Text>
      </View>

      {/* Horizontal scrollable category filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filtersContent}
      >
        {SCAN_CATEGORIES.map((cat) => {
          const count = getCategoryCount(cat.key);
          const isActive = filter === cat.key;
          // Hide categories with 0 scans except "All"
          if (cat.key !== 'all' && count === 0) return null;
          return (
            <TouchableOpacity
              key={cat.key}
              style={[styles.filterButton, isActive && styles.filterButtonActive]}
              onPress={() => setFilter(cat.key)}
              testID={`filter-${cat.key}`}
            >
              <Ionicons 
                name={cat.icon} 
                size={16} 
                color={isActive ? '#00d4ff' : '#808080'} 
              />
              <Text style={[styles.filterText, isActive && styles.filterTextActive]}>
                {cat.label}
              </Text>
              {count > 0 && (
                <View style={[styles.countBadge, isActive && styles.countBadgeActive]}>
                  <Text style={[styles.countText, isActive && styles.countTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

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
            <Text style={styles.emptySubtext}>
              {filter === 'all' ? 'Start scanning to see results' : 'No scans in this category yet'}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {filteredScans.map((scan: any) => (
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
                    <Text style={styles.scanCategory}>
                      {formatSubcategory(scan.subcategory) || scan.category}
                    </Text>
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
  container: { flex: 1 },
  header: {
    padding: 24,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#808080' },
  filtersScroll: { maxHeight: 56, marginBottom: 8 },
  filtersContent: { paddingHorizontal: 24, gap: 8, alignItems: 'center' },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  filterButtonActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    borderColor: '#00d4ff',
  },
  filterText: { fontSize: 13, color: '#808080', fontWeight: '600' },
  filterTextActive: { color: '#00d4ff' },
  countBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  },
  countBadgeActive: {
    backgroundColor: '#00d4ff',
  },
  countText: {
    fontSize: 11,
    color: '#a0a0a0',
    fontWeight: 'bold',
  },
  countTextActive: {
    color: '#000000',
  },
  scrollView: { flex: 1 },
  list: { padding: 24, gap: 12 },
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
  scoreText: { fontSize: 20, fontWeight: 'bold' },
  scanInfo: { gap: 4 },
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
  verdictText: { fontSize: 10, fontWeight: 'bold' },
  scanDate: { fontSize: 12, color: '#808080' },
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
  emptySubtext: {
    fontSize: 13,
    color: '#808080',
    marginTop: 8,
  },
});
