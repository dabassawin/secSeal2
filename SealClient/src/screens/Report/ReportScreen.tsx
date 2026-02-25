import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, ActivityIndicator,
    TouchableOpacity, TextInput, Platform
} from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { SealStatement, StatementItem } from '@/types';
import { useAuth } from '@/context/AuthContext';

// ─── Status Badge ───────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const map: Record<string, { bg: string; text: string }> = {
        'พร้อมใช้งาน': { bg: '#E8F5E9', text: '#2E7D32' },
        'จ่าย': { bg: '#E3F2FD', text: '#1565C0' },
        'ติดตั้งแล้ว': { bg: '#FFF3E0', text: '#E65100' },
        'ใช้งานแล้ว': { bg: '#F3E5F5', text: '#7B1FA2' },
        'เสียหาย': { bg: '#FFEBEE', text: '#C62828' },
        'สูญหาย': { bg: '#FFEBEE', text: '#C62828' },
    };
    const c = map[status] || { bg: '#F5F5F5', text: '#666' };
    return (
        <View style={[styles.badge, { backgroundColor: c.bg }]}>
            <Text style={[styles.badgeText, { color: c.text }]}>{status}</Text>
        </View>
    );
};

// ─── Summary Card ───────────────────────────────────────────────────
const SummaryCard: React.FC<{ label: string; count: number; color: string; icon: string }> = ({ label, count, color, icon }) => (
    <View style={[styles.summaryCard, { borderLeftColor: color }]}>
        <Text style={styles.summaryIcon}>{icon}</Text>
        <View style={{ flex: 1 }}>
            <Text style={styles.summaryCount}>{count.toLocaleString()}</Text>
            <Text style={styles.summaryLabel}>{label}</Text>
        </View>
    </View>
);

