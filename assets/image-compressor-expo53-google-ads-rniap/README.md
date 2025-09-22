# Image Compressor — Expo 53 (Google Ads + react-native-iap)

- Ads via `react-native-google-mobile-ads` (Banner / Interstitial / Rewarded)
- IAP via `react-native-iap` (non-consumable: remove ads + unlock batch)

## Run
npm install
npx expo prebuild
npx expo run:ios   # or: npx expo run:android

## Configure
- Set AdMob **App IDs** in app.json plugin (required).
- Unit IDs via env (defaults to Google test IDs).
- IAP product id via `EXPO_PUBLIC_IAP_REMOVE_ADS_PRODUCT_ID`.
- (Optional) Backend URL in `EXPO_PUBLIC_API_URL` for server-side receipt verification.
