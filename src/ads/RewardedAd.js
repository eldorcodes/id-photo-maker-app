// src/ads/RewardedAd.js
import { Platform } from 'react-native';
import {
  RewardedAd,
  RewardedAdEventType,
  AdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';
import Constants from 'expo-constants';

// ✅ Pull IDs from app.config.js → extra
const extra = Constants?.expoConfig?.extra ?? {};
const adUnitId =
  Platform.OS === 'ios'
    ? extra.admobRewardedIos
    : extra.admobRewardedAndroid;

// ✅ Use test ID in development
const rewardedId = __DEV__ ? TestIds.REWARDED : adUnitId;

// ✅ Create ad instance
const rewarded = RewardedAd.createForAdRequest(rewardedId, {
  requestNonPersonalizedAdsOnly: true,
});

let isLoaded = false;

// ---------- EVENT LISTENERS ----------
rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
  isLoaded = true;
  console.log('✅ Rewarded ad loaded');
});

rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
  console.log('🎁 Reward earned:', reward);
});

rewarded.addAdEventListener(AdEventType.ERROR, (err) => {
  console.warn('❌ Rewarded ad error:', err);
  isLoaded = false;
});

// ---------- INITIAL PRELOAD ----------
rewarded.load();

// ---------- PRELOAD FUNCTION (for App.js) ----------
export const preloadRewarded = () => {
  try {
    console.log('📦 Preloading rewarded...');
    rewarded.load();
  } catch (err) {
    console.warn('preloadRewarded error:', err);
  }
};

// ---------- SHOW FUNCTION ----------
export const showRewardedAd = (onRewardEarned) => {
  if (isLoaded) {
    console.log('🎬 Showing rewarded ad...');
    rewarded.show();
    isLoaded = false;

    const rewardListener = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        if (onRewardEarned) onRewardEarned(reward);
      }
    );

    // Cleanup after a short delay
    setTimeout(() => rewardListener(), 10000);
  } else {
    console.log('⚠️ Rewarded ad not ready yet, reloading...');
    rewarded.load();
  }
};