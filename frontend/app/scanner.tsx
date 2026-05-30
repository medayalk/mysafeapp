import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useStore } from '@/src/store';
import { createScan } from '@/src/services/api';

/**
 * Foolproof native camera capture screen.
 *
 *  - WEB  → invisible <input type="file" accept="image/*" capture="environment">
 *           which hands off to the device's native camera app (uses primary 1x lens,
 *           native AF, real macro, physical flash, etc.).
 *  - NATIVE → expo-image-picker.launchCameraAsync() which likewise opens the
 *             native camera UI on iOS / Android.
 *
 * After the user confirms the shot, we display "Analyzing Ingredients..." and
 * POST the raw base64 directly to /api/scan (Gemini Vision pipeline unchanged).
 */
export default function Scanner() {
  const router = useRouter();
  const { activeProfile } = useStore();
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ----- WEB: native camera via HTML5 file input -----
  const triggerWebCamera = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!activeProfile) {
      Alert.alert('No Profile', 'Please select an active profile first.');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUri(objectUrl);

    // FileReader → base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      await runAnalysis(base64);
      URL.revokeObjectURL(objectUrl);
    };
    reader.onerror = () => {
      Alert.alert('Error', 'Could not read the captured image.');
      setPreviewUri(null);
    };
    reader.readAsDataURL(file);

    // reset so user can pick the same file again later
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ----- NATIVE: native camera via expo-image-picker -----
  const triggerNativeCamera = async () => {
    if (!activeProfile) {
      Alert.alert('No Profile', 'Please select an active profile first.');
      return;
    }
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Camera permission required',
        'Please enable camera access in your device settings to scan ingredients.',
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1, // maximum quality for crisp ingredient text
      base64: true,
      exif: false,
      allowsEditing: false,
    });

    if (result.canceled) return;

    const asset = result.assets?.[0];
    if (!asset?.base64) {
      Alert.alert('Error', 'Could not capture image.');
      return;
    }
    setPreviewUri(asset.uri);
    await runAnalysis(asset.base64);
  };

  // ----- Shared: send to backend -----
  const runAnalysis = async (base64: string) => {
    if (!activeProfile) return;
    setAnalyzing(true);
    try {
      const result = await createScan(activeProfile.id, base64);
      router.replace(`/results/${result.id}`);
    } catch (err: any) {
      if (err.response?.status === 400) {
        Alert.alert(
          'Image Unclear',
          'The ingredients could not be read clearly. Please retake the photo with better lighting and focus.',
        );
      } else if (err.response?.status === 413) {
        Alert.alert('Image Too Large', 'Please try again with a slightly smaller photo.');
      } else {
        Alert.alert(
          'Scan failed',
          err.response?.data?.detail || err.message || 'Please try again.',
        );
      }
      setPreviewUri(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // ----- Primary "Scan Ingredients" handler (platform aware) -----
  const onScanPressed = () => {
    if (Platform.OS === 'web') {
      triggerWebCamera();
    } else {
      triggerNativeCamera();
    }
  };

  // Auto-launch when the screen mounts (matches the "tap and immediately camera opens" spec)
  useEffect(() => {
    if (Platform.OS !== 'web') {
      // small delay to let the layout mount cleanly
      const t = setTimeout(() => {
        triggerNativeCamera();
      }, 300);
      return () => clearTimeout(t);
    }
  }, []);

  // ----- Analyzing screen -----
  if (analyzing) {
    return (
      <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
        <View style={styles.analyzeWrap}>
          <View style={styles.spinnerHalo}>
            <ActivityIndicator size="large" color="#00d4ff" />
          </View>
          <Text style={styles.analyzeTitle}>Analyzing Ingredients...</Text>
          <Text style={styles.analyzeSub}>
            Gemini Vision is reading the label and our AI is scoring it for
            {' '}
            <Text style={{ color: '#00d4ff', fontWeight: '700' }}>{activeProfile?.name}</Text>.
          </Text>
          <View style={styles.steps}>
            <Step label="Extracting ingredient text" />
            <Step label="Categorising product" />
            <Step label="Applying safety rules" />
            <Step label="Calculating personal score" />
          </View>
        </View>
      </LinearGradient>
    );
  }

  // ----- Idle scan screen -----
  return (
    <LinearGradient colors={['#0a0a0a', '#1a1a2e']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Product</Text>
          {activeProfile ? (
            <Text style={styles.subtitle}>Scanning for: {activeProfile.name}</Text>
          ) : (
            <Text style={[styles.subtitle, { color: '#ffaa00' }]}>
              No active profile selected
            </Text>
          )}
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroIcon}>
            <Ionicons name="camera" size={48} color="#00d4ff" />
          </View>
          <Text style={styles.heroTitle}>Use your phone's camera</Text>
          <Text style={styles.heroText}>
            We'll open your native camera app so you get the sharp 1× lens, real
            autofocus, and the flash button — perfect for tiny ingredient text.
          </Text>
        </View>

        <View style={styles.tipsList}>
          <Tip text="Hold the label flat and well-lit" />
          <Tip text="Get close so text fills the frame" />
          <Tip text="Tap to focus before snapping" />
          <Tip text="Use flash in low-light conditions" />
        </View>

        {/* Hidden HTML5 file input — web only */}
        {Platform.OS === 'web' && (
          <input
            ref={fileInputRef as any}
            id="ingredient-camera-input"
            type="file"
            accept="image/*"
            // @ts-ignore – `capture` is a valid HTML attribute but not in React Native Web typings
            capture="environment"
            onChange={handleFileChange as any}
            style={{
              position: 'absolute',
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
            }}
          />
        )}

        <TouchableOpacity
          style={[styles.primaryButton, !activeProfile && styles.primaryButtonDisabled]}
          onPress={onScanPressed}
          disabled={!activeProfile}
          testID="scan-ingredients-btn"
        >
          <Ionicons name="scan" size={24} color="#000000" />
          <Text style={styles.primaryButtonText}>Scan Ingredients</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.back()}
          testID="scanner-cancel-btn"
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </TouchableOpacity>

        {previewUri && (
          <View style={styles.previewWrap}>
            <Text style={styles.previewLabel}>Last capture preview</Text>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const Step = ({ label }: { label: string }) => (
  <View style={styles.stepRow}>
    <View style={styles.stepDot} />
    <Text style={styles.stepText}>{label}</Text>
  </View>
);

const Tip = ({ text }: { text: string }) => (
  <View style={styles.tipRow}>
    <Ionicons name="checkmark-circle" size={18} color="#00d4ff" />
    <Text style={styles.tipText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24, paddingTop: 60, gap: 24, paddingBottom: 40 },
  header: { alignItems: 'center', gap: 6 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#ffffff' },
  subtitle: { fontSize: 14, color: '#808080' },

  heroCard: {
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
    borderColor: 'rgba(0, 212, 255, 0.25)',
    borderWidth: 1,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  heroIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  heroTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff' },
  heroText: {
    fontSize: 13,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
  },

  tipsList: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipText: { fontSize: 14, color: '#cccccc' },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#00d4ff',
    paddingVertical: 18,
    borderRadius: 14,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { fontSize: 18, fontWeight: 'bold', color: '#000000' },

  secondaryButton: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  secondaryButtonText: { fontSize: 16, color: '#ffffff', fontWeight: '600' },

  previewWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  previewLabel: { color: '#808080', fontSize: 12 },

  // Analyzing screen
  analyzeWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  spinnerHalo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    borderWidth: 2,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  analyzeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  analyzeSub: {
    fontSize: 14,
    color: '#a0a0a0',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  steps: {
    gap: 12,
    marginTop: 12,
    alignSelf: 'stretch',
    paddingHorizontal: 24,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00d4ff',
  },
  stepText: { fontSize: 14, color: '#cccccc' },
});
