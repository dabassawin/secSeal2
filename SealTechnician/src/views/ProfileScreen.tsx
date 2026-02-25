import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { TechnicianService } from '../services/TechnicianService';
import { parseJwt } from '../utils/jwt';
import { API_CONFIG } from '../config/api.config';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    History: undefined;
    Notification: undefined;
    Profile: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Profile'>;

interface ProfileScreenProps {
    onLogout: () => void;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();

    // Local state for user info instead of heavy useHomeViewModel
    const [userInfo, setUserInfo] = useState<{ username: string, role: string, first_name?: string, last_name?: string, profile_picture?: string } | null>(null);

    React.useEffect(() => {
        const loadUserInfo = async () => {
            try {
                const data = await TechnicianService.getMe();
                setUserInfo({
                    username: data.username || 'Technician',
                    role: data.role || 'technician',
                    first_name: data.first_name,
                    last_name: data.last_name,
                    profile_picture: data.profile_picture
                });
            } catch (error) {
                console.log('Failed to fetch profile', error);
                const token = await AuthService.getToken();
                if (token) {
                    const decoded = parseJwt(token);
                    if (decoded) {
                        setUserInfo({
                            username: decoded.username || 'Technician',
                            role: decoded.role || ''
                        });
                    }
                }
            }
        };
        // Use setTimeout to allow screen transition animation to finish first
        const timer = setTimeout(() => {
            loadUserInfo();
        }, 300);
        return () => clearTimeout(timer);
    }, []);

    const handleLogout = async () => {
        await AuthService.logout();
        onLogout();
    };

    // Helper to build full URL for images stored on backend
    const getAvatarUrl = (path?: string) => {
        if (!path) return 'https://via.placeholder.com/100';
        if (path.startsWith('http')) return path; // Already a full URL
        // Build URL using the server base IP and port from config
        return `http://${API_CONFIG.SERVER_IP}:${API_CONFIG.SERVER_PORT}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <SafeAreaView edges={[]} style={styles.headerContent}>
                    <Text style={styles.headerTitle}>โปรไฟล์</Text>
                    <Text style={styles.headerSubtitle}>ข้อมูลผู้ใช้งานระบบ</Text>
                </SafeAreaView>
            </View>

            {/* Content Section */}
            <View style={[styles.body, { paddingBottom: 80 + insets.bottom }]}>

                <View style={styles.profileCard}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: getAvatarUrl(userInfo?.profile_picture) }}
                            style={styles.avatar}
                        />
                    </View>
                    <Text style={styles.username}>{userInfo?.first_name ? `${userInfo.first_name} ${userInfo.last_name || ''}` : (userInfo?.username || 'Technician')}</Text>
                    <Text style={styles.roleText}>ตำแหน่ง: {userInfo?.role === 'technician' ? 'ช่าง (Technician)' : userInfo?.role || 'Technician'}</Text>

                    <View style={styles.infoSection}>
                        <View style={styles.infoRow}>
                            <Ionicons name="id-card-outline" size={24} color="#6A0DAD" />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoLabel}>รหัสพนักงาน</Text>
                                <Text style={styles.infoValue}>{userInfo?.username || '-'}</Text>
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Ionicons name="log-out-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.logoutButtonText}>ออกจากระบบ</Text>
                    </TouchableOpacity>
                </View>

            </View>

            {/* Custom Footer */}
            <View style={[styles.footerContainer, { paddingBottom: insets.bottom, height: 70 + insets.bottom }]}>
                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Home')}>
                    <Ionicons name="home-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>หน้าหลัก</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('History')}>
                    <Ionicons name="time-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>ประวัติ</Text>
                </TouchableOpacity>

                <View style={styles.footerSpace} />

                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Notification')}>
                    <Ionicons name="notifications-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>แจ้งเตือน</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerItem}>
                    <Ionicons name="person" size={24} color="#6A0DAD" />
                    <Text style={[styles.footerText, styles.activeFooterText]}>โปรไฟล์</Text>
                </TouchableOpacity>
            </View>

            {/* Floating Scan Button */}
            <TouchableOpacity
                style={[styles.scanButton, { bottom: 25 + insets.bottom }]}
                onPress={() => navigation.navigate('Scan')}
                activeOpacity={0.9}
            >
                <View style={styles.scanIconContainer}>
                    <Ionicons name="qr-code-outline" size={28} color="#fff" />
                    <Text style={styles.scanButtonText}>สแกนเริ่มงาน</Text>
                </View>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        backgroundColor: '#6A0DAD',
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerContent: { alignItems: 'center', paddingHorizontal: 20 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
    headerSubtitle: { color: '#E0B0FF', fontSize: 14 },
    body: { flex: 1, marginTop: 20, paddingHorizontal: 20 },

    profileCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        marginTop: 20,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#f0f0f0',
        padding: 4,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#6A0DAD',
        position: 'relative',
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 50,
    },
    uploadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    username: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    roleText: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
    },
    infoSection: {
        width: '100%',
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 20,
        marginBottom: 24,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E5F5',
        padding: 16,
        borderRadius: 12,
    },
    infoTextContainer: {
        marginLeft: 16,
    },
    infoLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    logoutButton: {
        flexDirection: 'row',
        backgroundColor: '#D32F2F',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
        justifyContent: 'center',
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },

    // Footer Styles (copied from standard template)
    footerContainer: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0, height: 70,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20,
        elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8,
    },
    footerItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
    footerText: { fontSize: 10, color: '#BDBDBD', marginTop: 4 },
    activeFooterText: { color: '#6A0DAD', fontWeight: 'bold' },
    footerSpace: { width: 60 },
    scanButton: {
        position: 'absolute', bottom: 25, alignSelf: 'center',
        width: 75, height: 80, borderRadius: 35,
        backgroundColor: '#FBC02D', justifyContent: 'center', alignItems: 'center',
        elevation: 10, shadowColor: '#FBC02D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5,
        borderWidth: 4, borderColor: '#f5f5f5',
    },
    scanIconContainer: { alignItems: 'center', justifyContent: 'center' },
    scanButtonText: { color: '#fff', fontSize: 8, fontWeight: 'bold', marginTop: 2 }
});
