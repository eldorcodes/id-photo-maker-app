import React,{useEffect,useMemo}from'react';
import{View,Text,StyleSheet,FlatList,TouchableOpacity}from'react-native';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import JSZip from 'jszip';
import AdBanner from'../components/AdBanner';
import{usePremium}from'../store/premiumStore';
import{useInterstitialCycle}from'../hooks/useInterstitialCycle';
import { COLORS } from '../theme';

export default function ResultsScreen({route,navigation}){
 const{results=[],opts={}}=route.params||{};
 const{isPremium}=usePremium();
 const{maybeShow}=useInterstitialCycle(2);
 const summary=useMemo(()=>{const o=results.reduce((a,b)=>a+(b.origBytes||0),0);const u=results.reduce((a,b)=>a+(b.outBytes||0),0);const p=o?Math.max(0,100-Math.round((u/o)*100)):0;return{orig:o,out:u,pct:p};},[results]);
 useEffect(()=>{maybeShow();},[]);
 const fmt=b=>b>1024*1024?`${(b/1024/1024).toFixed(2)} MB`:b>1024?`${(b/1024).toFixed(1)} KB`:`${b} B`;
 const saveFirst=async()=>{if(results[0]?.outUri&&(await Sharing.isAvailableAsync())) await Sharing.shareAsync(results[0].outUri);};
 const saveAllZip=async()=>{try{const zip=new JSZip();for(let i=0;i<results.length;i++){const r=results[i];const base64=await FileSystem.readAsStringAsync(r.outUri,{encoding:FileSystem.EncodingType.Base64});const ext=(r.outUri.split('.').pop()||'jpg').split('?')[0];zip.file(`image_${i+1}.${ext}`,base64,{base64:true});}const zipBase64=await zip.generateAsync({type:'base64'});const outPath=FileSystem.cacheDirectory+'compressed_images.zip';await FileSystem.writeAsStringAsync(outPath,zipBase64,{encoding:FileSystem.EncodingType.Base64});if(await Sharing.isAvailableAsync())await Sharing.shareAsync(outPath);}catch(e){await saveFirst();}};
 return(<View style={styles.wrap}><View style={styles.header}><Text style={styles.title}>Done!</Text><Text style={styles.lead}>Reduced by ~{summary.pct}% overall.</Text><Text style={styles.meta}>Format: {opts.format?.toUpperCase()||'JPEG'} · MaxW: {opts.maxWidth||1920}px · Q: {Math.round(((opts.quality??0.7)*100))}%</Text></View><FlatList data={results} keyExtractor={(it,idx)=>`${idx}`} contentContainerStyle={{paddingBottom:150}} renderItem={({item,index})=>{const pct=item.origBytes?Math.max(0,100-Math.round((item.outBytes/item.origBytes)*100)):0;return(<View style={styles.card}><Text style={styles.cardTitle}>Image {index+1}</Text><Text>Before: {fmt(item.origBytes)} · After: {fmt(item.outBytes)} · −{pct}%</Text><View style={styles.barBg}><View style={[styles.barFill,{width:`${pct}%`}]} /></View></View>);}}/>{!isPremium&&(<TouchableOpacity style={styles.upgrade} onPress={()=>navigation.navigate('Home')}><Text style={styles.upgradeText}>Remove Ads & Unlock Batch</Text></TouchableOpacity>)}<View style={styles.actions}><TouchableOpacity style={styles.primary} onPress={saveFirst}><Text style={styles.primaryText}>Share First</Text></TouchableOpacity>{results.length>1&&(<TouchableOpacity style={[styles.primary,{backgroundColor:'#4b5563'}]} onPress={saveAllZip}><Text style={styles.primaryText}>Save All as ZIP</Text></TouchableOpacity>)}</View><AdBanner/></View>);
}

const styles=StyleSheet.create({
  wrap:{flex:1,padding:16,backgroundColor:COLORS.bg},
  header:{marginBottom:8},title:{fontSize:22,fontWeight:'700',color:COLORS.brand},lead:{color:'#444',marginTop:4},meta:{color:COLORS.subtext,marginTop:4},
  card:{padding:12,borderRadius:12,backgroundColor:COLORS.card,marginVertical:6},cardTitle:{fontWeight:'700',marginBottom:6},
  barBg:{height:8,backgroundColor:'#e5e7eb',borderRadius:999,overflow:'hidden',marginTop:6},barFill:{height:8,backgroundColor:'#10b981'},
  actions:{position:'absolute',left:16,right:16,bottom:72},
  primary:{backgroundColor:COLORS.accent,padding:16,borderRadius:14,alignItems:'center',marginTop:8},primaryText:{color:'#fff',fontWeight:'700'},
  upgrade:{position:'absolute',left:16,right:16,bottom:140,padding:14,borderRadius:12,borderWidth:1,borderColor:COLORS.accent,alignItems:'center'},upgradeText:{color:COLORS.accent,fontWeight:'700'}
});
