import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/src/store';
import { createScan } from '@/src/services/api';

/**
 * Web Camera component using getUserMedia with explicit deviceId selection
 * to avoid the ultra-wide lens that some browsers default to on multi-cam phones.
 *
 * Workflow:
 *  1. Bootstrap stream (any back-facing camera) to unlock device labels.
 *  2. enumerateDevices() → filter videoinput → pick the standard 1x rear camera,
 *     explicitly avoiding labels containing "ultrawide" / "ultra-wide" / "ultra wide".
 *  3. Seamlessly restart the stream with deviceId: { exact: selectedDeviceId }.
 */
export default function WebCameraScanner() {
  const router = useRouter();
  const { activeProfile } = useStore();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resolution, setResolution] = useState<string>('');
  const [activeDeviceLabel, setActiveDeviceLabel] = useState<string>('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    initializeCamera();
    return () => {
      stopCamera();
    };
  }, []);

  /**
   * Pick the best rear camera from a device list.
   * Excludes ultra-wide / telephoto, prefers labels with "back"/"rear"/"environment".
   */
  const pickStandardRearCamera = (devices: MediaDeviceInfo[]): MediaDeviceInfo | null => {
    const videoInputs = devices.filter((d) => d.kind === 'videoinput');
    if (videoInputs.length === 0) return null;

    const isUltraWide = (label: string) => {
      const lower = label.toLowerCase();
      return (
        lower.includes('ultrawide') ||
        lower.includes('ultra-wide') ||
        lower.includes('ultra wide') ||
        lower.includes('wide angle 0.5') ||
        lower.includes('0.5x')
      );
    };
    const isTelephoto = (label: string) => {
      const lower = label.toLowerCase();
      return lower.includes('telephoto') || lower.includes('zoom');
    };
    const isFront = (label: string) => {
      const lower = label.toLowerCase();
      return lower.includes('front') || lower.includes('user') || lower.includes('selfie');
    };
    const isRear = (label: string) => {
      const lower = label.toLowerCase();
      return lower.includes('back') || lower.includes('rear') || lower.includes('environment');
    };

    // Filter out ultra-wide, telephoto, and front-facing
    const eligible = videoInputs.filter(
      (d) => !isUltraWide(d.label) && !isTelephoto(d.label) && !isFront(d.label),
    );

    if (eligible.length === 0) {
      // If everything got filtered (labels missing/anomalous), at least drop ultra-wide & front
      return (
        videoInputs.find((d) => !isUltraWide(d.label) && !isFront(d.label)) ||
        videoInputs[0]
      );
    }

    // Prefer cameras explicitly tagged as rear
    const explicitRear = eligible.find((d) => isRear(d.label));
    if (explicitRear) return explicitRear;

    // Otherwise the first eligible camera (browsers commonly list the main rear first)
    return eligible[0];
  };

  /**
   * Open a stream with given constraints + sensible defaults.
   */
  const openStream = async (
    deviceId?: string,
    useAdvanced: boolean = true,
  ): Promise<MediaStream> => {
    const baseVideo: any = {
      width: { ideal: 1920, max: 3840 },
      height: { ideal: 1080, max: 2160 },
    };

    if (deviceId) {
      baseVideo.deviceId = { exact: deviceId };
    } else {
      baseVideo.facingMode = { ideal: 'environment' };
    }

    if (useAdvanced) {
      baseVideo.advanced = [
        { focusMode: 'continuous' },
        { whiteBalanceMode: 'continuous' },
        { exposureMode: 'continuous' },
      ];
    }

    try {
      return await navigator.mediaDevices.getUserMedia({ video: baseVideo, audio: false });
    } catch (advErr) {
      // Retry without advanced constraints on browsers that reject them
      if (useAdvanced) {
        const fallbackVideo = { ...baseVideo };
        delete fallbackVideo.advanced;
        return await navigator.mediaDevices.getUserMedia({ video: fallbackVideo, audio: false });
      }
      throw advErr;
    }
  };

  /**
   * Attach a stream to the <video> element and read back its capabilities.
   */
  const attachStream = async (stream: MediaStream, deviceLabel?: string) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => {});
    }

    const track = stream.getVideoTracks()[0];
    const settings = track.getSettings();
    setResolution(`${settings.width || '?'}x${settings.height || '?'}`);
    setActiveDeviceLabel(deviceLabel || track.label || '');

    // Apply continuous AF / WB / exposure if hardware supports it
    const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
    const constraintsToApply: any[] = [];
    if (capabilities.focusMode?.includes('continuous')) {
      constraintsToApply.push({ focusMode: 'continuous' });
    }
    if (capabilities.whiteBalanceMode?.includes('continuous')) {
      constraintsToApply.push({ whiteBalanceMode: 'continuous' });
    }
    if (capabilities.exposureMode?.includes('continuous')) {
      constraintsToApply.push({ exposureMode: 'continuous' });
    }
    if (constraintsToApply.length) {
      try {
        await track.applyConstraints({ advanced: constraintsToApply });
      } catch (e) {
        console.warn('applyConstraints failed:', e);
      }
    }
    setTorchSupported(!!capabilities.torch);
  };

  /**
   * Stop currently active stream (without clearing the ref entirely).
   */
  const stopActiveStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const stopCamera = () => {
    stopActiveStream();
  };

  /**
   * Full initialization: bootstrap stream → enumerate → pick best rear cam → restart.
   */
  const initializeCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera API not supported on this browser.');
        return;
      }

      // 1) Bootstrap: any rear camera, just so labels become readable.
      const bootstrapStream = await openStream(undefined, true);
      await attachStream(bootstrapStream);

      // 2) Enumerate now that we have permission (labels populated).
      let devices: MediaDeviceInfo[] = [];
      try {
        devices = await navigator.mediaDevices.enumerateDevices();
      } catch (e) {
        console.warn('enumerateDevices failed:', e);
      }

      const target = pickStandardRearCamera(devices);
      const currentDeviceId = bootstrapStream.getVideoTracks()[0]?.getSettings().deviceId;

      // 3) If we found a better-suited rear camera, seamlessly swap.
      if (target && target.deviceId && target.deviceId !== currentDeviceId) {
        console.log('Switching to standard rear camera:', target.label);
        stopActiveStream();
        const finalStream = await openStream(target.deviceId, true);
        await attachStream(finalStream, target.label);
      } else if (target?.label) {
        // No swap needed but update label
        setActiveDeviceLabel(target.label);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      setError(err.message || 'Failed to access camera. Please grant camera permission.');
    }
  };

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await track.applyConstraints({
        advanced: [{ torch: !torch } as any],
      });
      setTorch(!torch);
    } catch (e) {
      console.warn('Torch not supported:', e);
    }
  };

  const tapToFocus = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
    if (capabilities.focusMode?.includes('single-shot')) {
      try {
        await track.applyConstraints({ advanced: [{ focusMode: 'single-shot' } as any] });
        setTimeout(() => {
          track
            .applyConstraints({ advanced: [{ focusMode: 'continuous' } as any] })
            .catch(() => {});
        }, 100);
      } catch (err) {
        console.warn('Focus refresh failed:', err);
      }
    }
  };

  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current || !activeProfile) return;
    if (!streamRef.current) {
      Alert.alert('Error', 'Camera not initialized');
      return;
    }

    setScanning(true);
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get canvas context');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      const base64 = dataUrl.split(',')[1];

      const result = await createScan(activeProfile.id, base64);
      router.replace(`/results/${result.id}`);
    } catch (err: any) {
      if (err.response?.status === 400) {
        Alert.alert(
          'Image Unclear',
          'Please ensure the ingredients are in focus. Tap the screen to refocus before capturing.',
        );
      } else {
        Alert.alert('Error', err.response?.data?.detail || err.message || 'Failed to scan');
      }
    } finally {
      setScanning(false);
    }
  };

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="camera-outline" size={64} color="#808080" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeCamera}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HTML video + canvas rendered via React Native Web */}
      <div
        // @ts-ignore React Native Web supports raw dom in web build
        style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
        onClick={tapToFocus as any}
      >
        <video
          ref={videoRef as any}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
        <canvas ref={canvasRef as any} style={{ display: 'none' }} />
      </div>

      <View style={styles.overlay} pointerEvents="box-none">
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
            <Text style={styles.resolutionText}>{resolution || 'Loading...'}</Text>
          </View>
          {torchSupported ? (
            <TouchableOpacity
              style={[styles.iconButton, torch && styles.iconButtonActive]}
              onPress={toggleTorch}
              testID="scanner-torch-btn"
            >
              <Ionicons
                name={torch ? 'flash' : 'flash-off'}
                size={24}
                color={torch ? '#ffaa00' : '#ffffff'}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        {!!activeDeviceLabel && (
          <View style={styles.lensBadge} pointerEvents="none">
            <Text style={styles.lensText} numberOfLines={1}>
              {activeDeviceLabel.length > 40
                ? activeDeviceLabel.slice(0, 40) + '…'
                : activeDeviceLabel}
            </Text>
          </View>
        )}

        <View style={styles.scanFrame} pointerEvents="none">
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>

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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000000' },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  lensBadge: {
    alignSelf: 'center',
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  lensText: {
    fontSize: 11,
    color: '#a0a0a0',
    fontWeight: '500',
  },
  scanFrame: {
    flex: 1,
    marginHorizontal: 40,
    marginVertical: 20,
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
  },
  captureButton: { width: 80, height: 80 },
  captureButtonDisabled: { opacity: 0.5 },
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
    padding: 40,
  },
  errorText: {
    fontSize: 16,
    color: '#ffffff',
    marginTop: 24,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: '#00d4ff',
    borderRadius: 12,
  },
  retryText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
  },
});
