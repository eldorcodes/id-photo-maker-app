import{useEffect,useRef}from'react';
import{Platform}from'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import mobileAds,{InterstitialAd,AdEventType,TestIds}from'react-native-google-mobile-ads';
import{AdUnitIds}from'../adConfig';
const COUNT_KEY='imagecompressor_interstitial_count';
export function useInterstitialCycle(everyN=2){
  const adRef=useRef(null);
  const readyRef=useRef(false);
  useEffect(()=>{
    mobileAds().initialize();
    const unitId=Platform.select({ios:AdUnitIds.interstitial.ios,android:AdUnitIds.interstitial.android})||TestIds.INTERSTITIAL;
    const interstitial=InterstitialAd.createForAdRequest(unitId,{requestNonPersonalizedAdsOnly:true});
    adRef.current=interstitial;
    const onLoaded=interstitial.addAdEventListener(AdEventType.LOADED,()=>{readyRef.current=true;});
    const onClosed=interstitial.addAdEventListener(AdEventType.CLOSED,()=>{readyRef.current=false; interstitial.load();});
    interstitial.load();
    return()=>{onLoaded(); onClosed();};
  },[]);
  const maybeShow=async()=>{
    let count=Number(await AsyncStorage.getItem(COUNT_KEY)||'0');
    count+=1; await AsyncStorage.setItem(COUNT_KEY,String(count));
    if(count%everyN===0 && adRef.current && readyRef.current){ adRef.current.show(); readyRef.current=false; }
  };
  return{maybeShow};
}
