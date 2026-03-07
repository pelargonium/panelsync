import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import UniversesDashboard from './screens/UniversesDashboard';
import UniverseScreen from './screens/UniverseScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Universes" component={UniversesDashboard} />
        <Stack.Screen name="Universe" component={UniverseScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
