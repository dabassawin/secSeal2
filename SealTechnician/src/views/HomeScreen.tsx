import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, TextInput, Image, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useHomeViewModel } from '../viewmodels/HomeViewModel';
import { Seal } from '../services/TechnicianService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { AuthService } from '../services/AuthService';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
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
    const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
    const [searchText, setSearchText] = useState('');

    const handleLogout = async () => {
        await AuthService.logout();
        onLogout();
    };

    const onRefresh = useCallback(() => {
        fetchSeals();
    }, []);

    const displayedSeals = (activeTab === 'pending' ? activeSeals : historySeals).filter(
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
                (item.status === 'ติดตั้งแล้ว' || item.status === 'ใช้งานแล้ว') ? styles.statusSuccess : styles.statusPending
                ]}>
                    <Text style={[styles.statusText,
                    (item.status === 'ติดตั้งแล้ว' || item.status === 'ใช้งานแล้ว') ? styles.textSuccess : styles.textPending
                    ]}>
                        {(item.status === 'ติดตั้งแล้ว' || item.status === 'ใช้งานแล้ว') ? 'ติดตั้งแล้ว' : 'ยังไม่ติดตั้ง'}
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
                                source={{ uri: 'https://via.placeholder.com/50' }}
                                style={styles.avatar}
                            />
                        </View>
                        <View style={styles.userInfo}>
                            <Text style={styles.greeting}>สวัสดี,</Text>
                            <Text style={styles.username}>{userInfo?.username || 'Technician'}</Text>
                            <View style={styles.idBadge}>
                                <Text style={styles.idText}>ID: {userInfo?.username}</Text>
                            </View>
                        </View>
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
                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Ionicons name="time-outline" size={20} color={activeTab === 'pending' ? '#6A0DAD' : '#757575'} style={{ marginRight: 8 }} />
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                            รอดำเนินการ ({activeSeals.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                        onPress={() => setActiveTab('history')}
                    >
                        <Ionicons name="checkbox-outline" size={20} color={activeTab === 'history' ? '#6A0DAD' : '#757575'} style={{ marginRight: 8 }} />
                        <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                            เสร็จสิ้นแล้ว
                        </Text>
                    </TouchableOpacity>
                </View>

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
                <TouchableOpacity style={styles.footerItem}>
                    <Ionicons name="time-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>ประวัติ</Text>
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
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 4,
        marginBottom: 16,
        elevation: 2,
    },
    tab: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#F3E5F5',
    },
    tabText: {
        color: '#757575',
        fontWeight: '600',
        fontSize: 14,
    },
    activeTabText: {
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
