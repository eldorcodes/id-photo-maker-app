import { Platform } from 'react-native';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

// ✅ Dynamic ID from app.config.js -> extra
const extra = Constants?.expoConfig?.extra ?? {};
const adUnitId =
  Platform.OS === 'ios'
    ? extra.admobInterstitialIos
    : extra.admobInterstitialAndroid;

const interstitialId = __DEV__ ? TestIds.INTERSTITIAL : adUnitId;

// ✅ Create global interstitial
const interstitial = InterstitialAd.createForAdRequest(interstitialId, {
  requestNonPersonalizedAdsOnly: true,
});

let isLoaded = false;

// ✅ Listeners
interstitial.addAdEventListener(AdEventType.LOADED, () => {
  isLoaded = true;
  console.log('✅ Interstitial ad loaded');
});

interstitial.addAdEventListener(AdEventType.CLOSED, () => {
  console.log('🔁 Interstitial closed — reloading next');
  interstitial.load();
});

interstitial.addAdEventListener(AdEventType.ERROR, (err) => {
  console.warn('❌ Interstitial error:', err);
  isLoaded = false;
});

// ✅ First load
interstitial.load();

// 👇 Exported functions (so App.js can call them)
export const preloadInterstitial = () => {
  console.log('📦 Preloading interstitial...');
  try {
    interstitial.load();
  } catch (err) {
    console.warn('preloadInterstitial error:', err);
  }
};

export const showInterstitialAd = () => {
  if (isLoaded) {
    console.log('🎬 Showing interstitial ad...');
    interstitial.show();
    isLoaded = false;
  } else {
    console.log('⚠️ Interstitial not ready yet, loading again...');
    interstitial.load();
  }
};