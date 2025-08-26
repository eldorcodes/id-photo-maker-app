import 'react-native-gesture-handler';   // must be first
import 'react-native-reanimated';        // initialize reanimated

import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App); // <-- registers "main"