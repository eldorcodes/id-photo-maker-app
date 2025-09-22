import{useEffect,useRef,useState}from'react';
import{Platform}from'react-native';
import mobileAds,{RewardedAd,RewardedAdEventType,TestIds}from'react-native-google-mobile-ads';
import{AdUnitIds}from'../adConfig';
export function useRewardedWithCooldown(cooldownMs=30000){
  const[ready,setReady]=useState(false);
  const lastShownRef=useRef(0);
  const adRef=useRef(null);
  useEffect(()=>{
    mobileAds().initialize();
    const unitId=Platform.select({ios:AdUnitIds.rewarded.ios,android:AdUnitIds.rewarded.android})||TestIds.REWARDED;
    const rewarded=RewardedAd.createForAdRequest(unitId,{requestNonPersonalizedAdsOnly:true});
    adRef.current=rewarded;
    const onLoaded=rewarded.addAdEventListener(RewardedAdEventType.LOADED,()=>setReady(true));
    const onClosed=rewarded.addAdEventListener(RewardedAdEventType.CLOSED,()=>{setReady(false); rewarded.load();});
    rewarded.load();
    return()=>{onLoaded(); onClosed();};
  },[]);
  const show=async()=>{
    const now=Date.now();
    if(now-lastShownRef.current<cooldownMs) return false;
    if(!adRef.current||!ready) return false;
    lastShownRef.current=now;
    adRef.current.show();
    return true;
  };
  const cooldownLeft=Math.max(0,cooldownMs-(Date.now()-lastShownRef.current));
  return{show,ready,cooldownLeft};
}
