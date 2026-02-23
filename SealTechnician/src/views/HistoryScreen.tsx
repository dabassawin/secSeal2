import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useHomeViewModel } from '../viewmodels/HomeViewModel';
import { Seal } from '../services/TechnicianService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    History: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'History'>;

const { width } = Dimensions.get('window');

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
export default function HistoryScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { historySeals, activeSeals, isLoading, fetchSeals } = useHomeViewModel();
    const insets = useSafeAreaInsets();
    const [searchText, setSearchText] = useState('');

    const onRefresh = useCallback(() => {
        fetchSeals();
    }, []);

    // Also include activeSeals if we want to show all logs, but user asked for "completed" logs
    // Let's combine them into a single log list, or just show historySeals. The user asked for "history seal as logs"
    const allLogs = [...historySeals, ...activeSeals].sort((a, b) => b.id - a.id); // Sort by ID descending

    const displayedLogs = allLogs.filter(
        seal => seal.seal_number.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderLogItem = ({ item }: { item: Seal }) => {
        const isCompleted = item.status === 'ติดตั้งแล้ว' || item.status === 'ใช้งานแล้ว';

        let displayStatus = item.status;
        if (item.status === 'จ่าย' || item.status === 'พร้อมใช้งาน') {
            displayStatus = 'ยังไม่ติดตั้ง';
        } else if (item.status === 'ใช้งานแล้ว' || item.status === 'ติดตั้งแล้ว') {
            displayStatus = 'ติดตั้งแล้ว';
        }

        return (
            <View style={styles.card}>
                <View style={styles.cardLeft}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={isCompleted ? "checkmark-circle-outline" : "time-outline"} size={24} color={isCompleted ? "#4CAF50" : "#FF9800"} />
                    </View>
                    <View style={styles.cardContent}>
                        <Text style={styles.serialLabel}>Serial Number</Text>
                        <Text style={styles.sealNumber}>{item.seal_number}</Text>

                        <View style={styles.metaRow}>
                            <Ionicons name="cube-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                            <Text style={styles.metaText}>Type: Seal</Text>
                        </View>
                        <View style={styles.metaRow}>
                            <Ionicons name="information-circle-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                            <Text style={styles.metaText}>Status: {item.status}</Text>
                        </View>
                        {item.issued_at && (
                            <View style={styles.metaRow}>
                                <Ionicons name="calendar-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                                <Text style={styles.metaText}>วันที่จ่าย: {formatDate(item.issued_at)}</Text>
                            </View>
                        )}
                        {item.used_at && (
                            <View style={styles.metaRow}>
                                <Ionicons name="calendar-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                                <Text style={styles.metaText}>วันที่ใช้งาน: {formatDate(item.used_at)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.cardRight}>
                    <View style={[styles.statusBadge, isCompleted ? styles.statusSuccess : styles.statusPending]}>
                        <Text style={[styles.statusText, isCompleted ? styles.textSuccess : styles.textPending]}>
                            {displayStatus}
                        </Text>
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
                    <Text style={styles.headerTitle}>ประวัติ Seal</Text>
                    <Text style={styles.headerSubtitle}>รายการซีลทั้งหมดที่ถูกบันทึกในระบบ</Text>
                </SafeAreaView>
            </View>

            {/* Content Section */}
            <View style={[styles.body, { paddingBottom: 80 + insets.bottom }]}>
                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#9E9E9E" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาเบอร์ซีลในประวัติ..."
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                {/* List */}
                <FlatList
                    data={displayedLogs}
                    renderItem={renderLogItem}
                    keyExtractor={(item) => item.seal_number + item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={['#800080']} />
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.emptyContainer}>
                                <Ionicons name="document-text-outline" size={60} color="#E0E0E0" />
                                <Text style={styles.emptyText}>ไม่พบประวัติข้อมูล</Text>
                            </View>
                        ) : null
                    }
                />
            </View>

            {/* Custom Footer */}
            <View style={[styles.footerContainer, { paddingBottom: insets.bottom, height: 70 + insets.bottom }]}>
                {/* Home Tab */}
                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Home')}>
                    <Ionicons name="home-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>หน้าหลัก</Text>
                </TouchableOpacity>

                {/* History Tab (Active) */}
                <TouchableOpacity style={styles.footerItem}>
                    <Ionicons name="time" size={24} color="#6A0DAD" />
                    <Text style={[styles.footerText, styles.activeFooterText]}>ประวัติ</Text>
                </TouchableOpacity>

                {/* Space for Floating Button */}
                <View style={styles.footerSpace} />

                {/* Notification Tab */}
                <TouchableOpacity style={styles.footerItem}>
                    <Ionicons name="notifications-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>แจ้งเตือน</Text>
                </TouchableOpacity>

                {/* Profile Tab */}
                <TouchableOpacity style={styles.footerItem}>
                    <Ionicons name="person-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>โปรไฟล์</Text>
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
        paddingBottom: 80, // Space for footer
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        elevation: 2,
        height: 50,
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: '#333',
    },
    listContent: {
        paddingBottom: 100,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        elevation: 2,
    },
    cardLeft: {
        flexDirection: 'row',
        flex: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        backgroundColor: '#F3E5F5',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    cardContent: {
        justifyContent: 'center',
    },
    serialLabel: {
        color: '#9E9E9E',
        fontSize: 12,
    },
    sealNumber: {
        color: '#333',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    metaText: {
        color: '#757575',
        fontSize: 12,
    },
    cardRight: {
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        marginBottom: 8,
    },
    statusPending: {
        backgroundColor: '#FFF3E0',
    },
    statusSuccess: {
        backgroundColor: '#E8F5E9',
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    textPending: {
        color: '#FF9800',
    },
    textSuccess: {
        color: '#4CAF50',
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
        elevation: 20, // High elevation for shadow
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
        width: 60, // Space for the floating button
    },
    scanButton: {
        position: 'absolute',
        bottom: 25, // Fixed position relative to bottom
        alignSelf: 'center',
        width: 75,
        height: 80,
        borderRadius: 35,
        backgroundColor: '#FBC02D', // Yellow/Gold color
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
