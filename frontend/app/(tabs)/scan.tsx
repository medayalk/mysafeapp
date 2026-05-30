import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';

/**
 * The "Scan" tab simply forwards to /scanner whenever it gains focus.
 * /scanner immediately invokes the device's native camera app on mobile,
 * or the styled file-input native camera on web.
 */
export default function ScanTab() {
  const router = useRouter();
  const { activeProfile } = useStore();

  useFocusEffect(
    React.useCallback(() => {
      if (activeProfile) {
        router.push('/scanner');
      }
    }, [activeProfile]),
  );

  if (!activeProfile) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
        <View style={styles.empty}>
          <Ionicons name="person-add" size={64} color="#404040" />
          <Text style={styles.title}>No Active Profile</Text>
          <Text style={styles.subtitle}>Please create a profile first</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => router.push('/profile/create')}
          >
            <Text style={styles.buttonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <View style={styles.empty}>
        <Ionicons name="camera" size={64} color="#00d4ff" />
        <Text style={styles.title}>Opening camera…</Text>
        <Text style={styles.subtitle}>Scanning for: {activeProfile.name}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.push('/scanner')}
          testID="scan-open-btn"
        >
          <Ionicons name="scan" size={20} color="#000000" />
          <Text style={styles.buttonText}>Scan Ingredients</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    gap: 16,
  },
  title: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginTop: 20 },
  subtitle: { fontSize: 14, color: '#808080', marginBottom: 24 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#00d4ff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonText: { fontSize: 16, fontWeight: 'bold', color: '#000000' },
});
