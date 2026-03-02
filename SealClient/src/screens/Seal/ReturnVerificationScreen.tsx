import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { useAuth } from '@/context/AuthContext';
import { sealService } from '@/services/sealService';

// ─── Status badge colors ────────────────────────────
const REMARK_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
    'ซีลเก่าที่ถูกตัดออก': { bg: '#f3e5f5', text: '#7b1fa2', icon: '✂️' },
    'ชำรุดก่อนใช้งาน': { bg: '#fff3e0', text: '#e65100', icon: '⚠️' },
    'ไม่ได้ใช้งาน (คืนคลัง)': { bg: '#e8f5e9', text: '#2e7d32', icon: '😊' },
    'รอตรวจสอบคืน': { bg: '#e3f2fd', text: '#1565c0', icon: '🔍' },
};

interface PendingReturnItem {
    id: number;
    seal_number: string;
    status: string;
    pea_code: string;
    return_remarks: string;
    returned_at: string | null;
    image1?: string;
    technician_id: number;
    technician_name: string;
    technician_code: string;
}

// ─── Format date/time helper ─────────────────────────
const formatDateTime = (dateStr: string | null | undefined): { date: string; time: string } => {
    if (!dateStr) return { date: '-', time: '' };
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return { date: '-', time: '' };
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        let date = '';
        if (diffDays === 0) date = 'วันนี้';
        else if (diffDays === 1) date = 'เมื่อวาน';
        else date = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

        const time = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
        return { date, time };
    } catch {
        return { date: '-', time: '' };
    }
};

