import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { colors, sizes } from '@/constants';
import { SealReportItem } from '@/services/reportService';

const OVERDUE_DAYS = 7;

type AnomalyTab = 'overdue' | 'damaged' | 'pending';

interface AnomalyReportProps {
    items: SealReportItem[];
    onClose: () => void;
}

export const AnomalyReport: React.FC<AnomalyReportProps> = ({ items, onClose }) => {
    const [activeTab, setActiveTab] = useState<AnomalyTab>('overdue');

    const { overdueSeals, damagedLostSeals, pendingReturnSeals, totalAlerts } = useMemo(() => {
        const now = Date.now();
        const overdueDaysMs = OVERDUE_DAYS * 24 * 60 * 60 * 1000;

        const overdueSeals = items.filter(item => {
            if (item.status !== 'จ่าย') return false;
            if (!item.issued_at) return false;
            return (now - new Date(item.issued_at).getTime()) > overdueDaysMs;
        });

        const damagedLostSeals = items.filter(item =>
            item.status === 'เสียหาย' || item.status === 'สูญหาย'
        );

        const pendingReturnSeals = items.filter(item =>
            item.status === 'รอตรวจสอบคืน'
        );

        return {
            overdueSeals,
            damagedLostSeals,
            pendingReturnSeals,
            totalAlerts: overdueSeals.length + damagedLostSeals.length + pendingReturnSeals.length,
        };
    }, [items]);

    const tabs: { key: AnomalyTab; label: string; icon: string; count: number; color: string }[] = [
        { key: 'overdue', label: `ค้างจ่ายเกิน ${OVERDUE_DAYS} วัน`, icon: '⏰', count: overdueSeals.length, color: '#ff9800' },
        { key: 'damaged', label: 'เสียหาย / สูญหาย', icon: '💔', count: damagedLostSeals.length, color: '#f44336' },
        { key: 'pending', label: 'รอตรวจสอบคืน', icon: '🔄', count: pendingReturnSeals.length, color: '#2196f3' },
    ];

    const activeItems = activeTab === 'overdue' ? overdueSeals
        : activeTab === 'damaged' ? damagedLostSeals
            : pendingReturnSeals;

    const daysSince = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const diff = Date.now() - new Date(dateStr).getTime();
        return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>⚠️ รายงานซีลผิดปกติ</Text>
                    <Text style={styles.subtitle}>พบ {totalAlerts} รายการที่ต้องตรวจสอบ</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                    <Text style={styles.closeBtnText}>✕ ปิด</Text>
                </TouchableOpacity>
            </View>

            {/* Tab Buttons */}
            <View style={styles.tabRow}>
                {tabs.map(tab => (
                    <TouchableOpacity
                        key={tab.key}
                        style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                        onPress={() => setActiveTab(tab.key)}
                    >
                        <Text style={styles.tabIcon}>{tab.icon}</Text>
                        <Text style={[styles.tabLabel, activeTab === tab.key && styles.tabLabelActive]}>{tab.label}</Text>
                        {tab.count > 0 && (
                            <View style={[styles.tabBadge, { backgroundColor: tab.color }]}>
                                <Text style={styles.tabBadgeText}>{tab.count}</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Table */}
            {activeItems.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>✅</Text>
                    <Text style={styles.emptyText}>ไม่มีรายการผิดปกติในหมวดนี้</Text>
                </View>
            ) : (
                <ScrollView style={styles.tableScroll} nestedScrollEnabled>
                    {/* Table Header */}
                    <View style={styles.tableHeaderRow}>
                        <Text style={[styles.th, { flex: 1.5 }]}>หมายเลขซีล</Text>
                        <Text style={[styles.th, { flex: 1 }]}>สถานะ</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>ช่างผู้รับผิดชอบ</Text>
                        <Text style={[styles.th, { flex: 1 }]}>
                            {activeTab === 'overdue' ? 'จ่ายไปแล้ว' : activeTab === 'damaged' ? 'อัปเดตล่าสุด' : 'วันที่คืน'}
                        </Text>
                        <Text style={[styles.th, { flex: 1 }]}>หมายเหตุ</Text>
                    </View>

                    {/* Table Body */}
                    {activeItems.map((item, idx) => {
                        const daysCount = activeTab === 'overdue'
                            ? daysSince(item.issued_at)
                            : activeTab === 'pending'
                                ? daysSince(item.returned_at)
                                : daysSince(item.updated_at);

                        return (
                            <View key={item.id} style={[styles.tableRow, idx % 2 === 1 && styles.tableRowAlt]}>
                                <Text style={[styles.td, styles.sealNum, { flex: 1.5 }]}>{item.seal_number}</Text>
                                <View style={[styles.tdView, { flex: 1 }]}>
                                    <View style={[styles.statusBadge, {
                                        backgroundColor: item.status === 'เสียหาย' ? '#ffebee'
                                            : item.status === 'สูญหาย' ? '#fce4ec'
                                                : item.status === 'รอตรวจสอบคืน' ? '#e3f2fd'
                                                    : '#fff3e0'
                                    }]}>
                                        <Text style={[styles.statusText, {
                                            color: item.status === 'เสียหาย' ? '#c62828'
                                                : item.status === 'สูญหาย' ? '#ad1457'
                                                    : item.status === 'รอตรวจสอบคืน' ? '#1565c0'
                                                        : '#e65100'
                                        }]}>{item.status}</Text>
                                    </View>
                                </View>
                                <Text style={[styles.td, { flex: 1.5 }]}>{item.technician_name || '-'}</Text>
                                <View style={[styles.tdView, { flex: 1 }]}>
                                    <Text style={styles.td}>{daysCount} วัน</Text>
                                </View>
                                <Text style={[styles.td, styles.remarkTd, { flex: 1 }]} numberOfLines={2}>{item.issue_remark || '-'}</Text>
                            </View>
                        );
                    })}
                </ScrollView>
            )}
        </View>
    );
};

/** Returns total alert count for badge display */
export const getAnomalyCount = (items: SealReportItem[]): number => {
    const now = Date.now();
    const overdueDaysMs = OVERDUE_DAYS * 24 * 60 * 60 * 1000;

    let count = 0;
    items.forEach(item => {
        if (item.status === 'จ่าย' && item.issued_at && (now - new Date(item.issued_at).getTime()) > overdueDaysMs) count++;
        if (item.status === 'เสียหาย' || item.status === 'สูญหาย') count++;
        if (item.status === 'รอตรวจสอบคืน') count++;
    });
    return count;
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        maxWidth: 1200,
        backgroundColor: 'white',
        borderRadius: sizes.radiusMd,
        marginBottom: sizes.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: sizes.md,
        paddingBottom: sizes.sm,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: { fontSize: sizes.fontLg, fontWeight: 'bold', color: '#c62828' },
    subtitle: { fontSize: sizes.fontXs, color: colors.textLight, marginTop: 2 },
    closeBtn: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: sizes.radiusRound,
        backgroundColor: '#ffebee',
    },
    closeBtnText: { fontSize: sizes.fontSm, color: '#c62828', fontWeight: '600' },

    // Tabs
    tabRow: {
        flexDirection: 'row',
        padding: sizes.sm,
        paddingBottom: 0,
        gap: 8,
        flexWrap: 'wrap',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        gap: 6,
    },
    tabActive: { backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffcc80' },
    tabIcon: { fontSize: 16 },
    tabLabel: { fontSize: sizes.fontSm, color: colors.textLight, fontWeight: '500' },
    tabLabelActive: { color: '#e65100', fontWeight: 'bold' },
    tabBadge: {
        minWidth: 22,
        height: 22,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    tabBadgeText: { fontSize: 11, color: 'white', fontWeight: 'bold' },

    // Empty
    emptyContainer: { padding: sizes.xxl, alignItems: 'center' },
    emptyIcon: { fontSize: 40, marginBottom: sizes.sm },
    emptyText: { fontSize: sizes.fontSm, color: colors.textLight },

    // Table
    tableScroll: { maxHeight: 360, margin: sizes.sm },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#fafafa',
        borderBottomWidth: 2,
        borderBottomColor: '#eee',
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    th: { fontSize: 11, fontWeight: 'bold', color: colors.textLight, textTransform: 'uppercase' as any, paddingHorizontal: 6 },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        alignItems: 'center',
    },
    tableRowAlt: { backgroundColor: '#fffde7' },
    td: { fontSize: sizes.fontSm, color: colors.text, paddingHorizontal: 6 },
    tdView: { paddingHorizontal: 6, justifyContent: 'center' },
    sealNum: { fontWeight: 'bold', color: '#7c4dff' },
    remarkTd: { color: colors.textLight, fontSize: 12 },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        alignSelf: 'flex-start',
    },
    statusText: { fontSize: 11, fontWeight: 'bold' },
});
