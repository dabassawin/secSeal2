import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, RefreshControl, TouchableOpacity, TextInput, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useHomeViewModel } from '../viewmodels/HomeViewModel';
import { Seal } from '../services/TechnicianService';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SealStatus } from '../constants/status';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    History: undefined;
    Notification: undefined;
    ReturnSeal: undefined;
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

const formatGroupDate = (dateString?: string) => {
    if (!dateString) return 'ไม่ระบุวันที่';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'ไม่ระบุวันที่';

    const day = date.getDate();
    const month = date.getMonth();
    const year = date.getFullYear() + 543;
    const monthStr = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    return `${day} ${monthStr[month]} ${year}`;
};

export default function HistoryScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { historySeals, activeSeals, isLoading, fetchSeals } = useHomeViewModel();
    const insets = useSafeAreaInsets();
    const [searchText, setSearchText] = useState('');
    const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'returned'>('pending');

    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    const onRefresh = useCallback(() => {
        fetchSeals();
    }, []);

    const groupedData = useMemo(() => {
        let sourceData: Seal[] = [];
        if (activeTab === 'pending') {
            sourceData = [...activeSeals, ...historySeals];
        } else if (activeTab === 'history') {
            sourceData = historySeals.filter(s => s.status === SealStatus.INSTALLED || s.used_at);
        } else {
            sourceData = historySeals.filter(s =>
                s.status === SealStatus.USED ||
                s.status === SealStatus.DAMAGED ||
                s.status === SealStatus.PENDING_RETURN ||
                (s.status === SealStatus.READY && s.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)')
            );
        }

        const filteredData = sourceData.filter(seal => {
            const matchesText = seal.seal_number.toLowerCase().includes(searchText.toLowerCase());

            let matchesDate = true;
            if (filterDate) {
                const sealDateStr = activeTab === 'pending' ? seal.issued_at : (seal.used_at || seal.returned_at || seal.issued_at);
                if (!sealDateStr) {
                    matchesDate = false;
                } else {
                    const sealD = new Date(sealDateStr);
                    matchesDate = sealD.getDate() === filterDate.getDate() &&
                        sealD.getMonth() === filterDate.getMonth() &&
                        sealD.getFullYear() === filterDate.getFullYear();
                }
            }

            return matchesText && matchesDate;
        }).sort((a, b) => {
            // Sort by relevant date (newest first)
            const dateA = activeTab === 'pending' ? a.issued_at : (a.used_at || a.returned_at || a.issued_at);
            const dateB = activeTab === 'pending' ? b.issued_at : (b.used_at || b.returned_at || b.issued_at);
            const timeA = dateA ? new Date(dateA).getTime() : 0;
            const timeB = dateB ? new Date(dateB).getTime() : 0;
            return timeB - timeA;
        });

        const groups: { [key: string]: Seal[] } = {};
        filteredData.forEach(seal => {
            const dateToUse = activeTab === 'pending' ? seal.issued_at : (seal.used_at || seal.returned_at || seal.issued_at);
            const groupKey = formatGroupDate(dateToUse);
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(seal);
        });

        return Object.keys(groups).map(key => ({
            title: key,
            data: groups[key]
        }));
    }, [activeSeals, historySeals, activeTab, searchText, filterDate]);

    const onChangeDate = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');

        // Android dismisses the picker when canceled, we don't want to set the date in that case
        if (event.type === 'set' && selectedDate) {
            setFilterDate(selectedDate);
        } else if (event.type === 'dismissed') {
            // Do nothing on Android when dismissed
        } else if (Platform.OS === 'ios' && selectedDate) {
            // iOS doesn't give a type, we rely on selectedDate
            setFilterDate(selectedDate);
        }
    };

    const clearDateFilter = () => {
        setFilterDate(null);
    };

    const renderLogItem = ({ item }: { item: Seal }) => {
        const isCompleted = item.status !== SealStatus.ISSUED && !(item.status === SealStatus.READY && item.return_remarks !== 'ไม่ได้ใช้งาน (คืนคลัง)');

        let displayStatus = item.status;
        if (item.status === SealStatus.ISSUED || (item.status === SealStatus.READY && item.return_remarks !== 'ไม่ได้ใช้งาน (คืนคลัง)')) {
            displayStatus = 'ยังไม่ติดตั้ง';
        } else if (item.status === SealStatus.INSTALLED) {
            displayStatus = SealStatus.INSTALLED;
        } else if (item.status === SealStatus.USED) {
            displayStatus = 'คืนแล้ว';
        } else if (item.status === SealStatus.DAMAGED) {
            displayStatus = SealStatus.DAMAGED;
        } else if (item.status === SealStatus.PENDING_RETURN) {
            displayStatus = SealStatus.PENDING_RETURN;
        } else if (item.status === SealStatus.READY && item.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)') {
            displayStatus = 'คืนคลัง';
        }

        let iconName: any = "time-outline";
        let iconColor = "#FF9800";
        let statusStyle = styles.statusPending;
        let textStyle = styles.textPending;

        if (isCompleted) {
            if (item.status === SealStatus.DAMAGED || item.status === SealStatus.PENDING_RETURN) {
                iconName = "close-circle-outline";
                iconColor = "#F44336";
                statusStyle = styles.statusFailed;
                textStyle = styles.textFailed;
            } else if (item.status === SealStatus.USED || (item.status === SealStatus.READY && item.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)')) {
                iconName = "return-down-back-outline";
                iconColor = "#FF9800";
                statusStyle = styles.statusPending; // orange-ish
                textStyle = styles.textPending;
            } else {
                iconName = "checkmark-circle-outline";
                iconColor = "#4CAF50";
                statusStyle = styles.statusSuccess;
                textStyle = styles.textSuccess;
            }
        }

        return (
            <View style={styles.card}>
                <View style={styles.cardLeft}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={iconName} size={24} color={iconColor} />
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
                        {item.returned_at && (
                            <View style={styles.metaRow}>
                                <Ionicons name="calendar-outline" size={14} color="#757575" style={{ marginRight: 4 }} />
                                <Text style={styles.metaText}>วันที่คืน: {formatDate(item.returned_at)}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.cardRight}>
                    <View style={[styles.statusBadge, statusStyle]}>
                        <Text style={[styles.statusText, textStyle]}>
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
                {/* Tabs */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'pending' && styles.activeTab]}
                        onPress={() => setActiveTab('pending')}
                    >
                        <Ionicons name="time-outline" size={16} color={activeTab === 'pending' ? '#6A0DAD' : '#757575'} style={{ marginRight: 4 }} />
                        <Text style={[styles.tabText, activeTab === 'pending' && styles.activeTabText]}>
                            ซีลที่ถูกจ่าย
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'history' && styles.activeTab]}
                        onPress={() => setActiveTab('history')}
                    >
                        <Ionicons name="checkmark-done-outline" size={16} color={activeTab === 'history' ? '#6A0DAD' : '#757575'} style={{ marginRight: 4 }} />
                        <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
                            ติดตั้งแล้ว
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'returned' && styles.activeTab]}
                        onPress={() => setActiveTab('returned')}
                    >
                        <Ionicons name="return-down-back-outline" size={16} color={activeTab === 'returned' ? '#6A0DAD' : '#757575'} style={{ marginRight: 4 }} />
                        <Text style={[styles.tabText, activeTab === 'returned' && styles.activeTabText]}>
                            คืนแล้ว
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Search */}
                <View style={[styles.searchContainer, { marginBottom: 8 }]}>
                    <Ionicons name="search-outline" size={20} color="#9E9E9E" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาเบอร์ซีลในประวัติ..."
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                {/* Date Filter */}
                <View style={styles.dateFilterContainer}>
                    <TouchableOpacity
                        style={styles.dateFilterButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Ionicons name="calendar-outline" size={20} color="#6A0DAD" style={{ marginRight: 8 }} />
                        <Text style={styles.dateFilterText}>
                            {filterDate ? formatGroupDate(filterDate.toISOString()) : 'ทั้งหมด (เลือกวันที่)'}
                        </Text>
                    </TouchableOpacity>

                    {filterDate && (
                        <TouchableOpacity style={styles.clearDateButton} onPress={clearDateFilter}>
                            <Ionicons name="close-circle" size={20} color="#757575" />
                        </TouchableOpacity>
                    )}
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={filterDate || new Date()}
                        mode="date"
                        display="default"
                        onChange={onChangeDate}
                    />
                )}

                {/* List */}
                <SectionList
                    sections={groupedData}
                    renderItem={renderLogItem}
                    renderSectionHeader={({ section: { title } }) => (
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionHeaderText}>{title}</Text>
                        </View>
                    )}
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
    dateFilterContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    dateFilterButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E5F5',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E1BEE7',
    },
    dateFilterText: {
        color: '#6A0DAD',
        fontSize: 14,
        fontWeight: 'bold',
    },
    clearDateButton: {
        marginLeft: 8,
        padding: 10,
        backgroundColor: '#fff',
        borderRadius: 12,
        elevation: 1,
    },
    sectionHeader: {
        backgroundColor: '#f5f5f5',
        paddingVertical: 8,
        paddingHorizontal: 4,
        marginBottom: 8,
    },
    sectionHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#6A0DAD',
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
