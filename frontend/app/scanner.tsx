import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';
import { createScan } from '@/src/services/api';
import WebCameraScanner from '@/src/components/WebCameraScanner';

export default function Scanner() {
  // On web, use a dedicated component that calls getUserMedia with strict
  // high-resolution constraints (1080p ideal, up to 4K) and continuous AF.
  if (Platform.OS === 'web') {
    return <WebCameraScanner />;
  }

  // On native (iOS / Android) keep expo-camera but request the highest
  // hardware resolution available + continuous autofocus + main wide lens.
  return <NativeCameraScanner />;
}

function NativeCameraScanner() {
  const router = useRouter();
  const { activeProfile } = useStore();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanning, setScanning] = useState(false);
  const [autofocus, setAutofocus] = useState<'on' | 'off'>('on');
  const [torch, setTorch] = useState(false);
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [pictureSize, setPictureSize] = useState<string | undefined>(undefined);
  const cameraRef = useRef<any>(null);
  const focusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Once camera is ready, query supported picture sizes (Android) and pick the highest
  const onCameraReady = async () => {
    if (Platform.OS === 'android' && cameraRef.current) {
      try {
        const sizes: string[] = await cameraRef.current.getAvailablePictureSizesAsync();
        if (sizes && sizes.length > 0) {
          setAvailableSizes(sizes);
          // Pick the highest resolution (sort by width*height descending)
          const sorted = [...sizes].sort((a, b) => {
            const [aw, ah] = a.split('x').map(Number);
            const [bw, bh] = b.split('x').map(Number);
            return (bw * bh) - (aw * ah);
          });
          // Cap at 4K (3840x2160) to avoid base64 payload issues
          const best = sorted.find((s) => {
            const [w, h] = s.split('x').map(Number);
            return w <= 3840 && h <= 2160;
          }) || sorted[0];
          setPictureSize(best);
        }
      } catch (e) {
        console.warn('Could not query picture sizes:', e);
      }
    }
  };

  const triggerRefocus = (x: number, y: number) => {
    setFocusPoint({ x, y });
    setAutofocus('off');
    setTimeout(() => setAutofocus('on'), 50);

    focusAnim.setValue(0);
    Animated.sequence([
      Animated.timing(focusAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(focusAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setFocusPoint(null);
    });
  };

  const handleCameraTap = (event: any) => {
    const { locationX, locationY } = event.nativeEvent;
    triggerRefocus(locationX, locationY);
  };

  const capturePhoto = async () => {
    if (!cameraRef.current || !activeProfile) return;
    setScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 1.0, // maximum quality
        base64: true,
        skipProcessing: false,
        exif: false,
      });

      if (!photo.base64) throw new Error('Failed to capture image');

      const result = await createScan(activeProfile.id, photo.base64);
      router.replace(`/results/${result.id}`);
    } catch (error: any) {
      if (error.response?.status === 400) {
        Alert.alert(
          'Image Unclear',
          'Please ensure the ingredients are in focus. Tap the screen to refocus before capturing.',
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
        <Ionicons name="camera-outline" size={64} color="#808080" />
        <Text style={styles.errorText}>Camera permission denied</Text>
        <Text style={styles.errorSubtext}>Please enable camera access in settings</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        facing="back"
        autofocus={autofocus}
        enableTorch={torch}
        zoom={0}
        selectedLens={Platform.OS === 'ios' ? 'builtInWideAngleCamera' : undefined}
        mode="picture"
        pictureSize={pictureSize}
        onCameraReady={onCameraReady}
      />
      <Pressable style={styles.overlay} onPress={handleCameraTap} testID="camera-tap-area">
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            testID="scanner-close-btn"
          >
            <Ionicons name="close" size={28} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.resolutionBadge}>
            <Ionicons name="videocam" size={14} color="#00d4ff" />
            <Text style={styles.resolutionText}>
              {pictureSize || (Platform.OS === 'ios' ? 'HD Wide' : 'Auto HD')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.iconButton, torch && styles.iconButtonActive]}
            onPress={() => setTorch(!torch)}
            testID="scanner-torch-btn"
          >
            <Ionicons name={torch ? 'flash' : 'flash-off'} size={24} color={torch ? '#ffaa00' : '#ffffff'} />
          </TouchableOpacity>
        </View>

        <View style={styles.scanFrame} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>

        {focusPoint && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.focusIndicator,
              {
                left: focusPoint.x - 35,
                top: focusPoint.y - 35,
                opacity: focusAnim,
                transform: [
                  {
                    scale: focusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1.4, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.focusInner} />
          </Animated.View>
        )}

        <View style={styles.bottom}>
          <Text style={styles.instructionText}>
            HD camera active. Tap anywhere to refocus.
          </Text>

          <TouchableOpacity
            style={[styles.captureButton, scanning && styles.captureButtonDisabled]}
            onPress={capturePhoto}
            disabled={scanning}
            testID="scanner-capture-btn"
          >
            <View style={styles.captureButtonInner}>
              {scanning ? (
                <ActivityIndicator color="#000000" />
              ) : (
                <Ionicons name="camera" size={32} color="#000000" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      </Pressable>
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
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(255, 170, 0, 0.2)',
    borderWidth: 1,
    borderColor: '#ffaa00',
  },
  resolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  resolutionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00d4ff',
  },
  scanFrame: {
    flex: 1,
    marginHorizontal: 40,
    marginVertical: 40,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#00d4ff',
  },
  cornerTopLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  cornerTopRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  cornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  cornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  focusIndicator: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#ffaa00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffaa00',
  },
  bottom: {
    alignItems: 'center',
    paddingBottom: 60,
    paddingHorizontal: 24,
    gap: 24,
  },
  instructionText: {
    fontSize: 13,
    color: '#ffffff',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    lineHeight: 20,
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
