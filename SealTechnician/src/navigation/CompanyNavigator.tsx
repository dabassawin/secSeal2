import React from 'react';
import { View, Text, Platform } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CompanyHomeScreen from '../views/company/CompanyHomeScreen';
import CompanyTechnicianListScreen from '../views/company/CompanyTechnicianListScreen';
import CompanyAssignSealScreen from '../views/company/CompanyAssignSealScreen';
import CompanySealInventoryScreen from '../views/company/CompanySealInventoryScreen';
import HistoryScreen from '../views/HistoryScreen';
import NotificationScreen from '../views/NotificationScreen';
import { AuthService } from '../services/AuthService';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder for screens still in development
// (Removed as no longer needed)

interface CompanyNavigatorProps {
    onLogout: () => void;
}

// Inline Bottom Tab Navigator Component
function CompanyBottomTabNavigator({ onLogout }: CompanyNavigatorProps) {
    const insets = useSafeAreaInsets();

    const handleLogout = async () => {
        await AuthService.logout();
        onLogout();
    };

    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#6A0DAD',
                tabBarInactiveTintColor: '#BDBDBD',
                tabBarHideOnKeyboard: true,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 0,
                    elevation: 20,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                    height: 70 + insets.bottom,
                    paddingBottom: insets.bottom || 5,
                    paddingTop: 5,
                    position: 'absolute', // Floating effect
                    borderTopLeftRadius: 20,
                    borderTopRightRadius: 20,
                },
                tabBarLabelStyle: {
                    fontSize: 10,
                    fontWeight: 'bold',
                    marginTop: 2,
                }
            }}
        >
            <Tab.Screen
                name="HomeTab"
                options={{
                    tabBarLabel: 'หน้าหลัก',
                    tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color} size={size} />
                }}
            >
                {(props) => <CompanyHomeScreen {...props} onLogout={onLogout} />}
            </Tab.Screen>
            <Tab.Screen
                name="TechnicianTab"
                component={CompanyTechnicianListScreen}
                options={{
                    tabBarLabel: 'ช่าง',
                    tabBarIcon: ({ color, size }) => <Ionicons name="people" color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="InventoryTab"
                component={CompanySealInventoryScreen}
                options={{
                    tabBarLabel: 'คลังซีล',
                    tabBarIcon: ({ color, size }) => <Ionicons name="cube-outline" color={color} size={size} />
                }}
            />
            <Tab.Screen
                name="AssignSealTab"
                component={CompanyAssignSealScreen}
                options={{
                    tabBarLabel: 'จ่ายซีล',
                    tabBarIcon: ({ color, size }) => <Ionicons name="pricetag" color={color} size={size} />
                }}
            />
        </Tab.Navigator>
    );
}

export default function CompanyNavigator({ onLogout }: CompanyNavigatorProps) {
    return (
        <Stack.Navigator initialRouteName="CompanyTabs" screenOptions={{ animation: 'none' }}>
            <Stack.Screen
                name="CompanyTabs"
                options={{ headerShown: false }}
            >
                {props => <CompanyBottomTabNavigator {...props} onLogout={onLogout} />}
            </Stack.Screen>
            <Stack.Screen
                name="CompanyTechnicianList"
                component={CompanyTechnicianListScreen}
                options={{ headerShown: false }}
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
        </Stack.Navigator>
    );
}
