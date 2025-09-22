import React,{useEffect,useState}from'react';
import{View,Text,StyleSheet,TouchableOpacity,Alert,Modal}from'react-native';
import * as ImagePicker from 'expo-image-picker';
import AdBanner from '../components/AdBanner';
import { usePremium } from '../store/premiumStore';
import { buyRemoveAds, restorePurchases, fetchProducts } from '../utils/iap';
import { useRewardedWithCooldown } from '../hooks/useRewardedWithCooldown';
import { COLORS } from '../theme';

export default function HomeScreen({navigation}){
  const{isPremium}=usePremium();
  const[priceLabel,setPriceLabel]=useState('$2.99');
  const[paywallVisible,setPaywallVisible]=useState(false);
  const[queuedAssets,setQueuedAssets]=useState(null);
  const{show,cooldownLeft}=useRewardedWithCooldown(30_000);

  useEffect(()=>{(async()=>{const prods=await fetchProducts(); if(prods?.[0]?.localizedPrice) setPriceLabel(prods[0].localizedPrice);})()},[]);

  const pickImages=async()=>{
    const result=await ImagePicker.launchImageLibraryAsync({allowsMultipleSelection:true,mediaTypes:ImagePicker.MediaTypeOptions.Images,quality:1});
    if(result.canceled) return;
    const assets=result.assets||[];
    if(!isPremium && assets.length>1){ setQueuedAssets(assets); setPaywallVisible(true); return; }
    navigation.navigate('Compress',{assets});
  };

  return(<View style={styles.wrap}>
    <View style={styles.header}><Text style={styles.title}>Image Compressor</Text><Text style={styles.lead}>Shrink JPG/PNG/WEBP without losing too much quality.</Text></View>
    <TouchableOpacity style={styles.cta} onPress={pickImages}><Text style={styles.ctaText}>Pick Image{isPremium?'s':''}</Text></TouchableOpacity>
    <TouchableOpacity style={styles.restore} onPress={async()=>{const ok=await restorePurchases(); Alert.alert(ok?'Restored':'Nothing to restore');}}><Text style={styles.restoreText}>Restore Purchases</Text></TouchableOpacity>
    <AdBanner/>
    <Modal visible={paywallVisible} transparent animationType="slide" onRequestClose={()=>{setPaywallVisible(false); setQueuedAssets(null);}}>
      <View style={styles.modalOverlay}><View style={styles.modalBox}>
        <Text style={styles.modalTitle}>Unlock Batch Compression</Text>
        <Text style={styles.modalText}>Remove Ads & compress multiple images — or watch a short ad (cooldown applies).</Text>
        <TouchableOpacity style={styles.modalBtn} onPress={()=>buyRemoveAds()}><Text style={styles.modalBtnText}>Upgrade — {priceLabel}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.modalBtn,{backgroundColor:'#0f766e',marginTop:10}]} disabled={cooldownLeft>0} onPress={async()=>{const ok=await show(); if(ok&&queuedAssets){navigation.navigate('Compress',{assets:queuedAssets}); setQueuedAssets(null); setPaywallVisible(false);}}}>
          <Text style={styles.modalBtnText}>{cooldownLeft>0?`Wait ${Math.ceil(cooldownLeft/1000)}s`:'Watch Ad to Unlock Once'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.modalClose} onPress={()=>{setPaywallVisible(false); setQueuedAssets(null);}}><Text style={styles.modalCloseText}>Not now</Text></TouchableOpacity>
      </View></View>
    </Modal>
  </View>);
}

const styles=StyleSheet.create({
  wrap:{flex:1,padding:16,backgroundColor:COLORS.bg},
  header:{marginTop:24},title:{fontSize:24,fontWeight:'700',color:COLORS.brand},lead:{marginTop:6,color:'#444'},
  cta:{backgroundColor:COLORS.accent,padding:16,borderRadius:14,alignItems:'center',marginTop:24},ctaText:{color:'#fff',fontWeight:'700'},
  restore:{alignItems:'center',padding:8,marginTop:8},restoreText:{color:'#666'},
  modalOverlay:{flex:1,justifyContent:'center',alignItems:'center',backgroundColor:'rgba(0,0,0,0.6)'},
  modalBox:{width:'85%',backgroundColor:'#fff',borderRadius:16,padding:20,alignItems:'center'},
  modalTitle:{fontSize:20,fontWeight:'700',color:COLORS.brand,marginBottom:8},
  modalText:{color:'#444',textAlign:'center',marginBottom:16},
  modalBtn:{backgroundColor:COLORS.accent,padding:14,borderRadius:12,width:'100%',alignItems:'center'},
  modalBtnText:{color:'#fff',fontWeight:'700'},modalClose:{marginTop:12},modalCloseText:{color:COLORS.accent,fontWeight:'600'}
});
