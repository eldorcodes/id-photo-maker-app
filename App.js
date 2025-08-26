import 'react-native-gesture-handler';
import 'react-native-reanimated';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from './src/screens/HomeScreen';
import EditScreen from './src/screens/EditScreen';
import ExportScreen from './src/screens/ExportScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: 'ID Photo Maker' }} />
          <Stack.Screen name="Edit" component={EditScreen} options={{ title: 'Edit Photo' }} />
          <Stack.Screen name="Export" component={ExportScreen} options={{ title: 'Export' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}