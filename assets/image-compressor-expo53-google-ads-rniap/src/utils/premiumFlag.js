import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY='imagecompressor_isPremium';
export async function setPremiumFlag(v){await AsyncStorage.setItem(KEY,v?'1':'0');}
