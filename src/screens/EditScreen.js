// src/screens/EditScreen.js
import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, TouchableOpacity,
  ActivityIndicator, Alert, Image, Platform,
} from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { bgReplaceWhite, bgReplaceColor } from '../utils/api';
import LottieView from 'lottie-react-native';

const { width: SCREEN_W } = Dimensions.get('window');

export default function EditScreen({ route, navigation }) {
  const { asset, size, selectedKey } = route.params || {};
  const [working, setWorking] = useState(false);

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
  const frameH = frameW / aspect;

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
    }
  };

  // Replace background → blue (e.g. #2D6AE3)
  const onBackgroundBlue = async () => {
    try {
      setWorking(true);
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
    }
  };

  // Continue → go to Export
  const onNext = async () => {
    try {
      setWorking(true);
      let b64 = processed.base64 ?? (await ensurePngBase64());

      // Ensure we have a flattened background before export
      if (!processed.bakedWhite && !processed.bgColor) {
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
        bgColor: processed.bgColor || '#ffffff',
      });
    } catch (e) {
      console.warn(e);
      Alert.alert('Continue', 'Could not prepare the photo. Please try again.');
    } finally {
      setWorking(false);
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

      <View style={[styles.frame, { width: frameW, height: frameH }]}>
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
        <ToolbarButton label="Background → Blue" onPress={onBackgroundBlue} disabled={working} variant="secondary" />
        <ToolbarButton label="Next" onPress={onNext} disabled={working} variant="outline" />
      </View>

      <Text style={styles.note}>
        We permanently replace the background with the selected color (your face stays untouched).
      </Text>

      {working && (
  <View style={styles.loading}>
    <LottieView
      source={require('../../assets/loading.json')}
      autoPlay
      loop
      style={{ width: 80, height: 80 }}
    />
    <Text style={{ marginTop: 8, color: '#334155', fontWeight: '600' }}>
      Processing…
    </Text>
  </View>
)}
    </View>
  );
}

function ToolbarButton({ label, onPress, disabled, variant }) {
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
      <Text
        style={[
          styles.btnTextBase,
          (variant === 'outline' || variant === 'ghost') && styles.btnTextDark,
        ]}
        numberOfLines={1}
      >
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

  /* Buttons */
  btnBase: {
    flexGrow: 1,
    flexBasis: '48%',
    paddingVertical: 14,
    borderRadius: 14,                // rounder
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',             // soft shadow
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  btnTextBase: {
    color: '#fff',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  btnTextDark: { color: '#0f172a' },

  // Primary (blue)
  btnPrimary: {
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#1e55c8',
  },

  // Secondary (pale blue outline)
  btnSecondary: {
    backgroundColor: '#eaf2ff',
    borderWidth: 1,
    borderColor: '#60a5fa',
  },

  // Outline (white with blue border)
  btnOutline: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },

  // Ghost (subtle gray)
  btnGhost: {
    backgroundColor: '#f5f7fb',
    borderWidth: 1,
    borderColor: '#e6eaf2',
  },

  // Disabled state
  btnDisabled: {
    opacity: 0.55,
  },

  note: {
    marginTop: 10,
    color: '#475569',
    lineHeight: 20,
  },

  loading: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20,
    alignItems: 'center',
  },
});