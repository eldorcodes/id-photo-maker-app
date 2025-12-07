import 'dotenv/config';

export default {
  expo: {
    name: "ID Photo Maker",
    slug: "id-photo-maker",
    version: "1.3.5",
    scheme: "idphoto",
    orientation: "portrait",
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    experiments: {
      newArchEnabled: false,
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.studybridge.idphoto",
      buildNumber: "38",
      config: {
        googleMobileAdsAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS,
      },
      infoPlist: {
        CFBundleDisplayName: "ID Photo Maker",
        NSCameraUsageDescription:
          "This app requires access to your camera to take ID photos.",
        NSPhotoLibraryUsageDescription:
          "This app requires access to your photo library to select ID photos.",
        NSPhotoLibraryAddUsageDescription:
          "This app requires access to save processed ID photos to your photo library.",
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      package: "com.studybridge.idphoto",
      versionCode: 38,
    
      // ✅ REQUIRED: Google AdMob App ID
      config: {
        googleMobileAdsAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID,
      },
    
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
    
      permissions: ["CAMERA", "READ_MEDIA_IMAGES", "READ_EXTERNAL_STORAGE"],
    
      // ✅ REQUIRED: Fix Play Store 16KB memory page error
      ndkVersion: "26.1.10909125",
    
      // ✅ Makes Expo include correct ABIs for new ARMv9 devices
      enableDangerousExperimentalLeanBuilds: true,
    
      // ⛔️ DO NOT QUOTE KEYS (you incorrectly quoted them earlier)
    },

    web: {
      bundler: "metro",
      favicon: "./assets/favicon.png",
    },

    extra: {
      apiBase: process.env.EXPO_PUBLIC_API_URL,

      // --- AdMob Units ---
      admobAppIdAndroid: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID,
      admobAppIdIos: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS,

      admobBannerAndroid: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID,
      admobBannerIos: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS,

      admobInterstitialAndroid:
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID,
      admobInterstitialIos:
        process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS,

      admobRewardedAndroid:
        process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID,
      admobRewardedIos: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS,

      eas: {
        projectId: "d8c31e49-fb55-4ea6-9d80-56a0dee1442a",
      },
    },

    runtimeVersion: "1.1.1",
    updates: {
      url: "https://u.expo.dev/d8c31e49-fb55-4ea6-9d80-56a0dee1442a",
    },

    plugins: [
      [
        "react-native-google-mobile-ads",
        {
          iosAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_IOS,
          androidAppId: process.env.EXPO_PUBLIC_ADMOB_APP_ID_ANDROID,
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission:
            "The app accesses your photos to let you share them with your friends.",
        },
      ],
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
          },
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "35.0.0", // ✅ this forces the correct API level
            kotlinVersion: "2.0.21",
            gradlePluginVersion: "8.5.2",
          },
        },
      ],
    ],
  },
};