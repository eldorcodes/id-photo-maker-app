import React,{createContext,useContext,useEffect,useState}from'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
const KEY='imagecompressor_isPremium';
const Ctx=createContext({isPremium:false,setPremium:()=>{}});
export function PremiumProvider({children}){
  const[isPremium,setIsPremium]=useState(false);
  useEffect(()=>{(async()=>{const v=await AsyncStorage.getItem(KEY); if(v==='1') setIsPremium(true);})()},[]);
  const setPremium=async(v)=>{setIsPremium(v); await AsyncStorage.setItem(KEY, v?'1':'0');};
  return <Ctx.Provider value={{isPremium,setPremium}}>{children}</Ctx.Provider>;
}
export function usePremium(){return useContext(Ctx);}