// ═════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────
// ═════════════════════════════════════════════════════
export const ReturnVerificationScreen: React.FC = () => {
    const { user } = useAuth();
    const [items, setItems] = useState<PendingReturnItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [acceptingId, setAcceptingId] = useState<number | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const response = await sealService.getPendingReturns(user?.pea_code);
            setItems(response.items || []);
        } catch (error) {
            console.error('Failed to fetch pending returns', error);
        } finally {
            setLoading(false);
        }
    }, [user?.pea_code]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleAcceptReturn = async (sealNumber: string, id: number) => {
        setAcceptingId(id);
        try {
            await sealService.acceptReturn(sealNumber);
            setItems(prev => prev.filter(i => i.id !== id));
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert(error?.response?.data?.error || 'ไม่สามารถรับคืนซีลได้');
            }
        } finally {
            setAcceptingId(null);
        }
    };

    const handleScanInput = (text: string) => {
        setSearchQuery(text);
    };

    const filteredItems = items.filter(item => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            item.seal_number.toLowerCase().includes(q) ||
            item.technician_name.toLowerCase().includes(q) ||
            item.technician_code.toLowerCase().includes(q)
        );
    });

    return (
        <View style={styles.mainContainer}>
            <Header />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* ── Title ─────────────────── */}
                <View style={styles.titleSection}>
                    <Text style={styles.title}>📋 รายการรอตรวจสอบและรับซีลคืน</Text>
                    <Text style={styles.subtitle}>Pending Verifications</Text>
                </View>

                {/* ── Scanner Card ──────────── */}
                <View style={styles.card}>
                    <View style={styles.scannerRow}>
                        <View style={styles.scannerIconContainer}>
                            <Text style={styles.scannerIcon}>📷</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.scannerLabel}>สแกนของจริงเพื่อหาในคิวอัตโนมัติ</Text>
                            {Platform.OS === 'web' ? (
                                <input
                                    type="text"
                                    placeholder="ยิงบาร์โค้ดซีลที่ช่างนำมาวางตรงหน้า..."
                                    value={searchQuery}
                                    onChange={(e: any) => handleScanInput(e.target.value)}
                                    style={{
                                        height: 44,
                                        borderRadius: 8,
                                        border: '1px solid #dee2e6',
                                        backgroundColor: '#f8f9fa',
                                        paddingLeft: 14,
                                        paddingRight: 14,
                                        fontSize: 14,
                                        color: '#333',
                                        outline: 'none',
                                        width: '100%',
                                        boxSizing: 'border-box' as any,
                                        marginTop: 8,
                                    }}
                                />
                            ) : (
                                <TextInput
                                    style={styles.scannerInput}
                                    placeholder="ยิงบาร์โค้ดซีลที่ช่างนำมาวางตรงหน้า..."
                                    placeholderTextColor="#aaa"
                                    value={searchQuery}
                                    onChangeText={handleScanInput}
                                />
                            )}
                        </View>
                    </View>
                </View>

                {/* ── Pending Queue Card ────── */}
                <View style={styles.card}>
                    <View style={styles.queueHeader}>
                        <View>
                            <Text style={styles.queueTitle}>คิวรอรับซีลคืนจากช่าง</Text>
                            <Text style={styles.queueSubtitle}>ตรวจสอบซากซีลของจริง แล้วกดยืนยันรับเข้าระบบ</Text>
                        </View>
                        <View style={styles.badgeCountContainer}>
                            <Text style={styles.badgeCountText}>รอตรวจสอบ: {filteredItems.length} รายการ</Text>
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primaryPurple} />
                            <Text style={styles.loadingText}>กำลังดึงข้อมูล...</Text>
                        </View>
                    ) : filteredItems.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>✅</Text>
                            <Text style={styles.emptyText}>ไม่มีรายการรอตรวจสอบ</Text>
                        </View>
                    ) : (
                        <>
                            {/* Table */}
                            <ScrollView horizontal showsHorizontalScrollIndicator>
                                <View>
                                    {/* Header */}
                                    <View style={styles.headerRow}>
                                        <View style={[styles.cell, styles.cellTime]}>
                                            <Text style={styles.headerText}>เวลาที่ช่างกดคืน</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellTech]}>
                                            <Text style={styles.headerText}>ช่างผู้ส่งคืน</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellSeal]}>
                                            <Text style={styles.headerText}>หมายเลขซีล</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellRemark]}>
                                            <Text style={styles.headerText}>สถานะที่ช่างแจ้ง</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellAction]}>
                                            <Text style={styles.headerText}>จัดการ</Text>
                                        </View>
                                    </View>

                                    {/* Data Rows */}
                                    {filteredItems.map((item, idx) => {
                                        const dt = formatDateTime(item.returned_at);
                                        const remarkStyle = REMARK_COLORS[item.return_remarks] || REMARK_COLORS['รอตรวจสอบคืน'];
                                        const isAccepting = acceptingId === item.id;
                                        return (
                                            <View key={item.id} style={[styles.dataRow, idx % 2 === 1 && styles.dataRowAlt]}>
                                                <View style={[styles.cell, styles.cellTime]}>
                                                    <View>
                                                        <Text style={styles.dateText}>{dt.date}</Text>
                                                        <Text style={styles.timeText}>{dt.time}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.cell, styles.cellTech]}>
                                                    <View style={styles.techAvatar}>
                                                        <Text style={styles.techAvatarText}>
                                                            {item.technician_name ? item.technician_name.charAt(0) : '?'}
                                                        </Text>
                                                    </View>
                                                    <View style={{ marginLeft: 10 }}>
                                                        <Text style={styles.techName}>{item.technician_name || '-'}</Text>
                                                        <Text style={styles.techCode}>{item.technician_code || '-'}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.cell, styles.cellSeal]}>
                                                    <Text style={styles.sealText}>{item.seal_number}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellRemark]}>
                                                    <View style={[styles.remarkBadge, { backgroundColor: remarkStyle.bg }]}>
                                                        <Text style={[styles.remarkText, { color: remarkStyle.text }]}>
                                                            {remarkStyle.icon} {item.return_remarks || item.status}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.cell, styles.cellAction]}>
                                                    <TouchableOpacity
                                                        style={[styles.acceptBtn, isAccepting && styles.acceptBtnDisabled]}
                                                        onPress={() => handleAcceptReturn(item.seal_number, item.id)}
                                                        disabled={isAccepting}
                                                    >
                                                        {isAccepting ? (
                                                            <ActivityIndicator size="small" color="white" />
                                                        ) : (
                                                            <Text style={styles.acceptBtnText}>ตรวจสอบของจริง</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>
                        </>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

// ═════════════════════════════════════════════════════
// ─── STYLES ─────────────────────────────────────────
// ═════════════════════════════════════════════════════
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.bgLight },
    container: { flex: 1 },
    contentContainer: { padding: sizes.lg, alignItems: 'center' },
    titleSection: { width: '100%', maxWidth: 1200, marginBottom: sizes.lg },
    title: { fontSize: sizes.fontXl, fontWeight: 'bold', color: colors.primaryPurple },
    subtitle: { fontSize: sizes.fontSm, color: colors.textLight, marginTop: 2 },

    // Card
    card: { width: '100%', maxWidth: 1200, backgroundColor: 'white', borderRadius: sizes.radiusMd, marginBottom: sizes.md, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },

    // Scanner
    scannerRow: { flexDirection: 'row', alignItems: 'flex-start', padding: sizes.lg },
    scannerIconContainer: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#f3e5f5', alignItems: 'center', justifyContent: 'center', marginRight: sizes.md },
    scannerIcon: { fontSize: 28 },
    scannerLabel: { fontSize: sizes.fontMd, fontWeight: 'bold', color: colors.primaryPurple },
    scannerInput: { height: 44, borderRadius: 8, borderWidth: 1, borderColor: '#dee2e6', backgroundColor: '#f8f9fa', paddingHorizontal: 14, fontSize: 14, color: '#333', marginTop: 8 },

    // Queue Header
    queueHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: sizes.md, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexWrap: 'wrap', gap: sizes.sm },
    queueTitle: { fontSize: sizes.fontMd, fontWeight: 'bold', color: colors.text },
    queueSubtitle: { fontSize: sizes.fontXs, color: colors.textLight, marginTop: 2 },
    badgeCountContainer: { backgroundColor: '#f3e5f5', paddingHorizontal: 14, paddingVertical: 6, borderRadius: sizes.radiusRound },
    badgeCountText: { fontSize: sizes.fontSm, fontWeight: 'bold', color: colors.primaryPurple },

    // Table
    headerRow: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderBottomWidth: 2, borderBottomColor: '#dee2e6' },
    headerText: { fontSize: sizes.fontXs, fontWeight: 'bold', color: colors.textLight, textTransform: 'uppercase' as any },
    dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    dataRowAlt: { backgroundColor: '#fafafa' },
    cell: { paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
    cellTime: { width: 130 },
    cellTech: { width: 220 },
    cellSeal: { width: 160 },
    cellRemark: { width: 200 },
    cellAction: { width: 170 },

    // Date/Time
    dateText: { fontSize: sizes.fontSm, fontWeight: 'bold', color: colors.text },
    timeText: { fontSize: sizes.fontXs, color: colors.textLight },

    // Technician
    techAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ede7f6', alignItems: 'center', justifyContent: 'center' },
    techAvatarText: { fontSize: 16, fontWeight: 'bold', color: colors.primaryPurple },
    techName: { fontSize: sizes.fontSm, fontWeight: '600', color: colors.text },
    techCode: { fontSize: sizes.fontXs, color: colors.textLight },

    // Seal Number
    sealText: { fontSize: sizes.fontSm, fontWeight: 'bold', color: colors.primaryPurple },

    // Remark Badge
    remarkBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: sizes.radiusRound },
    remarkText: { fontSize: sizes.fontXs, fontWeight: 'bold' },

    // Accept Button
    acceptBtn: { backgroundColor: colors.primaryPurple, paddingHorizontal: 16, paddingVertical: 10, borderRadius: sizes.radiusSm },
    acceptBtnDisabled: { opacity: 0.5 },
    acceptBtnText: { color: 'white', fontSize: sizes.fontSm, fontWeight: 'bold' },

    // Loading / Empty
    loadingContainer: { padding: sizes.xxl, alignItems: 'center' },
    loadingText: { marginTop: sizes.md, color: colors.textLight },
    emptyContainer: { padding: sizes.xxl, alignItems: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: sizes.md },
    emptyText: { fontSize: sizes.fontMd, color: colors.textLight },
});
