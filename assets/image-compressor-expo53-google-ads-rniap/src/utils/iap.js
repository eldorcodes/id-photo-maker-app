import * as RNIap from 'react-native-iap';
import { Platform, Alert } from 'react-native';
import { setPremiumFlag } from './premiumFlag';

const PRODUCT_ID = process.env.EXPO_PUBLIC_IAP_REMOVE_ADS_PRODUCT_ID || 'imagecompressor_remove_ads';
const ANDROID_PACKAGE = process.env.EXPO_PUBLIC_ANDROID_PACKAGE_NAME || 'com.yourcompany.imagecompressor';
const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || '';

let purchaseUpdateSubscription = null;
let purchaseErrorSubscription = null;

export async function initIAP() {
  try {
    await RNIap.initConnection();
    purchaseUpdateSubscription = RNIap.purchaseUpdatedListener(async (purchase) => {
      try {
        const receipt = purchase.transactionReceipt;
        if (!receipt) return;
        let verified = true;
        // Optional server validation if BACKEND_URL provided
        if (BACKEND_URL) {
          if (Platform.OS === 'ios') {
            const res = await fetch(`${BACKEND_URL}/iap/verify-apple`, {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ receipt, productId: purchase.productId })
            });
            const json = await res.json(); verified = !!json.valid;
          } else {
            const res = await fetch(`${BACKEND_URL}/iap/verify-google`, {
              method: 'POST', headers: {'Content-Type':'application/json'},
              body: JSON.stringify({ purchaseToken: purchase.purchaseToken, productId: purchase.productId, packageName: ANDROID_PACKAGE })
            });
            const json = await res.json(); verified = !!json.valid;
          }
        }
        if (verified) {
          await setPremiumFlag(true);
          Alert.alert('Premium Unlocked', 'Ads removed & Batch compression enabled.');
          await RNIap.finishTransaction({ purchase, isConsumable: false });
        } else {
          Alert.alert('Purchase not verified', 'Try Restore Purchases.');
        }
      } catch {}
    });
    purchaseErrorSubscription = RNIap.purchaseErrorListener((_e) => {});
  } catch {}
}

export function teardownIAP() {
  purchaseUpdateSubscription?.remove?.();
  purchaseErrorSubscription?.remove?.();
  RNIap.endConnection();
}

export async function fetchProducts() {
  try {
    const products = await RNIap.getProducts({ skus: [PRODUCT_ID] });
    return products;
  } catch { return []; }
}

export async function buyRemoveAds() {
  try { await RNIap.requestPurchase({ sku: PRODUCT_ID, andDangerouslyFinishTransactionAutomaticallyIOS: false }); } catch {}
}

export async function restorePurchases() {
  try {
    const purchases = await RNIap.getAvailablePurchases();
    const owned = purchases?.some(p => p.productId === PRODUCT_ID);
    if (owned) { await setPremiumFlag(true); return true; }
  } catch {}
  return false;
}
