import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { SealStatus } from '../constants/status';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    History: undefined;
    Notification: undefined;
    ReturnSeal: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notification'>;

interface LogEntry {
    id: number;
    user_id: number;
    action: string;
    timestamp: string;
    created_at: string;
}

const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear() + 543;
    const time = date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

    const monthStr = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${day} ${monthStr[month]} ${year} ${time}`;
};

const formatNotificationText = (action: string) => {
    let sealNumber = '';
    let techId = 'ไม่ทราบรหัส';

    // 1. Extract Seal Number
    const sealMatch = action.match(/(?:seal|ซิล|ซีล)\s+([a-zA-Z0-9]+)/i);
    if (sealMatch) {
        sealNumber = sealMatch[1];
    }

    // 2. Extract Technician ID/Code
    if (action.includes('รหัส:')) {
        const idMatch = action.match(/รหัส:\s*([^)]+)/);
        if (idMatch) techId = idMatch[1].trim();
    } else if (action.includes('technician ID')) {
        const idMatch = action.match(/technician ID (\d+)/i);
        if (idMatch) techId = idMatch[1];
    } else if (action.includes('technician_code=')) {
        const idMatch = action.match(/technician_code=([^\s]+)/i);
        if (idMatch) techId = idMatch[1];
    } else if (action.includes('ให้พนักงาน')) {
        const idMatch = action.match(/ให้พนักงาน\s+(.*?)(?:\s*\(|$)/);
        if (idMatch) techId = idMatch[1].trim();
    } else if (action.includes('ให้ช่าง')) {
        const idMatch = action.match(/ให้ช่าง\s+(.*?)(?:\s*\(|$)/);
        if (idMatch) techId = idMatch[1].trim();
    } else if (action.includes('ให้')) {
        const idMatch = action.match(/ให้\s+(.*?)(?:\s*\(|$)/);
        if (idMatch) techId = idMatch[1].trim();
    }

    // Remove trailing parenthesis from techId if it accidentally grabbed one
    if (techId.endsWith(')')) {
        techId = techId.slice(0, -1);
    }

    // 3. Format as requested
    if (action.includes("Assigned seal") || action.includes("จ่ายซิล") || action.includes("จ่ายซีล")) {
        if (sealNumber) {
            return `ได้จ่ายซีล ${sealNumber} ให้ ${techId}`;
        }
    }

    return action;
};

export default function NotificationScreen() {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchNotifications = async () => {
        setIsLoading(true);
        try {
            const token = await AuthService.getToken();
            if (!token) return;

            const url = getApiUrl(API_CONFIG.endpoints.TECHNICIAN_NOTIFICATIONS || '/technician/notifications');

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            } else {
                console.error("Failed to fetch notifications:", response.status);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const clearNotifications = () => {
        Alert.alert(
            "ยืนยันการล้างแจ้งเตือน",
            "คุณต้องการล้างการแจ้งเตือนทั้งหมดใช่หรือไม่?",
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ล้างทั้งหมด",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            const token = await AuthService.getToken();
                            if (!token) return;

                            const url = getApiUrl(API_CONFIG.endpoints.TECHNICIAN_NOTIFICATIONS || '/technician/notifications');
                            const response = await fetch(url, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json'
                                }
                            });

                            if (response.ok) {
                                setLogs([]);
                            } else {
                                console.error("Failed to clear notifications:", response.status);
                            }
                        } catch (error) {
                            console.error("Error clearing notifications:", error);
                        }
                    }
                }
            ]
        );
    };

    useFocusEffect(
        useCallback(() => {
            fetchNotifications();
        }, [])
    );

    const onRefresh = useCallback(() => {
        fetchNotifications();
    }, []);

    const renderLogItem = ({ item }: { item: LogEntry }) => {
        // Determine icon based on action text
        let iconName: any = "notifications-outline";
        let iconColor = "#6A0DAD";
        let bgColor = "#F3E5F5";

        if (item.action.includes(SealStatus.ISSUED)) {
            iconName = "log-in-outline";
            iconColor = "#2196F3";
            bgColor = "#E3F2FD";
        } else if (item.action.includes("ติดตั้ง")) {
            iconName = "build-outline";
            iconColor = "#FF9800";
            bgColor = "#FFF3E0";
        } else if (item.action.includes("คืน")) {
            iconName = "return-down-back-outline";
            iconColor = "#4CAF50";
            bgColor = "#E8F5E9";
        }

        return (
            <View style={styles.card}>
                <View style={[styles.iconContainer, { backgroundColor: bgColor }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.actionText}>{formatNotificationText(item.action)}</Text>
                    <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={14} color="#9E9E9E" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <SafeAreaView edges={[]} style={styles.headerContent}>
                    <Text style={styles.headerTitle}>แจ้งเตือน</Text>
                    <Text style={styles.headerSubtitle}>ประวัติการทำรายการอัพเดตซีลของคุณ</Text>
                </SafeAreaView>
            </View>

            {/* Content Section */}
            <View style={[styles.body, { paddingBottom: 80 + insets.bottom }]}>
                {logs.length > 0 && (
                    <TouchableOpacity style={styles.clearButton} onPress={clearNotifications}>
                        <Ionicons name="trash-outline" size={16} color="#D32F2F" />
                        <Text style={styles.clearButtonText}>ล้างการแจ้งเตือนทั้งหมด</Text>
                    </TouchableOpacity>
                )}

                {isLoading && logs.length === 0 ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6A0DAD" />
                    </View>
                ) : (
                    <FlatList
                        data={logs}
                        renderItem={renderLogItem}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={['#6A0DAD']} />
                        }
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <Ionicons name="notifications-off-outline" size={60} color="#E0E0E0" />
                                <Text style={styles.emptyText}>ไม่มีการแจ้งเตือนใหม่</Text>
                            </View>
                        }
                    />
                )}
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

                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('ReturnSeal')}>
                    <Ionicons name="arrow-undo-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>คืนซีล</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerItem}>
                    <Ionicons name="notifications" size={24} color="#6A0DAD" />
                    <Text style={[styles.footerText, styles.activeFooterText]}>แจ้งเตือน</Text>
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
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#6A0DAD', // Purple
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    headerSubtitle: {
        color: '#E0B0FF',
        fontSize: 14,
    },
    body: {
        flex: 1,
        marginTop: 20,
        paddingHorizontal: 20,
    },
    listContent: {
        paddingBottom: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    clearButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 8,
        alignSelf: 'flex-end',
    },
    clearButtonText: {
        color: '#D32F2F',
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '500',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    cardContent: {
        flex: 1,
        justifyContent: 'center',
    },
    actionText: {
        color: '#333',
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaText: {
        color: '#9E9E9E',
        fontSize: 12,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 60,
    },
    emptyText: {
        color: '#9E9E9E',
        fontSize: 16,
        marginTop: 16,
    },
    // Footer Styles
    footerContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 70,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    footerItem: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 60,
    },
    footerText: {
        fontSize: 10,
        color: '#BDBDBD',
        marginTop: 4,
    },
    activeFooterText: {
        color: '#6A0DAD',
        fontWeight: 'bold',
    },
    footerSpace: {
        width: 60,
    },
    scanButton: {
        position: 'absolute',
        bottom: 25,
        alignSelf: 'center',
        width: 75,
        height: 80,
        borderRadius: 35,
        backgroundColor: '#FBC02D',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#FBC02D',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 5,
        borderWidth: 4,
        borderColor: '#f5f5f5',
    },
    scanIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    scanButtonText: {
        color: '#fff',
        fontSize: 8,
        fontWeight: 'bold',
        marginTop: 2,
    }
});
