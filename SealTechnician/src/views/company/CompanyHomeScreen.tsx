import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator, RefreshControl, TextInput, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AuthService } from '../../services/AuthService';
import { useHomeViewModel } from '../../viewmodels/HomeViewModel';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TechnicianService } from '../../services/TechnicianService';
import { Alert } from 'react-native';
import { useRealtime } from '../../hooks/useRealtime';

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
    const { notifications, userInfo, isLoading, fetchSeals, waitConfirmationSeals, confirmMultipleSeals } = useHomeViewModel();
    const [activeTab, setActiveTab] = useState<'receipts' | 'distributions' | 'confirmation'>('confirmation');
    const [selectedSeals, setSelectedSeals] = useState<string[]>([]);
    const [isTabDropdownOpen, setIsTabDropdownOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        fetchSeals();
    }, []);

    // ✅ Real-time Updates
    useRealtime(userInfo?.pea_code, (msg: string) => {
        if (msg === 'seal_updated') {
            fetchSeals();
        }
    });

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

    const toggleSelectAll = () => {
        if (selectedSeals.length === waitConfirmationSeals.length) {
            setSelectedSeals([]);
        } else {
            setSelectedSeals(waitConfirmationSeals.map(s => s.seal_number));
        }
    };

    const toggleSealSelection = (sealNumber: string) => {
        setSelectedSeals(prev =>
            prev.includes(sealNumber)
                ? prev.filter(s => s !== sealNumber)
                : [...prev, sealNumber]
        );
    };

    const handleBulkConfirm = async () => {
        if (selectedSeals.length === 0) return;
        Alert.alert(
            "ยืนยันรับโอนซีล",
            `คุณต้องการยืนยันการรับโอนซีลที่เลือกทั้งหมดจำนวน ${selectedSeals.length} ชิ้น ใช่หรือไม่?`,
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ยืนยัน",
                    onPress: async () => {
                        try {
                            await confirmMultipleSeals(selectedSeals);
                            setSelectedSeals([]);
                            fetchSeals();
                            Alert.alert("สำเร็จ", "ยืนยันการรับโอนซีลเรียบร้อยแล้ว");
                        } catch (error: any) {
                            Alert.alert("ผิดพลาด", error.message || "ไม่สามารถยืนยันได้");
                        }
                    }
                }
            ]
        );
    };

    const handleClearHistory = async () => {
        Alert.alert(
            "ยืนยันการล้างประวัติ",
            "คุณต้องการล้างประวัติการรับและจ่ายซีลทั้งหมดใช่หรือไม่? (การกระทำนี้ไม่สามารถย้อนกลับได้)",
            [
                { text: "ยกเลิก", style: "cancel" },
                {
                    text: "ล้างประวัติ",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await TechnicianService.clearNotifications();
                            fetchSeals(); // Refresh the list
                            Alert.alert("สำเร็จ", "ล้างประวัติเรียบร้อยแล้ว");
                        } catch (error: any) {
                            Alert.alert("ผิดพลาด", error.message || "ไม่สามารถล้างประวัติได้");
                        }
                    }
                }
            ]
        );
    };

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
        filteredNotifications.filter(n => {
            if (n.action.includes('รอยืนยัน')) return false;
            // For company admin: only show confirmed receipts ('รับซีล') not pre-transfer logs ('ได้รับโอนซีล')
            if (userInfo?.is_center) {
                return n.action.includes('รับซีล') || n.action.includes('ยืนยันรับโอนซีล');
            }
            return n.action.includes('ได้รับ') ||
                n.action.includes('ยืนยันรับ') ||
                (n.action.includes('จ่าย') && n.action.includes(userInfo?.username || '87654321'));
        }), [filteredNotifications, userInfo]);

    const allDistributions = useMemo(() =>
        filteredNotifications.filter(n =>
            !n.action.includes('รอยืนยัน') &&
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
                        <TouchableOpacity
                            style={styles.summaryItem}
                            onPress={() => {
                                setActiveTab('confirmation');
                                setIsTabDropdownOpen(false);
                            }}
                        >
                            <Text style={[styles.summaryLabel, waitConfirmationSeals.length > 0 && { color: '#FF9800', fontWeight: 'bold' }]}>รอยืนยัน (รับโอน)</Text>
                            <Text style={[styles.summaryValue, waitConfirmationSeals.length > 0 && { color: '#FF9800' }]}>{waitConfirmationSeals.length}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Tab Selector & Filter Section */}
            <View style={styles.filterWrapper}>
                {/* Modern Full-Width Strip Dropdown */}
                <View style={styles.tabHeaderRow}>
                    <TouchableOpacity
                        style={styles.currentTabSelectorStrip}
                        onPress={() => setIsTabDropdownOpen(!isTabDropdownOpen)}
                    >
                        <View style={styles.currentTabInfo}>
                            <Ionicons
                                name={
                                    activeTab === 'confirmation' ? "checkmark-done-circle" :
                                        activeTab === 'receipts' ? "download" : "send"
                                }
                                size={22}
                                color="#fff"
                            />
                            <Text style={styles.currentTabTextStrip}>
                                {activeTab === 'confirmation' ? 'ยืนยันรับโอนซีล' : activeTab === 'receipts' ? 'ประวัติการรับซีล' : 'ประวัติการจ่ายซีล'}
                            </Text>
                        </View>
                        <Ionicons name={isTabDropdownOpen ? "chevron-up" : "chevron-down"} size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                {isTabDropdownOpen && (
                    <View style={styles.tabDropdown}>
                        <TouchableOpacity
                            style={[styles.dropdownItem, activeTab === 'confirmation' && styles.dropdownItemActive]}
                            onPress={() => { setActiveTab('confirmation'); setIsTabDropdownOpen(false); }}
                        >
                            <Ionicons name="checkmark-done-circle-outline" size={20} color={activeTab === 'confirmation' ? '#6A0DAD' : '#757575'} />
                            <Text style={[styles.dropdownItemText, activeTab === 'confirmation' && styles.dropdownItemTextActive]}>ยืนยันซีล</Text>
                            {waitConfirmationSeals.length > 0 && (
                                <View style={styles.dropdownBadge}>
                                    <Text style={styles.dropdownBadgeText}>{waitConfirmationSeals.length}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.dropdownItem, activeTab === 'receipts' && styles.dropdownItemActive]}
                            onPress={() => { setActiveTab('receipts'); setIsTabDropdownOpen(false); }}
                        >
                            <Ionicons name="download-outline" size={20} color={activeTab === 'receipts' ? '#6A0DAD' : '#757575'} />
                            <Text style={[styles.dropdownItemText, activeTab === 'receipts' && styles.dropdownItemTextActive]}>ประวัติรับซีล</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.dropdownItem, activeTab === 'distributions' && styles.dropdownItemActive]}
                            onPress={() => { setActiveTab('distributions'); setIsTabDropdownOpen(false); }}
                        >
                            <Ionicons name="send-outline" size={20} color={activeTab === 'distributions' ? '#6A0DAD' : '#757575'} />
                            <Text style={[styles.dropdownItemText, activeTab === 'distributions' && styles.dropdownItemTextActive]}>ประวัติจ่ายซีล</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.dividerFull} />

                {/* Filter Section */}
                <View style={styles.filterSection}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search-outline" size={18} color="#9E9E9E" style={{ marginRight: 8 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ค้นหาเบอร์ซีล หรือชื่อช่าง..."
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
                                    : 'กรองตามวันที่'}
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
                {activeTab === 'confirmation' ? (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="checkmark-done-circle" size={20} color="#6A0DAD" />
                                <Text style={styles.sectionTitle}>รายการรอยืนยัน ({waitConfirmationSeals.length})</Text>
                            </View>
                            {waitConfirmationSeals.length > 0 && (
                                <View style={styles.actionRow}>
                                    <TouchableOpacity onPress={toggleSelectAll} style={styles.selectAllBtn}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Ionicons
                                                name={selectedSeals.length === waitConfirmationSeals.length ? "checkbox" : "square-outline"}
                                                size={16}
                                                color="#6A0DAD"
                                                style={{ marginRight: 4 }}
                                            />
                                            <Text style={styles.selectAllBtnText}>
                                                {selectedSeals.length === waitConfirmationSeals.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={handleBulkConfirm}
                                        disabled={selectedSeals.length === 0}
                                        style={[styles.confirmBtn, selectedSeals.length === 0 && styles.confirmBtnDisabled]}
                                    >
                                        <Text style={styles.confirmBtnText}>ยืนยัน ({selectedSeals.length})</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        <View style={styles.logBox}>
                            {waitConfirmationSeals.length > 0 ? (
                                waitConfirmationSeals.map((seal) => (
                                    <TouchableOpacity
                                        key={seal.seal_number}
                                        style={[styles.logCard, selectedSeals.includes(seal.seal_number) && styles.selectedSealCard]}
                                        onPress={() => toggleSealSelection(seal.seal_number)}
                                    >
                                        <View style={[styles.selectionBox, selectedSeals.includes(seal.seal_number) && styles.selectedBoxActive]}>
                                            {selectedSeals.includes(seal.seal_number) && <Ionicons name="checkmark" size={14} color="#fff" />}
                                        </View>
                                        <View style={styles.logContent}>
                                            <Text style={styles.logAction}>เบอร์ซีล: {seal.seal_number}</Text>
                                        </View>
                                        <View style={styles.waitBadge}>
                                            <Text style={styles.waitBadgeText}>รอยืนยัน</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <View style={styles.emptyInternal}>
                                    <Ionicons name="checkmark-circle-outline" size={40} color="#E0E0E0" />
                                    <Text style={styles.emptyText}>ไม่มีรายการรอการยืนยัน</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ) : activeTab === 'receipts' ? (
                    <View style={styles.section}>
                        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="download-outline" size={20} color="#6A0DAD" />
                                <Text style={styles.sectionTitle}>ประวัติการรับซีล</Text>
                            </View>
                            <TouchableOpacity onPress={handleClearHistory} style={styles.clearHistoryButton}>
                                <Ionicons name="trash-outline" size={14} color="#FF5252" />
                                <Text style={styles.clearHistoryText}>ล้างประวัติ</Text>
                            </TouchableOpacity>
                        </View>
                        {renderSectionContent(groupedReceipts, "ไม่มีรายการรับซีล", "#4CAF50", "arrow-down-circle")}
                    </View>
                ) : (
                    <View style={styles.section}>
                        <View style={[styles.sectionHeader, { flexDirection: 'row', justifyContent: 'space-between' }]}>
                            <View style={styles.sectionTitleRow}>
                                <Ionicons name="send-outline" size={20} color="#6A0DAD" />
                                <Text style={styles.sectionTitle}>ประวัติการจ่ายซีล</Text>
                            </View>
                            <TouchableOpacity onPress={handleClearHistory} style={styles.clearHistoryButton}>
                                <Ionicons name="trash-outline" size={14} color="#FF5252" />
                                <Text style={styles.clearHistoryText}>ล้างประวัติ</Text>
                            </TouchableOpacity>
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
        marginTop: 4,
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
    tabHeaderRow: {
        paddingHorizontal: 15,
        marginBottom: 6,
    },
    currentTabSelectorStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#6A0DAD',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 15,
        elevation: 4,
        shadowColor: '#6A0DAD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    currentTabInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentTabTextStrip: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginLeft: 12,
    },
    tabDropdown: {
        backgroundColor: '#fff',
        marginHorizontal: 15,
        marginTop: -10,
        marginBottom: 20,
        borderRadius: 15,
        padding: 5,
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#F0F0F0',
        zIndex: 10,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 10,
    },
    dropdownItemActive: {
        backgroundColor: '#F3E5F5',
    },
    dropdownItemText: {
        fontSize: 15,
        color: '#757575',
        marginLeft: 12,
        flex: 1,
    },
    dropdownItemTextActive: {
        color: '#6A0DAD',
        fontWeight: 'bold',
    },
    dropdownBadge: {
        backgroundColor: '#FF5252',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    dropdownBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    dividerFull: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 15,
        marginTop: 0,
        marginBottom: 8,
        opacity: 0.5,
    },
    tabContainer: {
        // Obsolete
    },
    tabButton: {
        // Obsolete
    },
    activeTabButton: {
        // Obsolete
    },
    tabText: {
        // Obsolete
    },
    activeTabText: {
        // Obsolete
    },
    section: {
        marginBottom: 25,
    },
    sectionHeader: {
        flexDirection: 'column',
        marginBottom: 12,
        paddingHorizontal: 5,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
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
    clearHistoryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: '#FFEAEA',
    },
    clearHistoryText: {
        fontSize: 12,
        color: '#FF5252',
        fontWeight: 'bold',
        marginLeft: 4,
    },
    badgeCount: {
        position: 'absolute',
        top: 2,
        right: 2,
        backgroundColor: '#FF5252',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 1.5,
        borderColor: '#F3E5F5',
    },
    badgeCountText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    selectAllBtn: {
        marginRight: 10,
    },
    selectAllBtnText: {
        fontSize: 12,
        color: '#6A0DAD',
        fontWeight: 'bold',
    },
    confirmBtn: {
        backgroundColor: '#4CAF50',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    confirmBtnDisabled: {
        backgroundColor: '#BDBDBD',
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },
    selectionBox: {
        width: 20,
        height: 20,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        marginRight: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedBoxActive: {
        backgroundColor: '#6A0DAD',
        borderColor: '#6A0DAD',
    },
    selectedSealCard: {
        backgroundColor: '#F3E5F5',
    },
    waitBadge: {
        backgroundColor: '#FFF8E1',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    waitBadgeText: {
        fontSize: 10,
        color: '#FFA000',
        fontWeight: 'bold',
    },
});
