// App.js
import 'react-native-reanimated';

import React, { useEffect, useRef, useState } from 'react';
import { LogBox, Platform, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NavigationContainer,
  DefaultTheme as NavLight,
  DarkTheme as NavDark,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import mobileAds from 'react-native-google-mobile-ads';

import HomeScreen from './src/screens/HomeScreen';
import EditScreen from './src/screens/EditScreen';
import ExportScreen from './src/screens/ExportScreen';
import { preloadInterstitial } from './src/ads/InterstitialAd';
import { preloadRewarded } from './src/ads/RewardedAd';

/** —— Branding (from your project memory) —— */
const BRAND = {
  primary: '#2563EB',   // accent
  dark: '#0f172a',
  bg: '#ffffff',
};

/** —— Theming —— */
const LightTheme = {
  ...NavLight,
  colors: {
    ...NavLight.colors,
    primary: BRAND.primary,
    background: BRAND.bg,
    card: '#ffffff',
    text: BRAND.dark,
    border: '#e5e7eb',
  },
};

const DarkTheme = {
  ...NavDark,
  colors: {
    ...NavDark.colors,
    primary: BRAND.primary,
  },
};

/** —— Deep linking (matches app.json -> "scheme": "idphoto") —— */
const linking = {
  prefixes: ['idphoto://'],
  config: {
    screens: {
      Home: '',
      Edit: 'edit',
      Export: 'export',
    },
  },
};

/** —— Optional: persist nav state between cold starts —— */
const PERSISTENCE_KEY = '@nav-state-v1';

const Stack = createNativeStackNavigator();

export default function App() {
  const scheme = useColorScheme();
  const navRef = useRef(null);
  const [isReady, setReady] = useState(false);
  const [initialState, setInitialState] = useState();

  useEffect(() => {
    // Prevent repeated warnings in dev mode
    LogBox.ignoreLogs(['new NativeEventEmitter']);
  
    const initAds = async () => {
      try {
        console.log('🚀 Initializing AdMob SDK...');
        if (!global.adsReady) await mobileAds().initialize();
        global.adsReady = true;
        console.log('✅ AdMob initialized');
    
        preloadInterstitial();
        preloadRewarded();
      } catch (error) {
        console.warn('⚠️ AdMob init error:', error);
      }
    };
  
    if (Platform.OS !== 'web') initAds();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        // Don’t persist in Expo Go on web to avoid noisy prompts
        if (Platform.OS !== 'web') {
          const state = await AsyncStorage.getItem(PERSISTENCE_KEY);
          if (state) setInitialState(JSON.parse(state));
        }
      } catch {}
      setReady(true);
    })();
  }, []);

  if (!isReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <NavigationContainer
          ref={navRef}
          linking={linking}
          theme={scheme === 'dark' ? DarkTheme : LightTheme}
          onStateChange={async (state) => {
            try {
              await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
            } catch {}
          }}
        >
          <Stack.Navigator
            // Better Android back UX
            screenOptions={{
              headerShadowVisible: false,
              headerStyle: { backgroundColor: '#ffffff' },
              headerTintColor: BRAND.primary,
              headerTitleStyle: { fontWeight: '800', letterSpacing: 0.2 },
              contentStyle: { backgroundColor: '#ffffff' },
              animation: Platform.select({ ios: 'default', android: 'fade' }),
              gestureEnabled: true,
              // iOS swipe-back & Android back both enabled
            }}
            backBehavior="history"
          >
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{ title: 'ID Photo Maker' }}
            />
            <Stack.Screen
              name="Edit"
              component={EditScreen}
              options={{ title: 'Edit Photo' }}
            />
            <Stack.Screen
              name="Export"
              component={ExportScreen}
              options={{ title: 'Export' }}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}