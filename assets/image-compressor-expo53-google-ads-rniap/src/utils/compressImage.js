import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
export async function compressOne(uri,{maxWidth=1920,quality=0.7,format='jpeg'}={}){
  const info=await FileSystem.getInfoAsync(uri); const orig=info.size||0;
  const fmt=['jpeg','png','webp'].includes(format)?format:'jpeg';
  const {uri:outUri}=await ImageManipulator.manipulateAsync(uri,[{resize:{width:maxWidth}}],{compress:quality,format:fmt});
  const outInfo=await FileSystem.getInfoAsync(outUri);
  return { outUri, origBytes: orig, outBytes: outInfo.size||0 };
}
