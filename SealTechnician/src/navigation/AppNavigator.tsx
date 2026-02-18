import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../views/HomeScreen';
import ScanScreen from '../views/ScanScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
    return (
        <Stack.Navigator initialRouteName="Home">
            <Stack.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'Home Dashboard' }}
            />
            <Stack.Screen
                name="Scan"
                component={ScanScreen}
                options={{ title: 'Scan QR Code' }}
            />
        </Stack.Navigator>
    );
}
