// src/screens/EditScreen.js
import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
   ActivityIndicator, Alert, Image, Platform
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { bgReplaceWhite, bgReplaceColor } from '../utils/api';
import LottieView from 'lottie-react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

export default function EditScreen({ route, navigation }) {
  const { asset, size, selectedKey } = route.params || {};
  const isDV = selectedKey === 'dv';

  const [working, setWorking] = useState(false);

  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef(null);

  // Start a soft (simulated) progress that climbs toward a ceiling (e.g., 95%)
  const beginProgress = (ceiling = 95, intervalMs = 120) => {
    // reset
    setProgress(0);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    progressTimerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= ceiling) return p;
        // Ease-in step: smaller as we approach ceiling
        const step = Math.max(1, Math.round((100 - p) / 20));
        return Math.min(ceiling, p + step);
      });
    }, intervalMs);
  };

  // Snap to 100 and clear timer
  const endProgress = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setProgress(100);
    // Optional: reset to 0 after a short moment so next run starts fresh
    setTimeout(() => setProgress(0), 500);
  };

  // Safety: clear timer if screen unmounts
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // Preview state (always the latest baked/processed image)
  const [processed, setProcessed] = useState({
    uri: asset?.uri ?? null,
    base64: asset?.base64 ?? null,
    bakedWhite: false,         // legacy flag; we’ll also track bgColor explicitly
    bgColor: '#ffffff',        // track current background color for export
  });

  // Aspect & frame
  const aspect = useMemo(() => {
    const a = (size?.mm?.w || 35) / (size?.mm?.h || 45);
    return a;
  }, [size]);
  const frameW = SCREEN_W - 24;
  const rawH = frameW / Math.max(0.4, Math.min(2, aspect)); // guard against bad ratios
  const frameH = Math.min(rawH, SCREEN_H * 0.48);           // cap to ~48% of screen height

  useEffect(() => { console.log('Preset mm:', size?.mm); }, [size]);

  // Ensure PNG base64 for the server
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

  // Rotate (keeps PNG)
  const onRotate = async () => {
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
      setWorking(false);
      endProgress();
    }
  };

  // helper to ensure PNG base64
  const getBase64 = async () => {
    if (processed.base64) return processed.base64;
    const out = await ImageManipulator.manipulateAsync(
      processed.uri, [], { base64: true, compress: 1, format: ImageManipulator.SaveFormat.PNG }
    );
    return out.base64;
  };

  // Replace background → pure white
  const onBackgroundWhite = async () => {
    try {
      setWorking(true);
      beginProgress(95);
      const b64 = await getBase64();
      const res = await bgReplaceWhite(b64);
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
      Alert.alert('Background', 'Could not replace the background automatically. Try a photo with a simpler background or better lighting.');
    } finally {
      setWorking(false);
      endProgress();
    }
  };

  // Replace background → blue (e.g. #2D6AE3)
  const onBackgroundBlue = async () => {
    if (isDV) {
      Alert.alert('DV Lottery', 'DV Lottery requires a plain white background.');
      return;
    }
    try {
      setWorking(true);
      beginProgress(95);
      const b64 = await getBase64();
      const hex = '#2D6AE3';
      const res = await bgReplaceColor(b64, hex);
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
      Alert.alert('Background', 'Could not replace the background automatically. Try a photo with a simpler background or better lighting.');
    } finally {
      setWorking(false);
      endProgress();
    }
  };

  // Continue → go to Export
  const onNext = async () => {
    try {
      setWorking(true);
      beginProgress(90);
      let b64 = processed.base64 ?? (await ensurePngBase64());

      // Ensure we have a flattened background before export
      // DV: always enforce white background regardless of current state
      if (isDV || (!processed.bakedWhite && !processed.bgColor)) {
        const res = await bgReplaceWhite(b64);
        if (res?.imageBase64) {
          b64 = res.imageBase64;
          setFromBase64(b64, true, '#ffffff');
        } else {
          throw new Error('bgReplaceWhite failed');
        }
      }

      // Export as JPEG for the next screen preview if needed; we’ll pass original PNG b64 too
      const tmp = await ImageManipulator.manipulateAsync(
        `data:image/png;base64,${b64}`,
        [],
        { compress: 1, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      // Pass the chosen bgColor to ExportScreen
      navigation.navigate('Export', {
        image: { uri: tmp.uri, base64: b64 },  // keep PNG b64 for lossless
        size,
        selectedKey,
        bgColor: isDV ? '#ffffff' : (processed.bgColor || '#ffffff'),
      });
    } catch (e) {
      console.warn(e);
      Alert.alert('Continue', 'Could not prepare the photo. Please try again.');
    } finally {
      setWorking(false);
      endProgress();
    }
  };

  const title =
    selectedKey === 'us_passport'
      ? 'US Passport'
      : selectedKey === 'dv'
      ? 'US Green Card Lottery (DV)'
      : 'Edit Photo';

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

function ToolbarButton({ label, onPress, disabled, variant }) {
  const textStyle =
    variant === 'secondary' ? styles.btnSecondaryText :        // solid blue → white text
    variant === 'primary'   ? styles.btnPrimaryText   :        // white btn w/ blue border → blue text
    variant === 'outline'   ? styles.btnOutlineText   :        // white outline → dark text
    styles.btnGhostText;                                        // ghost → dark text

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

  /* Buttons row */
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },

  /* Base button */
  btnBase: {
    flexGrow: 1,
    flexBasis: '48%',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnTextBase: {
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Ghost (Rotate)
  btnGhost: {
    backgroundColor: '#f5f7fb',
    borderWidth: 1,
    borderColor: '#e6eaf2',
  },
  btnGhostText: { color: '#0f172a' },

  // Primary (Background → White)
  btnPrimary: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  btnPrimaryText: { color: '#2563eb' },

  // Secondary (Background → Blue)
  btnSecondary: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  btnSecondaryText: { color: '#fff' },

  // Outline (Next)
  btnOutline: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  btnOutlineText: { color: '#2563eb' },

  // Disabled state
  btnDisabled: {
    opacity: 0.4,
  },

  note: {
    marginTop: 10,
    color: '#475569',
    lineHeight: 20,
    textAlign: 'center',
  },

  loading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },

  // text base stays the same
  btnTextBase: {
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // text colors per variant
  btnPrimaryText:  { color: '#2563EB' }, // white button with blue border → blue text
  btnSecondaryText:{ color: '#FFFFFF' }, // solid blue button → white text
  btnOutlineText:  { color: '#0f172a' }, // outline → dark text
  btnGhostText:    { color: '#0f172a' }, // ghost → dark text
  loadingOverlay: {
  ...StyleSheet.absoluteFillObject,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(15,23,42,0.2)', // subtle dim
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