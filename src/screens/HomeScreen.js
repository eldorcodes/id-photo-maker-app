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
      <View style={[styles.adContainer,{marginBottom:Platform.OS === 'ios' ? 0 : 20}]}>
      <AdBanner placement="home" size="adaptive" disabled={false} />
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },

  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: Platform.select({ ios: 10, android: 16 }),
    paddingBottom:
      Platform.OS === 'android'
        ? 90 // ✅ prevents text from being covered by AdBanner + Android nav bar
        : 70, // iOS safe enough
  },

  // HEADER
  headerWrap: {
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  h1: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    color: '#0f172a',
    letterSpacing: -0.4,
  },
  sub: {
    marginTop: 8,
    color: '#64748b',
    fontSize: 15,
    lineHeight: 21,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2563eb',
    marginRight: 8,
  },
  meta: {
    fontWeight: '700',
    color: '#111827',
    fontSize: 15,
  },

  // FOOTER
  footerWrap: {
    marginTop: 28,
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 14,
  },

  // BUTTONS
  btn: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#2563eb',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  btnIcon: { marginRight: 8 },

  primary: {
    backgroundColor: '#2563eb',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 16,
  },

  secondary: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#2563eb',
  },
  secondaryText: {
    color: '#2563eb',
    fontWeight: '800',
    fontSize: 16,
  },

  // TIP CARD
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginTop: 18,
    borderRadius: 16,
    backgroundColor: '#eef2ff',
    borderWidth: 1,
    borderColor: '#d4dcff',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  tipText: {
    color: '#374151',
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  // Ad container stays pinned on bottom above nav bar
  adContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Platform.OS === 'android' ? 12 : 0,
    paddingTop: 4,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderColor: '#e5e7eb',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: -2 },
  },
});