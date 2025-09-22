import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PremiumProvider } from './src/store/premiumStore';
import HomeScreen from './src/screens/HomeScreen';
import CompressScreen from './src/screens/CompressScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import { initIAP, teardownIAP } from './src/utils/iap';

const Stack = createNativeStackNavigator();

export default function App() {
  useEffect(() => { initIAP(); return () => teardownIAP(); }, []);
  return (
    <PremiumProvider>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'Image Compressor' }} />
          <Stack.Screen name="Compress" component={CompressScreen} options={{ title: 'Compress' }} />
          <Stack.Screen name="Results" component={ResultsScreen} options={{ title: 'Results' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </PremiumProvider>
  );
}