// ─── Main Screen ────────────────────────────────────────────────────
export const ReportScreen: React.FC = () => {
    const { user } = useAuth();
    const peaCode = user?.pea_code as string | undefined;

    // Date state (YYYY-MM-DD strings)
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

    const [startDate, setStartDate] = useState(thirtyDaysAgo);
    const [endDate, setEndDate] = useState(today);
    const [data, setData] = useState<SealStatement | null>(null);
    const [loading, setLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    const fetchStatement = useCallback(async () => {
        setLoading(true);
        setHasSearched(true);
        try {
            const result = await sealService.getStatement(peaCode, startDate, endDate);
            setData(result);
        } catch (e) {
            console.error('Statement fetch error', e);
        } finally {
            setLoading(false);
        }
    }, [peaCode, startDate, endDate]);

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const formatDateTime = (dateStr: string | null) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
            + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    };

    const summaryCards = data ? [
        { label: 'พร้อมใช้งาน', count: data.summary['พร้อมใช้งาน'] || 0, color: '#4CAF50', icon: '✅' },
        { label: 'จ่าย (Assigned)', count: data.summary['จ่าย'] || 0, color: '#2196F3', icon: '📦' },
        { label: 'ติดตั้งแล้ว', count: data.summary['ติดตั้งแล้ว'] || 0, color: '#FF9800', icon: '🔧' },
        { label: 'ใช้งานแล้ว', count: data.summary['ใช้งานแล้ว'] || 0, color: '#9C27B0', icon: '🏷️' },
        { label: 'เสียหาย', count: data.summary['เสียหาย'] || 0, color: '#F44336', icon: '⚠️' },
        { label: 'สูญหาย', count: data.summary['สูญหาย'] || 0, color: '#F44336', icon: '❌' },
    ] : [];

    return (
        <View style={styles.mainContainer}>
            <Header />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

                {/* Title */}
                <View style={styles.titleRow}>
                    <Text style={styles.titleIcon}>📊</Text>
                    <View>
                        <Text style={styles.title}>รายงานซีล (Statement)</Text>
                        <Text style={styles.subtitle}>
                            {peaCode ? `สังกัด: ${peaCode}` : 'ข้อมูลซีลทั้งหมด'}
                        </Text>
                    </View>
                </View>

                {/* Date Filter */}
                <View style={styles.filterCard}>
                    <Text style={styles.filterTitle}>📅 เลือกช่วงเวลา</Text>
                    <View style={styles.filterRow}>
                        <View style={styles.dateField}>
                            <Text style={styles.dateLabel}>วันเริ่มต้น</Text>
                            <TextInput
                                style={styles.dateInput}
                                value={startDate}
                                onChangeText={setStartDate}
                                placeholder="YYYY-MM-DD"
                                {...(Platform.OS === 'web' ? { type: 'date' } as any : {})}
                            />
                        </View>
                        <View style={styles.dateField}>
                            <Text style={styles.dateLabel}>วันสิ้นสุด</Text>
                            <TextInput
                                style={styles.dateInput}
                                value={endDate}
                                onChangeText={setEndDate}
                                placeholder="YYYY-MM-DD"
                                {...(Platform.OS === 'web' ? { type: 'date' } as any : {})}
                            />
                        </View>
                        <TouchableOpacity style={styles.searchButton} onPress={fetchStatement}>
                            <Text style={styles.searchButtonText}>🔍 ดูรายงาน</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Loading */}
                {loading && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primaryPurple} />
                        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
                    </View>
                )}

                {/* Summary Cards */}
                {data && !loading && (
                    <>
                        <View style={styles.summaryHeader}>
                            <Text style={styles.sectionTitle}>📋 สรุปภาพรวม</Text>
                            <View style={styles.totalBadge}>
                                <Text style={styles.totalBadgeText}>ทั้งหมด {data.total.toLocaleString()} รายการ</Text>
                            </View>
                        </View>

                        <View style={styles.summaryGrid}>
                            {summaryCards.map(card => (
                                <SummaryCard key={card.label} {...card} />
                            ))}
                        </View>

                        {/* Period Info */}
                        <View style={styles.periodInfo}>
                            <Text style={styles.periodText}>
                                ช่วงเวลา: {formatDate(data.period.start_date || null)} — {formatDate(data.period.end_date || null)}
                            </Text>
                        </View>

                        {/* Data Table */}
                        <View style={styles.tableContainer}>
                            <Text style={styles.sectionTitle}>📑 รายการซีล</Text>

                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <Text style={[styles.headerCell, { flex: 1.5 }]}>เลขซีล</Text>
                                <Text style={[styles.headerCell, { flex: 1 }]}>สถานะ</Text>
                                <Text style={[styles.headerCell, { flex: 1.5 }]}>ผู้มอบหมาย</Text>
                                <Text style={[styles.headerCell, { flex: 1.5 }]}>ช่างรับผิดชอบ</Text>
                                <Text style={[styles.headerCell, { flex: 1.5 }]}>หมายเหตุ</Text>
                                <Text style={[styles.headerCell, { flex: 1.2 }]}>วันที่อัปเดต</Text>
                            </View>

                            {/* Table Rows */}
                            {data.items.length === 0 ? (
                                <View style={styles.emptyRow}>
                                    <Text style={styles.emptyText}>ไม่พบข้อมูลในช่วงเวลาที่เลือก</Text>
                                </View>
                            ) : (
                                data.items.map((item: StatementItem, idx: number) => (
                                    <View key={item.seal_number + idx} style={[styles.tableRow, idx % 2 === 0 && styles.tableRowAlt]}>
                                        <View style={[styles.cell, { flex: 1.5 }]}>
                                            <Text style={styles.sealNumberText}>{item.seal_number}</Text>
                                            {item.pea_code ? <Text style={styles.peaCodeSmall}>{item.pea_code}</Text> : null}
                                        </View>
                                        <View style={[styles.cell, { flex: 1 }]}>
                                            <StatusBadge status={item.status} />
                                        </View>
                                        <View style={[styles.cell, { flex: 1.5 }]}>
                                            <Text style={styles.cellText}>{item.issued_by_name || '-'}</Text>
                                        </View>
                                        <View style={[styles.cell, { flex: 1.5 }]}>
                                            <Text style={styles.cellText}>{item.tech_name || '-'}</Text>
                                        </View>
                                        <View style={[styles.cell, { flex: 1.5 }]}>
                                            <Text style={styles.cellText} numberOfLines={2}>
                                                {item.issue_remark || '-'}
                                            </Text>
                                        </View>
                                        <View style={[styles.cell, { flex: 1.2 }]}>
                                            <Text style={styles.dateText}>{formatDateTime(item.updated_at)}</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </View>

                        {/* Footer */}
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>
                                แสดง {data.items.length.toLocaleString()} รายการ จากทั้งหมด {data.total.toLocaleString()} รายการ
                            </Text>
                        </View>
                    </>
                )}

                {/* Empty State */}
                {!data && !loading && hasSearched && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateIcon}>📭</Text>
                        <Text style={styles.emptyStateText}>ไม่พบข้อมูล</Text>
                    </View>
                )}

                {/* Initial State */}
                {!data && !loading && !hasSearched && (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateIcon}>📊</Text>
                        <Text style={styles.emptyStateText}>กดปุ่ม "ดูรายงาน" เพื่อดูข้อมูลซีล</Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
};

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: colors.bgLight,
    },
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: sizes.lg,
        paddingBottom: 60,
    },

    // Title
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: sizes.lg,
    },
    titleIcon: {
        fontSize: 32,
        marginRight: sizes.md,
    },
    title: {
        fontSize: sizes.fontXl,
        fontWeight: 'bold',
        color: colors.primaryPurple,
    },
    subtitle: {
        fontSize: sizes.fontSm,
        color: colors.textLight,
        marginTop: 2,
    },

    // Filter
    filterCard: {
        backgroundColor: colors.white,
        borderRadius: sizes.radiusMd,
        padding: sizes.lg,
        marginBottom: sizes.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    filterTitle: {
        fontSize: sizes.fontMd,
        fontWeight: '600',
        color: '#333',
        marginBottom: sizes.md,
    },
    filterRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
        gap: sizes.md,
    },
    dateField: {
        flex: 1,
        minWidth: 160,
    },
    dateLabel: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
        marginBottom: 4,
        fontWeight: '500',
    },
    dateInput: {
        height: 42,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: sizes.radiusSm,
        paddingHorizontal: sizes.sm,
        fontSize: sizes.fontSm,
        backgroundColor: '#FAFAFA',
        color: '#333',
    },
    searchButton: {
        backgroundColor: colors.primaryPurple,
        paddingHorizontal: sizes.lg,
        height: 42,
        borderRadius: sizes.radiusSm,
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: 140,
    },
    searchButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: sizes.fontSm,
    },

    // Loading
    loadingContainer: {
        padding: sizes.xxl,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: sizes.sm,
        color: colors.textLight,
    },

    // Summary
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: sizes.md,
    },
    sectionTitle: {
        fontSize: sizes.fontLg,
        fontWeight: 'bold',
        color: '#333',
    },
    totalBadge: {
        backgroundColor: colors.primaryPurple,
        paddingHorizontal: sizes.md,
        paddingVertical: sizes.xs,
        borderRadius: sizes.radiusRound,
    },
    totalBadgeText: {
        color: colors.white,
        fontSize: sizes.fontXs,
        fontWeight: 'bold',
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: sizes.sm,
        marginBottom: sizes.lg,
    },
    summaryCard: {
        backgroundColor: colors.white,
        borderRadius: sizes.radiusSm,
        padding: sizes.md,
        flexDirection: 'row',
        alignItems: 'center',
        borderLeftWidth: 4,
        minWidth: 160,
        flex: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    summaryIcon: {
        fontSize: 22,
        marginRight: sizes.sm,
    },
    summaryCount: {
        fontSize: sizes.fontXl,
        fontWeight: 'bold',
        color: '#333',
    },
    summaryLabel: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
    },

    // Period
    periodInfo: {
        backgroundColor: '#EDE7F6',
        borderRadius: sizes.radiusSm,
        padding: sizes.sm,
        marginBottom: sizes.lg,
        alignItems: 'center',
    },
    periodText: {
        color: colors.primaryPurple,
        fontSize: sizes.fontSm,
        fontWeight: '600',
    },

    // Table
    tableContainer: {
        backgroundColor: colors.white,
        borderRadius: sizes.radiusMd,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
        marginBottom: sizes.md,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        paddingVertical: sizes.sm + 2,
        paddingHorizontal: sizes.md,
        borderBottomWidth: 2,
        borderBottomColor: '#E8E8E8',
    },
    headerCell: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#666',
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: sizes.sm + 4,
        paddingHorizontal: sizes.md,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        alignItems: 'center',
    },
    tableRowAlt: {
        backgroundColor: '#FAFAFA',
    },
    cell: {
        justifyContent: 'center',
        paddingRight: sizes.xs,
    },
    cellText: {
        fontSize: sizes.fontSm,
        color: '#444',
    },
    sealNumberText: {
        fontSize: sizes.fontSm,
        fontWeight: '700',
        color: colors.primaryPurple,
    },
    peaCodeSmall: {
        fontSize: 10,
        color: '#999',
        marginTop: 1,
    },
    dateText: {
        fontSize: 12,
        color: '#555',
    },
    emptyRow: {
        padding: sizes.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textLight,
    },

    // Badge
    badge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '600',
    },

    // Footer
    footer: {
        padding: sizes.md,
        alignItems: 'center',
    },
    footerText: {
        fontSize: sizes.fontXs,
        color: colors.textLight,
    },

    // Empty State
    emptyState: {
        padding: sizes.xxl * 2,
        alignItems: 'center',
    },
    emptyStateIcon: {
        fontSize: 48,
        marginBottom: sizes.md,
    },
    emptyStateText: {
        fontSize: sizes.fontMd,
        color: colors.textLight,
        textAlign: 'center',
    },
});
