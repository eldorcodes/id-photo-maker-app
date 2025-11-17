import React, { useMemo, useState } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';

export default function AdBanner({
  placement = 'default',
  size = 'adaptive',
  disabled = false,
  containerStyle,
}) {
  const [failCount, setFailCount] = useState(0);

  const { unitId, bannerSize } = useMemo(() => {
    // Load config from app.config.js extra
    const extra = Constants?.expoConfig?.extra ?? {};
   

    const pick = (v) => (typeof v === 'string' ? v.trim() : '');

    // ✅ Only use the env variables YOU actually have
    const iosUnitRaw =
      extra?.admobBannerIos ??
      process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS ??
      '';

      console.log("==== iOS Banner Unit ID =", iosUnitRaw);

    const androidUnitRaw =
      extra?.admobBannerAndroid ??
      process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID ??
      '';

      const iosUnit = extra?.admobBannerIos || TestIds.BANNER;
    const androidUnit = pick(androidUnitRaw);

    // If nothing found, fallback to test IDs
    const resolvedUnit =
      Platform.OS === 'ios'
        ? iosUnit || TestIds.BANNER
        : androidUnit || TestIds.BANNER;

    // Banner sizing
    let resolvedSize = BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
    switch (size) {
      case 'banner':
        resolvedSize = BannerAdSize.BANNER;
        break;
      case 'large':
        resolvedSize = BannerAdSize.LARGE_BANNER;
        break;
      case 'mediumRectangle':
        resolvedSize = BannerAdSize.MEDIUM_RECTANGLE;
        break;
      case 'full':
        resolvedSize = BannerAdSize.FULL_BANNER;
        break;
      case 'adaptive':
      default:
        resolvedSize = BannerAdSize.ANCHORED_ADAPTIVE_BANNER;
        break;
    }

    return { unitId: resolvedUnit, bannerSize: resolvedSize };
  }, [size]);

  if (disabled || failCount >= 3) return null;

  return (
    <View
      accessibilityLabel={`ad-banner-${placement}`}
      style={[styles.container, containerStyle]}
    >
      <BannerAd
        unitId={unitId}
        size={bannerSize}
        requestOptions={{ requestNonPersonalizedAdsOnly: false }}
        onAdLoaded={() => {
          if (__DEV__) console.log(`[AdBanner:${placement}] loaded`);
        }}
        onAdFailedToLoad={(err) => {
          if (__DEV__) console.warn(`[AdBanner:${placement}] failed:`, err);
          setFailCount((c) => c + 1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 70,               // ⭐ FIX: ensures banner space exists
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    backgroundColor: '#ffffff',
  },
});