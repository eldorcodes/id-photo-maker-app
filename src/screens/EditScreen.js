// src/screens/EditScreen.js
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  Alert, Image, Platform,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { bgReplaceWhite, bgReplaceColor } from '../utils/api';
import LottieView from 'lottie-react-native';
import { showInterstitialAd } from '../ads/InterstitialAd';
import { showRewardedAd } from '../ads/RewardedAd';
import AdBanner from '../ads/AdBanner';


const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function EditScreen({ route, navigation }) {
  const { asset, size, selectedKey } = route.params || {};
  const isDV = selectedKey === 'dv';

  const [working, setWorking] = useState(false);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);

  /** ───────────────── helpers: progress + timeout ───────────────── */
  const beginProgress = (ceiling = 95, intervalMs = 120) => {
    setProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= ceiling) return p;
        const step = Math.max(1, Math.round((100 - p) / 20));
        return Math.min(ceiling, p + step);
      });
    }, intervalMs);
  };

  const endProgress = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgress(100);
    setTimeout(() => setProgress(0), 500);
  };

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Promise.race timeout wrapper
  const withTimeout = async (promise, ms = 20000) =>
    Promise.race([
      promise,
      new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
    ]);

  /** ───────────────── image state ───────────────── */
  const [processed, setProcessed] = useState({
    uri: asset?.uri ?? null,
    base64: asset?.base64 ?? null,
    bakedWhite: false,
    bgColor: '#ffffff',
  });

  const aspect = useMemo(() => {
    const a = (size?.mm?.w || 35) / (size?.mm?.h || 45);
    return a;
  }, [size]);

  const frameW = SCREEN_W - 24;
  const rawH = frameW / Math.max(0.4, Math.min(2, aspect));
  const frameH = Math.min(rawH, SCREEN_H * 0.48);

  /** Ensure PNG base64 (lossless) from current processed image */
  const ensurePngBase64 = async () => {
    if (processed.base64) return processed.base64;
    const out = await ImageManipulator.manipulateAsync(
      processed.uri,
      [],
      { base64: true, compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );
    return out.base64;
  };

  const setFromBase64 = (b64, bakedWhite = false, bgColor = processed.bgColor) => {
    setProcessed({
      uri: `data:image/png;base64,${b64}`,
      base64: b64,
      bakedWhite,
      bgColor,
    });
  };

  /** ───────────────── size guard (pre-network) ─────────────────
   * Keep request payload under ~4 MB to avoid Cloud Run / AI timeouts.
   * Strategy: re-encode as JPEG with step-down quality until small enough.
   * (Server returns PNG; no visual issue for cutout.)
   */
  const bytesFromBase64 = (b64) => Math.floor((b64.length * 3) / 4);
  const mbFromBase64 = (b64) => bytesFromBase64(b64) / (1024 * 1024);

  const ensureSizedBase64 = async (maxMB = 4) => {
    // start from PNG or existing base64
    let b64 = processed.base64 ?? (await ensurePngBase64());
    let mb = mbFromBase64(b64);

    if (mb <= maxMB) return b64;

    // Re-encode with quality steps: 0.85, 0.75, 0.65
    const qualities = [0.85, 0.75, 0.65, 0.55];
    for (const q of qualities) {
      const re = await ImageManipulator.manipulateAsync(
        `data:image/png;base64,${b64}`,
        [],
        { base64: true, compress: q, format: ImageManipulator.SaveFormat.JPEG }
      );
      b64 = re.base64 || b64;
      mb = mbFromBase64(b64);
      if (mb <= maxMB) break;
    }

    // If still huge, alert once but continue (API may still handle it)
    if (mb > maxMB) {
      console.log(`WARN: payload still large after compress (${mb.toFixed(2)} MB)`);
    }
    return b64;
  };

  /** ───────────────── actions ───────────────── */
  const onRotate = async () => {
    if (working) return;
    try {
      setWorking(true);
      beginProgress(85);
      const inputUri = processed.uri || `data:image/png;base64,${await ensurePngBase64()}`;
      const rotated = await ImageManipulator.manipulateAsync(
        inputUri,
        [{ rotate: 90 }],
        { compress: 1, format: ImageManipulator.SaveFormat.PNG, base64: true }
      );
      setProcessed({
        uri: rotated.uri,
        base64: rotated.base64,
        bakedWhite: false,
        bgColor: processed.bgColor,
      });
    } catch (e) {
      console.warn(e);
      Alert.alert('Rotate', 'Unable to rotate the photo.');
    } finally {
      endProgress();
      setWorking(false);
      maybeShowAd();
    }
  };

  // Background → White
  const onBackgroundWhite = async () => {
    if (working) return;
    try {
      setWorking(true);
      beginProgress(95);

      // shrink payload before network call
      const b64 = await ensureSizedBase64(4);

      const res = await withTimeout(bgReplaceWhite(b64), 20000);
      console.log('bg-res ←', { mode: res?.mode, len: res?.imageBase64?.length || 0, error: res?.error });
      if (!res?.imageBase64) throw new Error('Invalid bgReplaceWhite response');

      setProcessed({
        uri: `data:image/png;base64,${res.imageBase64}`,
        base64: res.imageBase64,
        bakedWhite: true,
        bgColor: '#ffffff',
      });
    } catch (e) {
      console.warn(e);
      const msg = e?.message === 'TIMEOUT'
        ? 'Network is slow right now. Please try again or switch networks.'
        : 'Could not replace the background automatically. Try a photo with a simpler background or better lighting.';
      Alert.alert('Background', msg);
    } finally {
      endProgress();
      setWorking(false);
      maybeShowAd();
    }
  };

  // Background → Blue (skipped for DV)
  const onBackgroundBlue = async () => {
    if (isDV) {
      Alert.alert('DV Lottery', 'DV Lottery requires a plain white background.');
      return;
    }
    if (working) return;
    try {
      setWorking(true);
      beginProgress(95);

      const hex = '#2D6AE3';
      const b64 = await ensureSizedBase64(4);

      const res = await withTimeout(bgReplaceColor(b64, hex), 20000);
      console.log('bg-blue ←', { mode: res?.mode, len: res?.imageBase64?.length || 0, error: res?.error });
      if (!res?.imageBase64) throw new Error('Invalid bgReplaceColor response');

      setProcessed({
        uri: `data:image/png;base64,${res.imageBase64}`,
        base64: res.imageBase64,
        bakedWhite: false,
        bgColor: hex,
      });
    } catch (e) {
      console.warn(e);
      const msg = e?.message === 'TIMEOUT'
        ? 'Network is slow right now. Please try again or switch networks.'
        : 'Could not replace the background automatically. Try a photo with a simpler background or better lighting.';
      Alert.alert('Background', msg);
    } finally {
      endProgress();
      setWorking(false);
      maybeShowAd();
    }
  };

  // Continue → Export
  const onNext = async () => {
    if (working) return;
    try {
      setWorking(true);
      beginProgress(90);
      let b64 = processed.base64 ?? (await ensurePngBase64());

      // Enforce white for DV or if background not set
      if (isDV || (!processed.bakedWhite && !processed.bgColor)) {
        try {
          const safeB64 = await ensureSizedBase64(4);
          const res = await withTimeout(bgReplaceWhite(safeB64), 20000);
          if (res?.imageBase64) {
            b64 = res.imageBase64;
            setFromBase64(b64, true, '#ffffff');
          } else {
            throw new Error('bgReplaceWhite failed');
          }
        } catch (e) {
          console.warn('bgReplaceWhite (pre-export) failed:', e);
          Alert.alert(
            'Background',
            'Could not auto-apply a white background due to network issues. Proceeding with your current image.'
          );
        }
      }

      // For preview, generate a JPEG; pass PNG b64 along for lossless export
      const tmp = await ImageManipulator.manipulateAsync(
        `data:image/png;base64,${b64}`,
        [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      navigation.navigate('Export', {
        image: { uri: tmp.uri, base64: b64 },
        size,
        selectedKey,
        bgColor: isDV ? '#ffffff' : (processed.bgColor || '#ffffff'),
      });
    } catch (e) {
      console.warn(e);
      Alert.alert('Continue', 'Could not prepare the photo. Please try again.');
    } finally {
      endProgress();
      setWorking(false);
      maybeShowAd();
    }
  };

  const title =
    selectedKey === 'us_passport'
      ? 'US Passport'
      : selectedKey === 'dv'
      ? 'US Green Card Lottery (DV)'
      : 'Edit Photo';

      // ───────────────────────────────
// Decide which ad to show randomly
// ───────────────────────────────
const maybeShowAd = () => {
  const r = Math.random();
  if (r < 0.5) {
    showInterstitialAd();
  } else {
    showRewardedAd();
  }
};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>

      <View style={[styles.frame, { width: frameW, height: frameH, backgroundColor: isDV ? '#ffffff' : 'transparent' }]}>
        {processed?.uri ? (
          <Image
            source={{ uri: processed.uri }}
            resizeMode="contain"
            style={styles.previewImage}
            onError={() => Alert.alert('Preview', 'Failed to render preview image.')}
          />
        ) : (
          <View style={styles.empty}><Text style={{ color: '#94a3b8' }}>No image</Text></View>
        )}
      </View>

      <View style={styles.actionsRow}>
        <ToolbarButton label="Rotate ⤾" onPress={onRotate} disabled={working} variant="ghost" />
        <ToolbarButton label="Background → White" onPress={onBackgroundWhite} disabled={working} variant="primary" />
        {!isDV && (
          <ToolbarButton label="Background → Blue" onPress={onBackgroundBlue} disabled={working} variant="secondary" />
        )}
        <ToolbarButton label="Next" onPress={onNext} disabled={working} variant="outline" />
      </View>

      <Text style={styles.note}>
        We permanently replace the background with the selected color (your face stays untouched).
      </Text>
      {isDV && (
        <Text style={[styles.note, { marginTop: 6, color: '#64748b' }]}>
          DV Lottery photos require a plain white background.
        </Text>
      )}

        {/* ✅ Add the banner here */}
    <View style={{ marginTop: 16, alignItems: 'center' }}>
      <AdBanner placement="edit" size="adaptive" />
    </View>

      {working && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <LottieView
              source={require('../../assets/loading.json')}
              autoPlay
              loop
              style={{ width: 80, height: 80 }}
            />
            <Text style={{ marginTop: 8, color: '#334155', fontWeight: '600' }}>
              Processing… {progress}%
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

/** UI: ToolbarButton */
function ToolbarButton({ label, onPress, disabled, variant }) {
  const textStyle =
    variant === 'secondary' ? styles.btnSecondaryText :
    variant === 'primary'   ? styles.btnPrimaryText   :
    variant === 'outline'   ? styles.btnOutlineText   :
    styles.btnGhostText;

  return (
    <TouchableOpacity
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.btnBase,
        variant === 'primary' && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'outline' && styles.btnOutline,
        variant === 'ghost' && styles.btnGhost,
        disabled && styles.btnDisabled,
      ]}
    >
      <Text style={[styles.btnTextBase, textStyle]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.select({ ios: 8, android: 8 }),
    paddingHorizontal: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eef2f7',
    alignSelf: 'center',
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%', backgroundColor: 'transparent' },
  empty: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  btnBase: {
    flexGrow: 1,
    flexBasis: '48%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextBase: { fontWeight: '800', letterSpacing: 0.2 },
  btnGhost: { backgroundColor: '#f5f7fb', borderWidth: 1, borderColor: '#e6eaf2' },
  btnGhostText: { color: '#0f172a' },
  btnPrimary: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#2563eb' },
  btnPrimaryText: { color: '#2563eb' },
  btnSecondary: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  btnSecondaryText: { color: '#fff' },
  btnOutline: { backgroundColor: '#ffffff', borderWidth: 1.5, borderColor: '#2563eb' },
  btnOutlineText: { color: '#0f172a' },
  btnDisabled: { opacity: 0.4 },
  note: { marginTop: 10, color: '#475569', lineHeight: 20, textAlign: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.2)',
    zIndex: 999,
  },
  loadingCard: {
    backgroundColor: '#fff',
    paddingVertical: 20,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e6eaf2',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});