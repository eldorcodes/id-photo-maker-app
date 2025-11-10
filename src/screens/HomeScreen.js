import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import SizePicker from '../components/SizePicker';
import { SIZE_CATALOG } from '../utils/sizes';
import { fetchSizes } from '../utils/api';
import AdBanner from '../ads/AdBanner';

export default function HomeScreen({ navigation }) {
  const [sizes, setSizes] = useState(SIZE_CATALOG);
  const [selected, setSelected] = useState('US:passport');

  useEffect(() => {
    (async () => {
      try {
        const { sizes: s } = await fetchSizes();
        if (s) setSizes(s);
      } catch {
        // fallback to local catalog
      }
    })();
  }, []);

  const selectedSize = useMemo(() => sizes?.[selected], [sizes, selected]);

  // ✅ unified picker function (fixed for iOS 17+)
  const goToEditWith = async (source) => {
    try {
      const isCamera = source === 'camera';
      const { status } = isCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          `Please allow ${isCamera ? 'camera' : 'photo library'} access to continue.`
        );
        return;
      }

      const result = isCamera
        ? await ImagePicker.launchCameraAsync({ quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 1,
            presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN, // ✅ critical iOS fix
          });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];

      // ✅ Delay navigation to prevent iOS white-screen crash
      setTimeout(() => {
        navigation.navigate('Edit', { asset, selectedKey: selected, size: selectedSize });
      }, 300);
    } catch (error) {
      console.error('ImagePicker error:', error);
      Alert.alert('Error', 'Unable to open or select an image.');
    }
  };

  const Header = (
    <View style={styles.headerWrap}>
      <Text style={styles.h1}>All-in-One ID Photo Maker</Text>
      <Text style={styles.sub}>
        Pick a document type, take or import a photo, and export a print-ready image.
      </Text>
      <View style={styles.metaRow}>
        <View style={styles.dot} />
        <Text style={styles.meta}>Popular Sizes</Text>
      </View>
    </View>
  );

  const Footer = (
    <View style={styles.footerWrap}>
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.btn, styles.primary]}
          onPress={() => goToEditWith('camera')}
        >
          <Ionicons name="camera" size={18} color="#fff" style={styles.btnIcon} />
          <Text style={styles.primaryText}>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.secondary]}
          onPress={() => goToEditWith('library')}
        >
          <Ionicons name="image" size={18} color="#2563eb" style={styles.btnIcon} />
          <Text style={styles.secondaryText}>Import</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tipCard}>
        <Ionicons
          name="information-circle"
          size={18}
          color="#64748b"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.tipText}>
          For best results, stand against a plain wall with even lighting.
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <SizePicker
          sizes={sizes}
          onSelect={setSelected}
          selectedKey={selected}
          header={Header}
          footer={Footer}
        />
      </View>

      {/* ✅ Ad banner always visible */}
      <AdBanner placement="home_bottom" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
    paddingTop: Platform.select({ ios: 10, android: 14 }),
  },

  // Header
  headerWrap: { marginBottom: 10 },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    color: '#0f172a',
    letterSpacing: -0.3,
  },
  sub: { marginTop: 6, color: '#6b7280', fontSize: 15, lineHeight: 20 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#2563eb', marginRight: 8 },
  meta: { fontWeight: '700', color: '#111827', fontSize: 15 },

  // Footer
  footerWrap: { marginTop: 20 },
  actionsRow: { flexDirection: 'row', gap: 14 },

  // Buttons
  btn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  btnIcon: { marginRight: 8 },
  primary: {
    backgroundColor: '#2563eb',
    shadowColor: '#2563eb',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },
  secondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  secondaryText: { color: '#2563eb', fontWeight: '800', fontSize: 15, letterSpacing: 0.3 },

  // Tip card
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  tipText: { color: '#475569', flex: 1, fontSize: 14, lineHeight: 20 },
});