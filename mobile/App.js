import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import HomeScreen from './screens/HomeScreen';
import EmergencyScreen from './screens/EmergencyFormScreen';
import HistoryScreen from './screens/HistoryScreen';
import ProfileScreen from './screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">

        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ title: 'ResQ AI' }}
        />

        <Stack.Screen 
          name="Emergency" 
          component={EmergencyScreen} 
        />

        <Stack.Screen 
          name="History" 
          component={HistoryScreen} 
        />

        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen} 
        />

      </Stack.Navigator>
    </NavigationContainer>
  );
}