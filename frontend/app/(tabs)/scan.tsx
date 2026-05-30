import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';

export default function Scan() {
  const router = useRouter();
  const { user, activeProfile } = useStore();

  if (!activeProfile) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="person-add" size={64} color="#404040" />
          <Text style={styles.emptyText}>No Active Profile</Text>
          <Text style={styles.emptySubtext}>Please create a profile first</Text>
          <TouchableOpacity 
            style={styles.createButton}
            onPress={() => router.push('/profile/create')}
          >
            <Text style={styles.createButtonText}>Create Profile</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Product</Text>
          <Text style={styles.subtitle}>Scanning for: {activeProfile.name}</Text>
        </View>

        <View style={styles.scanArea}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
            
            <Ionicons name="scan" size={80} color="#00d4ff" />
            <Text style={styles.scanText}>Position ingredients label</Text>
            <Text style={styles.scanSubtext}>Make sure text is clear and readable</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.captureButton}
          onPress={() => router.push('/scanner')}
        >
          <View style={styles.captureButtonInner}>
            <Ionicons name="camera" size={32} color="#000000" />
          </View>
        </TouchableOpacity>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>Tips for best results:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#00d4ff" />
            <Text style={styles.tipText}>Good lighting is essential</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#00d4ff" />
            <Text style={styles.tipText}>Hold camera steady</Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="checkmark-circle" size={16} color="#00d4ff" />
            <Text style={styles.tipText}>Ensure text is in focus</Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    padding: 24,
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
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  scanFrame: {
    width: '100%',
    aspectRatio: 1,
    maxWidth: 300,
    maxHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00d4ff',
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  scanText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 24,
  },
  scanSubtext: {
    fontSize: 14,
    color: '#808080',
    marginTop: 8,
    textAlign: 'center',
  },
  captureButton: {
    alignSelf: 'center',
    marginBottom: 32,
  },
  captureButtonInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
  },
  tips: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#a0a0a0',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 24,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#808080',
    marginTop: 8,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#00d4ff',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
});
