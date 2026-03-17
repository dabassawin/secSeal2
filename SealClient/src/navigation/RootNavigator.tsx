import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import { View, ActivityIndicator, Text } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { colors } from '../constants/colors';
import LoginScreen from '../screens/LoginScreen';
import { HomeScreen } from '../screens/Home/HomeScreen';
import { SealInventoryScreen } from '../screens/Inventory/SealInventoryScreen';
import { CreateSealScreen } from '../screens/Seal/CreateSealScreen';
import { AuditLogScreen } from '../screens/Log/AuditLogScreen';
import { SealHistoryScreen } from '../screens/Inventory/SealHistoryScreen';
import {
    TechnicianListScreen,
    TechnicianDetailScreen,
    AddTechnicianScreen,
    ImportTechnicianScreen,
    AssignSealScreen,
    UserManagementScreen,
    ChangeWorkplaceScreen,
    ReportScreen,
    ReturnVerificationScreen,
    AddMasComScreen,
    MasComListScreen
} from '../screens';
import TechnicianHomeScreen from '../screens/TechnicianHomeScreen';

const SealStack = createStackNavigator();
const TechAdminStack = createStackNavigator();
const InventoryStack = createStackNavigator();
const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

const CustomDrawerContent = (props: any) => {
    const { logout } = useAuth();

    return (
        <View style={{ flex: 1 }}>
            <DrawerContentScrollView {...props}>
                <DrawerItemList {...props} />
            </DrawerContentScrollView>
            <View style={{ marginBottom: 20, borderTopWidth: 1, borderTopColor: '#e0e0e0', paddingTop: 10 }}>
                <DrawerItem
                    label="ออกจากระบบ"
                    onPress={logout}
                    icon={({ color, size }) => <Text style={{ fontSize: size, color: color }}>🚪</Text>}
                />
            </View>
        </View>
    );
};

const SealStackNavigator = () => {
    return (
        <SealStack.Navigator screenOptions={{ headerShown: false }}>
            <SealStack.Screen name="CreateSeal" component={CreateSealScreen} />
        </SealStack.Navigator>
    );
};

const TechAdminStackNavigator = () => {
    return (
        <TechAdminStack.Navigator screenOptions={{ headerShown: false, cardStyle: { flex: 1 } }}>
            <TechAdminStack.Screen name="MasComList" component={MasComListScreen} />
            <TechAdminStack.Screen name="TechnicianList" component={TechnicianListScreen} />
            <TechAdminStack.Screen name="TechnicianDetail" component={TechnicianDetailScreen} />
        </TechAdminStack.Navigator>
    );
};

const InventoryStackNavigator = () => {
    return (
        <InventoryStack.Navigator screenOptions={{ headerShown: false, cardStyle: { flex: 1 } }}>
            <InventoryStack.Screen name="SealInventory" component={SealInventoryScreen} />
            <InventoryStack.Screen name="SealHistory" component={SealHistoryScreen} />
        </InventoryStack.Navigator>
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
                component={InventoryStackNavigator}
                options={{
                    title: 'คลังซีล (Inventory)',
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="Technicians"
                component={TechAdminStackNavigator}
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
                name="AddMasCom"
                component={AddMasComScreen}
                options={{
                    title: 'จัดการศูนย์งาน',
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
                name="CreateUser"
                component={UserManagementScreen}
                options={{
                    title: 'จัดการผู้ใช้งาน',
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="ChangeWorkplace"
                component={ChangeWorkplaceScreen}
                options={{
                    title: 'เปลี่ยนที่ทำงาน',
                    drawerIcon: ({ color, size }) => <Text style={{ fontSize: size, color: color }}>🏢</Text>
                }}
            />
            <Drawer.Screen
                name="AssignSeal"
                component={AssignSealScreen}
                options={{
                    title: 'มอบหมายซีล',
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="Logs"
                component={AuditLogScreen}
                options={{
                    title: 'Logs & รายงาน',
                    drawerIcon: ({ color, size }) => <Text style={{ fontSize: size, color: color }}>📋</Text>
                }}
            />
            <Drawer.Screen
                name="Report"
                component={ReportScreen}
                options={{
                    title: 'รายงานสรุป',
                    drawerItemStyle: { display: 'none' }
                }}
            />
            <Drawer.Screen
                name="ReturnVerification"
                component={ReturnVerificationScreen}
                options={{
                    title: 'รับคืนซีล',
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
                <ActivityIndicator size="large" color={colors.primary} />
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
                        Inventory: {
                            path: 'inventory',
                            screens: {
                                SealInventory: '',
                                SealHistory: ':sealNumber',
                            },
                        },
                        Technicians: {
                            path: 'technicians',
                            screens: {
                                MasComList: '',
                                TechnicianList: 'list/:com_code',
                                TechnicianDetail: 'detail/:id',
                            },
                        },
                        AddTechnician: 'technicians/add',
                        ImportTechnician: 'technicians/import',
                        AssignSeal: 'seals/assign',
                        Report: 'report',
                        ReturnVerification: 'return-verification',
                        AddMasCom: 'mascom/add',
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
