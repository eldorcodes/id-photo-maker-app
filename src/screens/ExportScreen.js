// src/screens/ExportScreen.js
import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Constants from 'expo-constants';
import { composePdf, composeFinal } from '../utils/api';
import { exportFinalImage } from '../utils/exporter';
import { validateDvLottery, estimateEyeY } from '../utils/validators';

const isExpoGo = Constants?.appOwnership === 'expo';

function pxAtDpi(mm, dpi) {
  const inches = mm / 25.4;
  return Math.round(inches * dpi);
}

async function detectHeadBoxForDV(imageUri, target = 600) {
  if (isExpoGo) return null;
  let FaceDetector;
  try { FaceDetector = await import('expo-face-detector'); } catch { return null; }
  if (!FaceDetector?.detectFacesAsync) return null;

  try {
    const { faces } = await FaceDetector.detectFacesAsync(imageUri, {
      mode: FaceDetector.FaceDetectorMode?.fast ?? 1,
      detectLandmarks: FaceDetector.FaceDetectorLandmarks?.all ?? 2,
      runClassifications: FaceDetector.FaceDetectorClassifications?.none ?? 0,
    });
    if (!faces?.length) return null;
    const f = [...faces].sort((a,b)=>
      b.bounds.size.width*b.bounds.size.height - a.bounds.size.width*a.bounds.size.height
    )[0];
    const y = f.bounds.origin.y, h = f.bounds.size.height;
    const top = Math.max(0, Math.floor(y - 0.15 * h));
    const bottom = Math.min(target, Math.ceil(y + h + 0.20 * h));
    if (bottom - top < target * 0.2) return null;
    return { top, bottom };
  } catch { return null; }
}

