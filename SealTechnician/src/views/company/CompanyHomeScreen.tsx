import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../../services/AuthService';

type Props = {
    navigation: NativeStackNavigationProp<any>;
    onLogout: () => void;
};

const { width } = Dimensions.get('window');

export default function CompanyHomeScreen({ navigation, onLogout }: Props) {
    const insets = useSafeAreaInsets();

    const handleLogout = async () => {
        await AuthService.logout();
        onLogout();
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={styles.header}>
                <View style={[styles.headerContent, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.profileRow}>
                        <View style={styles.userInfo}>
                            <Text style={styles.greeting}>สวัสดี,</Text>
                            <Text style={styles.username}>ศูนย์งาน / ตัวแทน</Text>
                            <View style={styles.idBadge}>
                                <Text style={styles.idText}>Company Dashboard</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.notifButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Decorative Stats Card */}
                <View style={styles.statsCardWrapper}>
                    <View style={styles.statsCard}>
                        <View style={styles.statsInfo}>
                            <Text style={styles.statsLabel}>ยินดีต้อนรับ</Text>
                            <Text style={styles.statsValue}>ระบบจัดการ</Text>
                            <Text style={styles.statsDate}>สำหรับระดับบริษัท / ศูนย์งาน</Text>
                        </View>
                        <View style={styles.statsIcon}>
                            <Ionicons name="business-outline" size={30} color="#6A0DAD" />
                        </View>
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.emptyContent}>
                    <Ionicons name="apps-outline" size={60} color="#E0E0E0" />
                    <Text style={styles.emptyText}>เลือกเมนูจากแถบด้านล่างเพื่อเริ่มต้นใช้งาน</Text>
                </View>
            </ScrollView>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#6A0DAD', // Purple
        paddingBottom: 80, // Space for overlapping card
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    userInfo: {
        flex: 1,
    },
    greeting: {
        color: '#E0B0FF',
        fontSize: 14,
    },
    username: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    idBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    idText: {
        color: '#fff',
        fontSize: 12,
    },
    notifButton: {
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 12,
    },
    statsCardWrapper: {
        position: 'absolute',
        bottom: -40,
        left: 20,
        right: 20,
    },
    statsCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statsInfo: {
        flex: 1,
    },
    statsLabel: {
        color: '#757575',
        fontSize: 14,
        marginBottom: 4,
    },
    statsValue: {
        color: '#6A0DAD',
        fontSize: 24,
        fontWeight: 'bold',
    },
    statsDate: {
        color: '#9E9E9E',
        fontSize: 12,
        marginTop: 4,
    },
    statsIcon: {
        width: 50,
        height: 50,
        backgroundColor: '#F3E5F5',
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 150, // Space for footer
    },
    emptyContent: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: '#9E9E9E',
        fontSize: 16,
        marginTop: 16,
    },
});
