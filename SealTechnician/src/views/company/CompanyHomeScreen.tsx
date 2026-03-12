import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, RefreshControl, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../../services/AuthService';
import { useHomeViewModel } from '../../viewmodels/HomeViewModel';
import DateTimePicker from '@react-native-community/datetimepicker';

type Props = {
    navigation: NativeStackNavigationProp<any>;
    onLogout: () => void;
};

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

export default function CompanyHomeScreen({ navigation, onLogout }: Props) {
    const insets = useSafeAreaInsets();
    const { notifications, userInfo, isLoading, fetchSeals } = useHomeViewModel();
    const [activeTab, setActiveTab] = useState<'receipts' | 'distributions'>('receipts');
    const [searchText, setSearchText] = useState('');
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        fetchSeals();
    }, []);

    const handleLogout = async () => {
        await AuthService.logout();
        onLogout();
    };

    const onChangeDate = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (event.type === 'set' && selectedDate) {
            setFilterDate(selectedDate);
        } else if (Platform.OS === 'ios' && selectedDate) {
            setFilterDate(selectedDate);
        }
    };

    const clearDateFilter = () => setFilterDate(null);

    // Helper to group by date
    const groupByDate = (logs: any[]) => {
        const groups: { [key: string]: any[] } = {};
        logs.forEach(log => {
            const date = new Date(log.created_at);
            const key = isNaN(date.getTime()) ? 'ไม่ระบุวันที่' : `${date.getDate()} ${['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'][date.getMonth()]} ${date.getFullYear() + 543}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(log);
        });
        return Object.keys(groups).map(key => ({ title: key, data: groups[key] }));
    };

    const filteredNotifications = useMemo(() => {
        return notifications.filter(n => {
            const matchesSearch = n.action.toLowerCase().includes(searchText.toLowerCase());
            
            let matchesDate = true;
            if (filterDate) {
                const nDate = new Date(n.created_at);
                matchesDate = nDate.getDate() === filterDate.getDate() &&
                              nDate.getMonth() === filterDate.getMonth() &&
                              nDate.getFullYear() === filterDate.getFullYear();
            }

            return matchesSearch && matchesDate;
        });
    }, [notifications, searchText, filterDate]);

    const allReceipts = useMemo(() => 
        filteredNotifications.filter(n => 
            n.action.includes('ได้รับ') || 
            (n.action.includes('จ่าย') && n.action.includes(userInfo?.username || '87654321'))
        ), [filteredNotifications, userInfo]);

    const allDistributions = useMemo(() => 
        filteredNotifications.filter(n => 
            (n.action.includes('จ่าย') || n.action.includes('โอน')) && 
            !n.action.includes(userInfo?.username || '87654321')
        ), [filteredNotifications, userInfo]);

    const groupedReceipts = useMemo(() => groupByDate(allReceipts), [allReceipts]);
    const groupedDistributions = useMemo(() => groupByDate(allDistributions), [allDistributions]);

    const renderLogItem = (log: any, iconName: any, iconColor: string) => {
        let actionText = log.action.replace('โอนซีล', 'จ่ายซีล');
        actionText = actionText.replace('ไปให้ช่าง', 'ให้ช่าง');
        
        // Handle Company ID specific formatting for receipts
        const companyId = userInfo?.username || '87654321';
        if (actionText.includes(companyId)) {
            // "จ่ายซีล T3 ให้ช่าง 87654321" -> "รับซีล T3"
            actionText = actionText.replace('จ่ายซีล', 'รับซีล');
            actionText = actionText.replace(`ให้ช่าง ${companyId}`, '').trim();
            actionText = actionText.replace(`ให้ช่าง${companyId}`, '').trim(); // Handle missing space
        }

        return (
            <View key={log.id} style={styles.logCard}>
                <View style={[styles.logIconContainer, { backgroundColor: iconColor + '15' }]}>
                    <Ionicons name={iconName} size={18} color={iconColor} />
                </View>
                <View style={styles.logContent}>
                    <Text style={styles.logAction} numberOfLines={2}>{actionText}</Text>
                    <Text style={styles.logTimeOnly}>{new Date(log.created_at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</Text>
                </View>
            </View>
        );
    };

    const renderSectionContent = (data: any[], emptyText: string, iconColor: string, logIcon: any) => (
        <View style={styles.logBox}>
            {data.length > 0 ? (
                data.map((group, gIdx) => (
                    <View key={group.title + gIdx}>
                        <View style={styles.dateHeader}>
                            <Ionicons name="calendar-outline" size={14} color="#6A0DAD" style={{ marginRight: 6 }} />
                            <Text style={styles.dateHeaderText}>{group.title}</Text>
                        </View>
                        {group.data.map((log: any) => renderLogItem(log, logIcon, iconColor))}
                    </View>
                ))
            ) : (
                <View style={styles.emptyInternal}>
                    <Ionicons name="document-text-outline" size={40} color="#E0E0E0" />
                    <Text style={styles.emptyText}>{emptyText}</Text>
                </View>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={styles.header}>
                <View style={[styles.headerContent, { paddingTop: insets.top + 20 }]}>
                    <View style={styles.profileRow}>
                        <View style={styles.userInfo}>
                            <Text style={styles.greeting}>สวัสดี,</Text>
                            <Text style={styles.username}>{userInfo?.first_name ? `${userInfo.first_name} ${userInfo.last_name}` : 'ศูนย์งาน / ตัวแทน'}</Text>
                            <View style={styles.idBadge}>
                                <Text style={styles.idText}>Company Dashboard</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                            <Ionicons name="log-out-outline" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Decorative Summary Card */}
                <View style={styles.summaryCardWrapper}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>รายการรับซีล</Text>
                            <Text style={styles.summaryValue}>{allReceipts.length}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>รายการจ่ายซีล</Text>
                            <Text style={styles.summaryValue}>{allDistributions.length}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* Filter & Tab Wrapper with Light Background Tint */}
            <View style={styles.filterWrapper}>
                {/* Tab Selector */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'receipts' && styles.activeTabButton]} 
                        onPress={() => setActiveTab('receipts')}
                    >
                        <Ionicons name="download-outline" size={20} color={activeTab === 'receipts' ? '#fff' : '#6A0DAD'} />
                        <Text style={[styles.tabText, activeTab === 'receipts' && styles.activeTabText]}>รับซีล</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tabButton, activeTab === 'distributions' && styles.activeTabButton]} 
                        onPress={() => setActiveTab('distributions')}
                    >
                        <Ionicons name="send-outline" size={20} color={activeTab === 'distributions' ? '#fff' : '#6A0DAD'} />
                        <Text style={[styles.tabText, activeTab === 'distributions' && styles.activeTabText]}>จ่ายซีล</Text>
                    </TouchableOpacity>
                </View>

                {/* Filter Section with Background Frame */}
                <View style={styles.filterSection}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#9E9E9E" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ค้นหาชื่อซีล..."
                            value={searchText}
                            onChangeText={setSearchText}
                        />
                    </View>
                    
                    <TouchableOpacity 
                        style={[styles.dateFilterButton, filterDate && styles.activeDateFilter]} 
                        onPress={() => setShowDatePicker(true)}
                    >
                        <View style={styles.dateLabelGroup}>
                            <Ionicons name="calendar-outline" size={18} color={filterDate ? '#fff' : '#6A0DAD'} />
                            <Text style={[styles.dateFilterText, filterDate && styles.activeDateText]}>
                                {filterDate 
                                    ? `วันที่: ${filterDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}` 
                                    : 'ทั้งหมด (เลือกวันที่)'}
                            </Text>
                        </View>
                        {filterDate && (
                            <TouchableOpacity onPress={(e) => { e.stopPropagation(); clearDateFilter(); }} style={styles.clearDateBtn}>
                                <Ionicons name="close-circle" size={20} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </TouchableOpacity>
                </View>
            </View>

            {showDatePicker && (
                <DateTimePicker
                    value={filterDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={onChangeDate}
                />
            )}

            {/* Scrollable Content */}
            <ScrollView
                style={styles.content}
                contentContainerStyle={[styles.scrollPadding, { paddingBottom: 120 + insets.bottom }]}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isLoading} onRefresh={fetchSeals} colors={['#6A0DAD']} />
                }
            >
                {activeTab === 'receipts' ? (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="download-outline" size={20} color="#6A0DAD" />
                                <Text style={styles.sectionTitle}>ประวัติการรับซีล</Text>
                            </View>
                        </View>
                        {renderSectionContent(groupedReceipts, "ไม่มีรายการรับซีล", "#4CAF50", "arrow-down-circle")}
                    </View>
                ) : (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="send-outline" size={20} color="#6A0DAD" />
                                <Text style={styles.sectionTitle}>ประวัติการจ่ายซีล</Text>
                            </View>
                        </View>
                        {renderSectionContent(groupedDistributions, "ไม่มีรายการจ่ายซีล", "#6A0DAD", "arrow-up-circle")}
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FB',
    },
    header: {
        backgroundColor: '#6A0DAD',
        paddingBottom: 60,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
    },
    headerContent: {
        paddingHorizontal: 25,
        paddingBottom: 20,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userInfo: {
        flex: 1,
    },
    greeting: {
        color: '#E0B0FF',
        fontSize: 14,
        fontWeight: '500',
    },
    username: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 2,
    },
    idBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    idText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: 'bold',
    },
    logoutButton: {
        width: 45,
        height: 45,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryCardWrapper: {
        position: 'absolute',
        bottom: -35,
        left: 20,
        right: 20,
        zIndex: 10,
    },
    summaryCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryLabel: {
        color: '#757575',
        fontSize: 12,
        marginBottom: 4,
    },
    summaryValue: {
        color: '#6A0DAD',
        fontSize: 20,
        fontWeight: 'bold',
    },
    divider: {
        width: 1,
        height: 30,
        backgroundColor: '#F0F0F0',
    },
    statusOn: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        marginRight: 6,
    },
    statusText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: 'bold',
    },
    content: {
        flex: 1,
    },
    scrollPadding: {
        paddingTop: 55,
        paddingHorizontal: 20,
    },
    filterWrapper: {
        backgroundColor: '#F3E5F5',
        marginHorizontal: 15,
        marginTop: 45,
        paddingVertical: 15,
        borderRadius: 25,
    },
    filterSection: {
        paddingHorizontal: 15,
        marginTop: 10,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    dateFilterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 48,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    dateLabelGroup: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dateFilterText: {
        fontSize: 14,
        color: '#6A0DAD',
        fontWeight: '600',
        marginLeft: 10,
    },
    activeDateFilter: {
        backgroundColor: '#6A0DAD',
        borderColor: '#6A0DAD',
    },
    activeDateText: {
        color: '#fff',
    },
    clearDateBtn: {
        marginLeft: 10,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.4)',
        marginHorizontal: 15,
        borderRadius: 15,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        marginHorizontal: 2, // Added gap
    },
    activeTabButton: {
        backgroundColor: '#6A0DAD',
    },
    tabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#6A0DAD',
        marginLeft: 8,
    },
    activeTabText: {
        color: '#fff',
    },
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 5,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
    },
    viewAll: {
        fontSize: 12,
        color: '#9E9E9E',
    },
    logBox: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 10,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    logCard: {
        flexDirection: 'row',
        padding: 12,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F8F8F8',
    },
    logIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    logContent: {
        flex: 1,
    },
    logAction: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
        marginBottom: 4,
        lineHeight: 20,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logTime: {
        fontSize: 11,
        color: '#9E9E9E',
    },
    emptyInternal: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 30,
    },
    emptyText: {
        color: '#BDBDBD',
        fontSize: 14,
        marginTop: 10,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        marginHorizontal: 10,
        marginTop: 10,
        borderRadius: 8,
    },
    dateHeaderText: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#6A0DAD',
    },
    logTimeOnly: {
        fontSize: 11,
        color: '#9E9E9E',
        marginTop: 2,
    },
});
