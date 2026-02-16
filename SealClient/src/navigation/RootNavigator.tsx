import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, ActivityIndicator, Text } from 'react-native';

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

const CustomDrawerContent = (props: any) => {
    const { logout } = useAuth();

    return (
        <DrawerContentScrollView {...props}>
            <DrawerItemList {...props} />
            <DrawerItem
                label="ออกจากระบบ"
                onPress={logout}
                icon={({ color, size }) => <Text style={{ fontSize: size, color: color }}>🚪</Text>}
            />
        </DrawerContentScrollView>
    );
};

const SealStackNavigator = () => {
    return (
        <SealStack.Navigator screenOptions={{ headerShown: false }}>
            <SealStack.Screen name="CreateSeal" component={CreateSealScreen} />
        </SealStack.Navigator>
    );
};

const StaffNavigator = () => {
    return (
        <Drawer.Navigator
            screenOptions={{ headerShown: false }}
            drawerContent={(props) => <CustomDrawerContent {...props} />}
        >
            <Drawer.Screen
                name="Dashboard"
                component={HomeScreen}
                options={{
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="Seals"
                component={SealStackNavigator}
                options={{
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="Inventory"
                component={SealInventoryScreen}
                options={{
                    title: 'คลังซีล (Inventory)',
                    drawerItemStyle: { display: 'none' }
                }}
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
                options={{
                    title: 'จัดการรายชื่อช่าง (Technicians)',
                    drawerItemStyle: { display: 'none' }
                }}
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
                options={{
                    drawerItemStyle: { display: 'none' }
                }}
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
