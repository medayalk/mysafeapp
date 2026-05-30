import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';
import { createScan } from '@/src/services/api';

export default function Scanner() {
  const router = useRouter();
  const { activeProfile } = useStore();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const capturePhoto = async () => {
    if (!cameraRef.current || !activeProfile) return;

    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: true,
      });

      if (!photo.base64) {
        throw new Error('Failed to capture image');
      }

      // Call API to scan
      const result = await createScan(activeProfile.id, photo.base64);
      
      // Navigate to results
      router.replace(`/results/${result.id}`);
    } catch (error: any) {
      if (error.response?.status === 400) {
        Alert.alert(
          'Image Unclear',
          'Please ensure the ingredients are in focus and scan again.',
          [{ text: 'OK' }]
        );
      } else if (error.response?.status === 403) {
        Alert.alert(
          'Premium Required',
          error.response?.data?.detail || 'This feature requires Premium',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => router.push('/(tabs)/settings') },
          ]
        );
      } else {
        Alert.alert('Error', error.response?.data?.detail || 'Failed to scan product');
      }
    } finally {
      setScanning(false);
    }
  };

  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#00d4ff" />
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.container}>
        <Ionicons name="camera-off" size={64} color="#808080" />
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubtext}>Please enable camera access in settings</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} ref={cameraRef} facing="back">
        <View style={styles.overlay}>
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <Ionicons name="close" size={32} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerText}>Position ingredients label</Text>
            <View style={{ width: 40 }} />
          </View>

          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          <View style={styles.bottom}>
            <Text style={styles.instructionText}>Make sure text is clear and readable</Text>
            
            <TouchableOpacity 
              style={[styles.captureButton, scanning && styles.captureButtonDisabled]}
              onPress={capturePhoto}
              disabled={scanning}
            >
              {scanning ? (
                <View style={styles.captureButtonInner}>
                  <ActivityIndicator color="#000000" />
                </View>
              ) : (
                <View style={styles.captureButtonInner}>
                  <Ionicons name="camera" size={32} color="#000000" />
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  scanFrame: {
    flex: 1,
    marginHorizontal: 40,
    marginVertical: 60,
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
  bottom: {
    alignItems: 'center',
    paddingBottom: 60,
    gap: 24,
  },
  instructionText: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
  },
  captureButtonDisabled: {
    opacity: 0.5,
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
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 24,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#808080',
    marginTop: 8,
    textAlign: 'center',
  },
});
