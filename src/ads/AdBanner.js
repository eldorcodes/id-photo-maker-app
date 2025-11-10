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
    // ✅ Primary source of ad IDs from app.config.js -> extra.*
    const extra = Constants?.expoConfig?.extra ?? {};

    const pick = (v) => (typeof v === 'string' ? v.trim() : '');

    const iosUnitRaw =
      extra?.admobBannerIos ??
      process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS ??
      process.env.ADMOB_BANNER_ID_IOS ??
      '';

    const androidUnitRaw =
      extra?.admobBannerAndroid ??
      process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID ??
      process.env.ADMOB_BANNER_ID_ANDROID ??
      '';

    const iosUnit = pick(iosUnitRaw);
    const androidUnit = pick(androidUnitRaw);

    const resolvedUnit =
      Platform.OS === 'ios'
        ? iosUnit || TestIds.BANNER
        : androidUnit || TestIds.BANNER;

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
  style={[
    styles.container,
    containerStyle,
    {
      backgroundColor: '#fff',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: '#ddd',
      paddingBottom: Platform.OS === 'android' ? 20 : 0, // keeps it above tab bar
      alignItems: 'center',
      justifyContent: 'center',
    },
  ]}
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
  container: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
});