import React,{useEffect,useRef,useState}from'react';
import{View,Text,StyleSheet,TouchableOpacity}from'react-native';
import LottieView from 'lottie-react-native';
import Slider from '@react-native-community/slider';
import * as FileSystem from 'expo-file-system';
import { compressOne } from '../utils/compressImage';
import { COLORS } from '../theme';

export default function CompressScreen({route,navigation}){
  const{assets=[]}=route.params||{};
  const[progress,setProgress]=useState(0);
  const[quality,setQuality]=useState(0.7);
  const[format,setFormat]=useState('jpeg');
  const[maxWidth,setMaxWidth]=useState(1600);
  const[origTotal,setOrigTotal]=useState(0);
  const lottieRef=useRef(null);

  useEffect(()=>{(async()=>{let sum=0;for(const a of assets){const info=await FileSystem.getInfoAsync(a.uri); sum+=info.size||0;} setOrigTotal(sum);})()},[]);

  const estBytes=Math.round(origTotal*Math.max(0.25,(format==='webp'?0.6:0.75)*quality*1600/maxWidth));
  const start=async()=>{const uris=assets.map(a=>a.uri); const res=[]; for(let i=0;i<uris.length;i++){const r=await compressOne(uris[i],{maxWidth,quality,format}); res.push(r); setProgress((i+1)/uris.length);} navigation.replace('Results',{results:res,opts:{maxWidth,quality,format}});};
  useEffect(()=>{start();},[quality,format,maxWidth]);
  const fmt=b=>b>1024*1024?`${(b/1024/1024).toFixed(2)} MB`:b>1024?`${(b/1024).toFixed(1)} KB`:`${b} B`;

  return(<View style={styles.wrap}>
    <Text style={styles.title}>Compressing...</Text>
    <LottieView ref={lottieRef} autoPlay loop style={{width:140,height:140}} source={require('../lottie/loader.json')}/>
    <Text style={styles.progress}>{Math.round(progress*100)}%</Text>
    <Text style={styles.estimate}>Estimated ≈ {fmt(estBytes)}</Text>
    <Text style={styles.label}>Quality {Math.round(quality*100)}%</Text>
    <Slider value={quality} onValueChange={setQuality} minimumValue={0.4} maximumValue={0.95} step={0.05}/>
    <Text style={styles.label}>Max Width {maxWidth}px</Text>
    <Slider value={maxWidth} onValueChange={v=>setMaxWidth(Math.round(v))} minimumValue={800} maximumValue={4096} step={64}/>
    <TouchableOpacity style={styles.toggle} onPress={()=>setFormat(format==='webp'?'jpeg':'webp')}><Text style={styles.toggleText}>{format.toUpperCase()}</Text></TouchableOpacity>
  </View>);
}

const styles=StyleSheet.create({wrap:{flex:1,alignItems:'center',justifyContent:'center',backgroundColor:COLORS.bg,padding:12},title:{fontSize:20,fontWeight:'700',color:COLORS.brand},progress:{marginTop:10,color:'#444'},estimate:{marginTop:6,color:'#555'},label:{marginTop:8,fontWeight:'600',color:COLORS.text},toggle:{marginTop:12,padding:10,backgroundColor:COLORS.accent,borderRadius:8},toggleText:{color:'#fff',fontWeight:'700'}});