export default function ExportScreen({ route }) {
  const { image, size, templateKey, headBox } = route.params;
  const [busy, setBusy] = useState(false);
  const dpi = 300;

  const isDV = useMemo(() => {
    if (templateKey && String(templateKey).toLowerCase() === 'us:dv-lottery') return true;
    return /green card lottery|dv/i.test(String(size?.label || ''));
  }, [templateKey, size]);

  // ---------- Single-image export ----------
  const exportPng = useCallback(async () => {
    setBusy(true);
    try {
      const cleanB64 = String(image.base64).replace(/^data:image\/\w+;base64,/, '');
      const path = FileSystem.cacheDirectory + `idphoto_${Date.now()}.png`;
      await FileSystem.writeAsStringAsync(path, cleanB64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'image/png', dialogTitle: 'Share ID Photo' });
      } else { Alert.alert('Saved', `Saved to ${path}`); }
    } catch (e) {
      Alert.alert('Export', e.message || 'Failed to export PNG.');
    } finally {
      setBusy(false);
    }
  }, [image]);

  const exportDvJpg = useCallback(async () => {
    setBusy(true);
    try {
      const finalW = size?.px?.digital?.default?.w || 600;
      const finalH = size?.px?.digital?.default?.h || 600;

      // keep cutout as before (PNG w/ alpha)
      const cut = await exportFinalImage({
        templateKey: 'US:dv-lottery',
        inputBase64: image.base64,
        desiredSize: { w: finalW, h: finalH },
        whiteBg: '#ffffff',
      });

      let hb;
      if (headBox?.top != null && headBox?.bottom != null) {
        hb = { top: Math.round(headBox.top), bottom: Math.round(headBox.bottom) };
      } else {
        hb = await detectHeadBoxForDV(`data:image/png;base64,${cut.base64}`, finalH);
      }

      let cmp;
      try {
        cmp = await composeFinal({
          templateKey: 'US:dv-lottery',
          imageBase64: cut.base64,
          width: finalW, height: finalH,
          bgColor: '#ffffff', format: 'jpg',
          ...(hb ? { autoAdjust: {
            headBox: hb,
            rules: { head_pct: { min: 0.50, max: 0.69 }, eyes_from_bottom_pct: { min: 0.56, max: 0.69 } },
          }} : {})
        });
        if (!cmp?.ok) throw new Error(cmp?.details || cmp?.error || 'compose returned not ok');
      } catch {
        const estTop = Math.round((finalH * (1 - 0.60)) / 2);
        const estBottom = estTop + Math.round(finalH * 0.60);
        const fallbackHead = { top: hb?.top ?? estTop, bottom: hb?.bottom ?? estBottom };
        const eyeLineY = estimateEyeY(fallbackHead.top, fallbackHead.bottom);
        const { valid } = validateDvLottery({
          finalWidth: finalW, finalHeight: finalH,
          headTop: fallbackHead.top, headBottom: fallbackHead.bottom, eyeLineY,
        });
        if (!valid) console.warn('Local DV check failed; proceeding fallback');

        cmp = await composeFinal({
          templateKey: 'US:dv-lottery',
          imageBase64: cut.base64,
          width: finalW, height: finalH,
          bgColor: '#ffffff', format: 'jpg',
        });
        if (!cmp?.ok) throw new Error(cmp?.details || cmp?.error || 'compose failed in fallback');
      }

      const path = FileSystem.cacheDirectory + `dv_photo_${cmp.width}x${cmp.height}.jpg`;
      await FileSystem.writeAsStringAsync(path, cmp.imageBase64, { encoding: FileSystem.EncodingType.Base64 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'image/jpeg', dialogTitle: 'Share DV Photo (JPEG)' });
      } else { Alert.alert('Saved', `Saved to ${path}`); }
    } catch (e) {
      console.error(e);
      Alert.alert('Export', e.message || 'Failed to export DV photo.');
    } finally {
      setBusy(false);
    }
  }, [image, size, headBox]);

  const onPressExport = useCallback(() => (isDV ? exportDvJpg() : exportPng()), [isDV, exportDvJpg, exportPng]);

  // ---------- NEW: Multi-copy PDF sheet exports ----------
  const makeItemsForSheet = useCallback(() => {
    // Use the current processed image as-is; server will tile/cut using mm sizes.
    const cleanB64 = String(image.base64).replace(/^data:image\/\w+;base64,/, '');
    // One logical “photo” item; server duplicates to fill.
    return [{ imageBase64: cleanB64, pxW: 0, pxH: 0, mmW: size?.mm?.w, mmH: size?.mm?.h }];
  }, [image, size]);

  const exportSheet = useCallback(async (sheetType) => {
    setBusy(true);
    try {
      // default sheet definitions (DPI handled by backend)
      const sheet =
        sheetType === 'A4'     ? { type: 'A4', dpi } :
        sheetType === 'Letter' ? { type: 'Letter', dpi } :
        { type: '4x6', dpi }; // fallback

      const payload = {
        items: makeItemsForSheet(),
        sheet,
        margins: { mm: 5 },
        cutGuides: true,
        fill: true,
      };

      const pdf = await composePdf(payload.items, sheet, payload.margins, payload.cutGuides, payload.fill);
      if (!pdf?.pdfBase64) throw new Error('compose-pdf failed');

      const path = FileSystem.cacheDirectory + `idphoto_sheet_${sheet.type}_${Date.now()}.pdf`;
      await FileSystem.writeAsStringAsync(path, pdf.pdfBase64, { encoding: FileSystem.EncodingType.Base64 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/pdf', dialogTitle: `Share ${sheet.type} sheet` });
      } else {
        Alert.alert('Saved', `Saved to ${path}`);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('PDF', e.message || 'Failed to create PDF sheet.');
    } finally {
      setBusy(false);
    }
  }, [makeItemsForSheet, dpi]);

  // ---------- UI ----------
  const pxW = useMemo(() => size?.px?.digital?.default?.w || size?.px?.print?.w || 0, [size]);
  const pxH = useMemo(() => size?.px?.digital?.default?.h || size?.px?.print?.h || 0, [size]);
  const label = useMemo(() => size?.label || 'ID Photo', [size]);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scroll} bounces>
        <Text style={styles.h1}>Ready to Export</Text>

        <View style={styles.card}>
          <Image
            source={{ uri: `data:image/*;base64,${String(image.base64).replace(/^data:image\/\w+;base64,/, '')}` }}
            style={styles.photo}
            resizeMode="contain"
          />
        </View>

        <Text style={styles.spec}>
          Will export: <Text style={styles.bold}>{isDV ? 'JPEG' : 'PNG'}</Text>
          {'  ·  '}
          <Text style={styles.bold}>{pxW}×{pxH} px</Text>
          {'  ·  '}
          <Text style={styles.bold}>{size?.mm?.w}×{size?.mm?.h} mm @ {dpi} DPI</Text>
        </Text>
        <Text style={styles.subtle}>Size: {label} ({size?.mm?.w}×{size?.mm?.h} mm @ {dpi} DPI)</Text>

        {/* Sheet export chips (PDF) */}
        {!isDV && (
          <>
            <Text style={[styles.subtle, { marginTop: 14 }]}>Or print multiple copies as a PDF:</Text>
            <View style={styles.chipsRow}>
              <TouchableOpacity style={styles.chip} onPress={() => exportSheet('4x6')}>
                <Text style={styles.chipText}>4×6 Print</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={() => exportSheet('A4')}>
                <Text style={styles.chipText}>A4 Sheet</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chip} onPress={() => exportSheet('Letter')}>
                <Text style={styles.chipText}>Letter</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{ height: 90 }} />
      </ScrollView>

      <View style={styles.stickyBar}>
        <TouchableOpacity
          style={[styles.primaryBtn, busy && { opacity: 0.6 }]}
          onPress={onPressExport}
          disabled={busy}
        >
          <Text style={styles.primaryText}>{busy ? 'Preparing…' : (isDV ? 'Export JPEG' : 'Export PNG')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  scroll: { padding: 16, paddingBottom: 0 },
  h1: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginBottom: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: 360 },

  spec: { marginTop: 14, color: '#111827', fontSize: 15 },
  bold: { fontWeight: '700' },
  subtle: { marginTop: 4, color: '#6b7280' },

  chipsRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  chip: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  chipText: { fontWeight: '600', color: '#111827' },

  stickyBar: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    padding: 16,
    paddingBottom: 24,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
  },
  primaryBtn: {
    backgroundColor: '#2563eb',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});