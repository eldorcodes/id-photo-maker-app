export const AdUnitIds = {
  banner: {
    ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_IOS || 'ca-app-pub-3940256099942544/2934735716',
    android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ID_ANDROID || 'ca-app-pub-3940256099942544/6300978111'
  },
  interstitial: {
    ios: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_IOS || 'ca-app-pub-3940256099942544/4411468910',
    android: process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ID_ANDROID || 'ca-app-pub-3940256099942544/1033173712'
  },
  rewarded: {
    ios: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_IOS || 'ca-app-pub-3940256099942544/1712485313',
    android: process.env.EXPO_PUBLIC_ADMOB_REWARDED_ID_ANDROID || 'ca-app-pub-3940256099942544/5224354917'
  }
};
