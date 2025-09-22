import React,{useEffect}from'react';
import{Platform,View}from'react-native';
import mobileAds,{BannerAd,BannerAdSize,TestIds}from'react-native-google-mobile-ads';
import{usePremium}from'../store/premiumStore';
import{AdUnitIds}from'../adConfig';

export default function AdBanner(){
  const{isPremium}=usePremium();
  useEffect(()=>{mobileAds().initialize();},[]);
  if(isPremium) return null;
  const unitId=Platform.select({ios:AdUnitIds.banner.ios,android:AdUnitIds.banner.android})||TestIds.BANNER;
  return(<View style={{alignItems:'center',marginVertical:8}}>
    <BannerAd unitId={unitId} size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER} requestOptions={{requestNonPersonalizedAdsOnly:true}}/>
  </View>);
}
