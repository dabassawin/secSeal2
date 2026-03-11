import React, { useCallback, useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, Image, Dimensions, Alert, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useHomeViewModel } from '../viewmodels/HomeViewModel';
import { Seal } from '../services/TechnicianService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';
import { API_CONFIG } from '../config/api.config';
import { SealStatus } from '../constants/status';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    History: undefined;
    Notification: undefined;
    ReturnSeal: undefined;
    TransferSeal: undefined;
};


type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface HomeScreenProps {
    onLogout: () => void;
}

const { width } = Dimensions.get('window');

export default function HomeScreen({ onLogout }: HomeScreenProps) {
    const navigation = useNavigation<NavigationProp>();
    const { activeSeals, historySeals, userInfo, isLoading, error, fetchSeals } = useHomeViewModel();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'returned'>('pending');
    const [dropdownVisible, setDropdownVisible] = useState(false);
    const [searchText, setSearchText] = useState('');

    const pendingSeals = activeSeals;
    const returnedSeals = historySeals.filter(s =>
        s.status === SealStatus.USED ||
        s.status === SealStatus.PENDING_RETURN ||
        s.status === SealStatus.DAMAGED ||
        (s.status === SealStatus.READY && s.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)')
    );
    const completedSeals = historySeals.filter(s =>
        s.status === SealStatus.INSTALLED
    );

    const getTabLabel = (tab: string) => {
        if (tab === 'pending') return `รอดำเนินการ (${pendingSeals.length})`;
        if (tab === 'history') return `ติดตั้งแล้ว (${completedSeals.length})`;
        if (tab === 'returned') return `คืนแล้ว (${returnedSeals.length})`;
        return '';
    };

    const getTabIcon = (tab: string): "time-outline" | "checkmark-done-outline" | "return-down-back-outline" => {
        if (tab === 'pending') return 'time-outline';
        if (tab === 'history') return 'checkmark-done-outline';
        if (tab === 'returned') return 'return-down-back-outline';
        return 'time-outline';
    };

    const handleLogout = async () => {
        await AuthService.logout();
        onLogout();
    };

    useEffect(() => {
        fetchSeals();
    }, []);

    useEffect(() => {
        if (error === 'Invalid token' || error?.toLowerCase().includes('token')) {
            handleLogout();
        } else if (error) {
            Alert.alert('Error', error);
        }
    }, [error]);

    const getAvatarUrl = (path?: string) => {
        if (!path) return 'https://via.placeholder.com/50';
        if (path.startsWith('http')) return path;
        return `http://${API_CONFIG.SERVER_IP}:${API_CONFIG.SERVER_PORT}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    const onRefresh = useCallback(() => {
        fetchSeals();
    }, []);

    let currentSeals = pendingSeals;
    if (activeTab === 'history') currentSeals = completedSeals;
    else if (activeTab === 'returned') currentSeals = returnedSeals;

    const displayedSeals = currentSeals.filter(
        seal => seal.seal_number.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderSealItem = ({ item }: { item: Seal }) => (
        <View style={styles.card}>
            <View style={styles.cardLeft}>
                <View style={styles.iconContainer}>
                    <Ionicons name="barcode-outline" size={24} color="#6A0DAD" />
                </View>
                <View style={styles.cardContent}>
                    <Text style={styles.serialLabel}>Serial Number</Text>
                    <Text style={styles.sealNumber}>{item.seal_number}</Text>

                    <View style={styles.metaRow}>
                        <Ionicons name="cube-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>Type: Seal</Text>
                    </View>
                    <View style={styles.metaRow}>
                        <Ionicons name="time-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                        <Text style={styles.metaText}>Status: {item.status}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardRight}>
                <View style={[styles.statusBadge,
                (item.status === SealStatus.DAMAGED || item.status === SealStatus.PENDING_RETURN) ? styles.statusFailed :
                    (item.status === SealStatus.INSTALLED || item.status === SealStatus.USED || (item.status === SealStatus.READY && item.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)')) ? styles.statusSuccess : styles.statusPending
                ]}>
                    <Text style={[styles.statusText,
                    (item.status === SealStatus.DAMAGED || item.status === SealStatus.PENDING_RETURN) ? styles.textFailed :
                        (item.status === SealStatus.INSTALLED || item.status === SealStatus.USED || (item.status === SealStatus.READY && item.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)')) ? styles.textSuccess : styles.textPending
                    ]}>
                        {(item.status === SealStatus.DAMAGED || item.status === SealStatus.PENDING_RETURN) ? item.status :
                            (item.status === SealStatus.USED) ? 'คืนแล้ว' :
                                (item.status === SealStatus.READY && item.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)') ? 'คืนคลัง' :
                                    (item.status === SealStatus.INSTALLED) ? SealStatus.INSTALLED : 'ยังไม่ติดตั้ง'}
                    </Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={styles.header}>
                <SafeAreaView edges={['top']} style={styles.headerContent}>
                    <View style={styles.profileRow}>
                        <View style={styles.avatarContainer}>
                            <Image
                                source={{ uri: getAvatarUrl(undefined) }}
                                style={styles.avatar}
                            />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.greeting}>สวัสดี,</Text>
                            <Text style={styles.username}>{userInfo?.first_name ? `${userInfo.first_name} ${userInfo.last_name || ''}` : (userInfo?.username || 'Technician')}</Text>
                            <View style={styles.idBadge}>
                                <Text style={styles.idText}>ID: {userInfo?.username}</Text>
                            </View>
                        </View>
                        {userInfo?.is_center && (
                            <TouchableOpacity style={[styles.notifButton, { marginRight: 10, backgroundColor: 'rgba(255,255,255,0.3)' }]} onPress={() => navigation.navigate('TransferSeal')}>
                                <Ionicons name="swap-horizontal-outline" size={24} color="#fff" />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity style={styles.notifButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>

                {/* Stats Card Overlapping */}
                <View style={styles.statsCardWrapper}>
                    <View style={styles.statsCard}>
                        <View style={styles.statsInfo}>
                            <Text style={styles.statsLabel}>ยอดซีลคงเหลือในมือ</Text>
                            <Text style={styles.statsValue}>{activeSeals.length} <Text style={styles.statsUnit}>ชิ้น</Text></Text>
                            <Text style={styles.statsDate}>ข้อมูลล่าสุด: {new Date().toLocaleDateString('th-TH')}</Text>
                        </View>
                        <View style={styles.statsIcon}>
                            <Ionicons name="briefcase-outline" size={30} color="#6A0DAD" />
                        </View>
                    </View>
                </View>
            </View>

            {/* Content Section */}
            <View style={[styles.body, { paddingBottom: 80 + insets.bottom }]}>
                {/* Dropdown Header */}
                <TouchableOpacity
                    style={styles.dropdownHeader}
                    onPress={() => setDropdownVisible(true)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name={getTabIcon(activeTab)} size={20} color="#6A0DAD" style={{ marginRight: 8 }} />
                        <Text style={styles.dropdownHeaderText}>{getTabLabel(activeTab)}</Text>
                    </View>
                    <Ionicons name="chevron-down-outline" size={20} color="#757575" />
                </TouchableOpacity>

                {/* Dropdown Menu Modal */}
                <Modal visible={dropdownVisible} transparent={true} animationType="fade">
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDropdownVisible(false)}>
                        <View style={styles.dropdownMenu}>
                            {['pending', 'history', 'returned'].map(tab => (
                                <TouchableOpacity
                                    key={tab}
                                    style={[styles.dropdownItem, activeTab === tab && styles.dropdownItemActive]}
                                    onPress={() => {
                                        setActiveTab(tab as any);
                                        setDropdownVisible(false);
                                    }}
                                >
                                    <Ionicons name={getTabIcon(tab)} size={20} color={activeTab === tab ? '#6A0DAD' : '#757575'} style={{ marginRight: 12 }} />
                                    <Text style={[styles.dropdownItemText, activeTab === tab && styles.dropdownItemTextActive]}>
                                        {getTabLabel(tab)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                </Modal>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#9E9E9E" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาเบอร์ซีล..."
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                {/* List */}
                <FlatList
                    data={displayedSeals}
                    renderItem={renderSealItem}
                    keyExtractor={(item) => item.seal_number}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={onRefresh} colors={['#800080']} />
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={styles.emptyContainer}>
                                <Text style={styles.emptyText}>ไม่พบข้อมูล</Text>
                            </View>
                        ) : null
                    }
                />
            </View>

            {/* Custom Footer */}
            <View style={[styles.footerContainer, { paddingBottom: insets.bottom, height: 70 + insets.bottom }]}>
                {/* Home Tab */}
                <TouchableOpacity style={styles.footerItem}>
                    <Ionicons name="home" size={24} color="#6A0DAD" />
                    <Text style={[styles.footerText, styles.activeFooterText]}>หน้าหลัก</Text>
                </TouchableOpacity>

                {/* History Tab */}
                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('History')}>
                    <Ionicons name="time-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>ประวัติ</Text>
                </TouchableOpacity>

                {/* Space for Floating Button */}
                <View style={styles.footerSpace} />

                {/* Return Tab */}
                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('ReturnSeal')}>
                    <Ionicons name="arrow-undo-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>คืนซีล</Text>
                </TouchableOpacity>

                {/* Notification Tab */}
                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Notification')}>
                    <Ionicons name="notifications-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>แจ้งเตือน</Text>
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
    avatarContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#fff',
        padding: 2,
        marginRight: 15,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
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
        fontSize: 32,
        fontWeight: 'bold',
    },
    statsUnit: {
        fontSize: 16,
        color: '#757575',
        fontWeight: 'normal',
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
    body: {
        flex: 1,
        marginTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 80, // Space for footer
    },
    dropdownHeader: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        marginBottom: 16,
        elevation: 2,
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    dropdownHeaderText: {
        color: '#6A0DAD',
        fontWeight: 'bold',
        fontSize: 15,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    dropdownMenu: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    dropdownItem: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderRadius: 8,
    },
    dropdownItemActive: {
        backgroundColor: '#F3E5F5',
    },
    dropdownItemText: {
        color: '#757575',
        fontSize: 15,
        fontWeight: '500',
    },
    dropdownItemTextActive: {
        color: '#6A0DAD',
        fontWeight: 'bold',
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
    statusFailed: {
        backgroundColor: '#FFEBEE',
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
    textFailed: {
        color: '#F44336',
    },
    actionButton: {
        backgroundColor: '#fff',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#6A0DAD',
    },
    actionButtonText: {
        color: '#6A0DAD',
        fontSize: 12,
        fontWeight: 'bold',
    },
    emptyContainer: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        color: '#9E9E9E',
        fontSize: 16,
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
