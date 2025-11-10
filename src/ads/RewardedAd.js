// src/components/ads/RewardedAdComponent.js
import { Platform } from "react-native";
import { RewardedAd, RewardedAdEventType, AdEventType } from "react-native-google-mobile-ads";
import Constants from "expo-constants";

// ✅ Pull IDs from app.config.js → extra
const extra = Constants?.expoConfig?.extra ?? {};
const adUnitId =
  Platform.OS === "ios" ? extra.admobRewardedIos : extra.admobRewardedAndroid;

// ✅ Use test ID in development
const rewardedId = __DEV__
  ? "ca-app-pub-3940256099942544/5224354917"
  : adUnitId;

// ✅ Create ad instance
const rewarded = RewardedAd.createForAdRequest(rewardedId, {
  requestNonPersonalizedAdsOnly: true,
});

let isLoaded = false;

// ---------- EVENT LISTENERS ----------
rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
  isLoaded = true;
  console.log("✅ Rewarded ad loaded");
});

rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, (reward) => {
  console.log("🎁 Reward earned:", reward);
});

rewarded.addAdEventListener(AdEventType.ERROR, (err) => {
  console.warn("❌ Rewarded ad error:", err);
  isLoaded = false;
});

rewarded.load();

// ---------- SHOW FUNCTION ----------
export const showRewardedAd = (onRewardEarned) => {
  if (isLoaded) {
    console.log("🎬 Showing rewarded ad...");
    rewarded.show();
    isLoaded = false;

    const rewardListener = rewarded.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      (reward) => {
        onRewardEarned?.(reward);
      }
    );

    // Clean up listener after 10 seconds
    setTimeout(() => rewardListener(), 10000);
  } else {
    console.log("⚠️ Rewarded ad not ready yet, reloading...");
    rewarded.load();
  }
};