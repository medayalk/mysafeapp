import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { getScan } from '@/src/services/api';

interface Scan {
  id: string;
  user_id: string;
  profile_id: string;
  image_base64: string;
  ocr_text: string;
  category: 'food' | 'cosmetic' | 'unknown';
  score: number;
  verdict: 'safe' | 'caution' | 'unhealthy' | 'danger';
  flagged_ingredients: Array<{ name: string; reason: string }>;
  safe_ingredients: string[];
  ai_summary: string;
  created_at: string;
}

export default function Results() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadScan();
  }, [id]);

  const loadScan = async () => {
    if (!id) return;
    try {
      const data = await getScan(id);
      setScan(data);
    } catch (error) {
      console.error('Failed to load scan:', error);
    } finally {
      setLoading(false);
    }
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

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case 'safe': return 'checkmark-circle';
      case 'caution': return 'warning';
      case 'unhealthy': return 'alert-circle';
      case 'danger': return 'close-circle';
      default: return 'help-circle';
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </LinearGradient>
    );
  }

  if (!scan) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
        <Text style={styles.errorText}>Scan not found</Text>
      </LinearGradient>
    );
  }

  const scoreColor = getScoreColor(scan.score);
  const verdictColor = getVerdictColor(scan.verdict);

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Results</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Score Circle */}
        <View style={styles.scoreSection}>
          <View style={[styles.scoreRing, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>
              {scan.score.toFixed(1)}
            </Text>
            <Text style={styles.scoreLabel}>out of 10</Text>
          </View>
          
          <View style={[styles.verdictBadge, { backgroundColor: `${verdictColor}20` }]}>
            <Ionicons 
              name={getVerdictIcon(scan.verdict) as any} 
              size={20} 
              color={verdictColor} 
            />
            <Text style={[styles.verdictText, { color: verdictColor }]}>
              {scan.verdict.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.categoryText}>
            Category: {scan.category.charAt(0).toUpperCase() + scan.category.slice(1)}
          </Text>
        </View>

        {/* AI Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Safety Summary</Text>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryText}>{scan.ai_summary}</Text>
          </View>
        </View>

        {/* Flagged Ingredients */}
        {scan.flagged_ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#ff6b00' }]}>
              Flagged Ingredients ({scan.flagged_ingredients.length})
            </Text>
            {scan.flagged_ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientCard}>
                <View style={styles.ingredientHeader}>
                  <Ionicons name="warning" size={20} color="#ff6b00" />
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                </View>
                <Text style={styles.ingredientReason}>{ingredient.reason}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Safe Ingredients */}
        {scan.safe_ingredients.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#00ff88' }]}>
              Safe Ingredients ({scan.safe_ingredients.length})
            </Text>
            <View style={styles.safeIngredientsContainer}>
              {scan.safe_ingredients.map((ingredient, index) => (
                <View key={index} style={styles.safeIngredientBadge}>
                  <Ionicons name="checkmark" size={14} color="#00ff88" />
                  <Text style={styles.safeIngredientText}>{ingredient}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <Ionicons name="scan" size={20} color="#00d4ff" />
            <Text style={styles.actionButtonText}>Scan Another</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => router.push('/(tabs)/home')}
          >
            <Ionicons name="home" size={20} color="#ffffff" />
            <Text style={styles.actionButtonTextSecondary}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  scrollView: {
    flex: 1,
  },
  scoreSection: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 16,
  },
  scoreRing: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: 'bold',
  },
  scoreLabel: {
    fontSize: 14,
    color: '#808080',
  },
  verdictBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  verdictText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  categoryText: {
    fontSize: 14,
    color: '#808080',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  summaryCard: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  summaryText: {
    fontSize: 15,
    color: '#ffffff',
    lineHeight: 22,
  },
  ingredientCard: {
    backgroundColor: 'rgba(255, 107, 0, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 0, 0.2)',
  },
  ingredientHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  ingredientReason: {
    fontSize: 14,
    color: '#a0a0a0',
    lineHeight: 20,
  },
  safeIngredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  safeIngredientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 136, 0.2)',
  },
  safeIngredientText: {
    fontSize: 12,
    color: '#00ff88',
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00d4ff',
  },
  actionButtonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00d4ff',
  },
  actionButtonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  errorText: {
    fontSize: 18,
    color: '#ffffff',
    textAlign: 'center',
  },
});
