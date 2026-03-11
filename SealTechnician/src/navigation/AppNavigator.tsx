import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../views/HomeScreen';
import ScanScreen from '../views/ScanScreen';
import HistoryScreen from '../views/HistoryScreen';
import NotificationScreen from '../views/NotificationScreen';
import ReturnSealScreen from '../views/ReturnSealScreen';

const Stack = createNativeStackNavigator();

interface AppNavigatorProps {
    onLogout: () => void;
}

export default function AppNavigator({ onLogout }: AppNavigatorProps) {
    return (
        <Stack.Navigator initialRouteName="Home" screenOptions={{ animation: 'none' }}>
            <Stack.Screen
                name="Home"
                options={{ headerShown: false }}
            >
                {(props) => <HomeScreen {...props} onLogout={onLogout} />}
            </Stack.Screen>
            <Stack.Screen
                name="Scan"
                component={ScanScreen}
                options={{ title: 'Scan QR Code' }}
            />
            <Stack.Screen
                name="History"
                component={HistoryScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Notification"
                component={NotificationScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ReturnSeal"
                options={{ headerShown: false }}
            >
                {(props) => <ReturnSealScreen {...props} onLogout={onLogout} />}
            </Stack.Screen>
        </Stack.Navigator>
    );
}
