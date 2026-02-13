import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { View, ActivityIndicator } from 'react-native';

import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { SealInventoryScreen } from '../screens/Inventory/SealInventoryScreen';
import { CreateSealScreen } from '../screens/Seal/CreateSealScreen';
import { AuditLogScreen } from '../screens/Log/AuditLogScreen';
import { SealHistoryScreen } from '../screens/Inventory/SealHistoryScreen';
import {
    TechnicianListScreen,
    AddTechnicianScreen,
    ImportTechnicianScreen
} from '../screens';
import TechnicianHomeScreen from '../screens/TechnicianHomeScreen';

const SealStack = createStackNavigator();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const SealStackNavigator = () => {
    return (
        <SealStack.Navigator screenOptions={{ headerShown: false }}>
            <SealStack.Screen name="CreateSeal" component={CreateSealScreen} />
        </SealStack.Navigator>
    );
};

const StaffNavigator = () => {
    return (
        <Drawer.Navigator screenOptions={{ headerShown: false }}>
            <Drawer.Screen name="Dashboard" component={HomeScreen} />
            <Drawer.Screen
                name="Seals"
                component={SealStackNavigator}
            />
            <Drawer.Screen
                name="Inventory"
                component={SealInventoryScreen}
                options={{ title: 'คลังซีล (Inventory)' }}
            />
            <Drawer.Screen
                name="SealHistory"
                component={SealHistoryScreen}
                options={{
                    title: 'ประวัติซีล',
                    drawerItemStyle: { display: 'none' } // Hide from drawer menu
                }}
            />
            <Drawer.Screen
                name="Technicians"
                component={TechnicianListScreen}
                options={{ title: 'จัดการรายชื่อช่าง (Technicians)' }}
            />
            <Drawer.Screen
                name="AddTechnician"
                component={AddTechnicianScreen}
                options={{
                    title: 'เพิ่มช่างใหม่',
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="ImportTechnician"
                component={ImportTechnicianScreen}
                options={{
                    title: 'นำเข้าข้อมูลช่าง',
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="Logs"
                component={AuditLogScreen}
            />
            {/* We will add Logs, etc. here later */}
        </Drawer.Navigator>
    );
};

const TechnicianNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen name="TechHome" component={TechnicianHomeScreen} options={{ title: 'My Work' }} />
            {/* We will add Install, Upload screens here later */}
        </Stack.Navigator>
    );
};

const RootNavigator = () => {
    const { user, role, isLoading } = useAuth();

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    const linking = {
        prefixes: ['http://localhost:3001', 'peasecseal://'],
        config: {
            screens: {
                Login: 'login',
                StaffApp: {
                    screens: {
                        Dashboard: 'dashboard',
                        Inventory: 'inventory',
                        SealHistory: 'inventory/:sealNumber',
                        Technicians: 'technicians',
                        AddTechnician: 'technicians/add',
                        ImportTechnician: 'technicians/import',
                        Seals: {
                            screens: {
                                CreateSeal: 'seals/create',
                            },
                        },
                    },
                },
                TechApp: {
                    screens: {
                        TechHome: 'tech',
                    },
                },
            },
        },
    };

    return (
        <NavigationContainer linking={linking as any}>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {!user ? (
                    // Auth Stack
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : role === 'staff' ? (
                    // Staff App
                    <>
                        <Stack.Screen name="StaffApp" component={StaffNavigator} />
                    </>
                ) : (
                    // Technician App
                    <Stack.Screen name="TechApp" component={TechnicianNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer >
    );
};

export default RootNavigator;
