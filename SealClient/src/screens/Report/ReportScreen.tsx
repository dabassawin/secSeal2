import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { useAuth } from '@/context/AuthContext';
import { reportService, SealReportItem, ReportFilters } from '@/services/reportService';
import { PieChart, PieChartData } from '@/components/charts/PieChart';
import { BarChart, BarChartData } from '@/components/charts/BarChart';
import { KPICard } from '@/components/charts/KPICard';
import { AnomalyReport, getAnomalyCount } from '@/components/report/AnomalyReport';
import { SealStatus } from '../../constants/status';
import { useRealtime } from '../../hooks/useRealtime';

// ─── Status badge colors ────────────────────────────
const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
    [SealStatus.READY]: { bg: '#e8f5e9', text: '#2e7d32' },
    [SealStatus.ISSUED]: { bg: '#fff3e0', text: '#e65100' },
    [SealStatus.INSTALLED]: { bg: '#e3f2fd', text: '#1565c0' },
    [SealStatus.USED]: { bg: '#f3e5f5', text: '#7b1fa2' },
    [SealStatus.DAMAGED]: { bg: '#fce4ec', text: '#c62828' },
    [SealStatus.LOST]: { bg: '#ffebee', text: '#b71c1c' },
};

const ALL_STATUSES = [SealStatus.READY, SealStatus.ISSUED, SealStatus.INSTALLED, SealStatus.USED, SealStatus.DAMAGED, SealStatus.LOST];

// ─── Format date helper ─────────────────────────────
const formatDate = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '-';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return '-';
        return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
        return '-';
    }
};

const formatDateInput = (date: Date): string => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
};

// ─── Sort types ─────────────────────────────────────
type SortField = 'seal_number' | 'status' | 'pea_code' | 'created_at' | 'issued_at' | 'used_at';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 20;

// ─── Dropdown Component ─────────────────────────────
const Dropdown: React.FC<{
    label: string;
    value: string;
    options: { label: string; value: string }[];
    onChange: (val: string) => void;
    zIndex?: number;
}> = ({ label, value, options, onChange, zIndex = 10 }) => {
    const [open, setOpen] = useState(false);
    const selectedLabel = options.find(o => o.value === value)?.label || 'ทั้งหมด';

    return (
        <View style={[dropStyles.container, { zIndex }]}>
            <Text style={dropStyles.label}>{label}</Text>
            <TouchableOpacity style={dropStyles.select} onPress={() => setOpen(!open)}>
                <Text style={dropStyles.selectText} numberOfLines={1}>{selectedLabel}</Text>
                <Text style={dropStyles.arrow}>{open ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {open && (
                <View style={dropStyles.menu}>
                    <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                        {options.map(opt => (
                            <TouchableOpacity
                                key={opt.value}
                                style={[dropStyles.menuItem, opt.value === value && dropStyles.menuItemActive]}
                                onPress={() => { onChange(opt.value); setOpen(false); }}
                            >
                                <Text style={[dropStyles.menuItemText, opt.value === value && dropStyles.menuItemTextActive]}>
                                    {opt.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const dropStyles = StyleSheet.create({
    container: { flex: 1, minWidth: 160, marginHorizontal: sizes.xs, position: 'relative' as any, zIndex: 10 },
    label: { fontSize: sizes.fontXs, color: colors.textLight, marginBottom: 6, fontWeight: '600' },
    select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#f8f9fa', borderWidth: 1, borderColor: '#dee2e6', borderRadius: sizes.radiusSm, paddingHorizontal: 12, height: 42 },
    selectText: { fontSize: sizes.fontSm, color: colors.text, flex: 1 },
    arrow: { fontSize: 10, color: colors.textLight, marginLeft: 8 },
    menu: { position: 'absolute' as any, top: 68, left: 0, right: 0, backgroundColor: 'white', borderWidth: 1, borderColor: '#dee2e6', borderRadius: sizes.radiusSm, zIndex: 1000, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8 },
    menuItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    menuItemActive: { backgroundColor: '#f3e5f5' },
    menuItemText: { fontSize: sizes.fontSm, color: colors.text },
    menuItemTextActive: { color: colors.primaryPurple, fontWeight: 'bold' },
});

// ─── DateInput Component (web: type="date", native: text) ───
const DateInput: React.FC<{
    label: string;
    value: string;
    onChange: (val: string) => void;
}> = ({ label, value, onChange }) => {
    return (
        <View style={{ flex: 1, minWidth: 160, marginHorizontal: sizes.xs }}>
            <Text style={{ fontSize: sizes.fontXs, color: colors.textLight, marginBottom: 6, fontWeight: '600' }}>{label}</Text>
            {Platform.OS === 'web' ? (
                <input
                    type="date"
                    value={value}
                    onChange={(e: any) => onChange(e.target.value)}
                    style={{
                        height: 42,
                        borderRadius: sizes.radiusSm,
                        border: '1px solid #dee2e6',
                        backgroundColor: '#f8f9fa',
                        paddingLeft: 12,
                        paddingRight: 12,
                        fontSize: 14,
                        color: '#333',
                        outline: 'none',
                        width: '100%',
                        boxSizing: 'border-box' as any,
                    }}
                />
            ) : (
                <TextInput
                    style={{
                        height: 42,
                        borderRadius: sizes.radiusSm,
                        borderWidth: 1,
                        borderColor: '#dee2e6',
                        backgroundColor: '#f8f9fa',
                        paddingHorizontal: 12,
                        fontSize: sizes.fontSm,
                        color: colors.text,
                    }}
                    placeholder="YYYY-MM-DD"
                    value={value}
                    onChangeText={onChange}
                />
            )}
        </View>
    );
};

// ─── CSV/Excel/PDF Export ────────────────────────────
const exportCSV = (items: SealReportItem[]) => {
    if (Platform.OS !== 'web') return;
    const headers = ['หมายเลขซีล', 'สถานะ', 'สังกัด กฟภ.', 'ผู้จ่าย', 'ผู้รับ', 'ช่างที่ติดตั้ง', 'ช่างที่ส่งคืน', 'ผู้รับคืน', 'เลขมิเตอร์', 'วันที่สร้าง', 'วันที่จ่าย', 'วันที่ติดตั้ง'];
    const rows = items.map(item => [
        item.seal_number,
        item.status,
        item.pea_code,
        item.issued_by_name || '-',
        item.receiver_name || item.technician_name || '-',
        item.used_by_name || '-',
        item.returned_by_technician_name || '-',
        item.returned_by_name || '-',
        item.installed_serial || '-',
        formatDate(item.created_at) + '\u200B',
        formatDate(item.issued_at) + '\u200B',
        formatDate(item.used_at) + '\u200B',
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `seal_report_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
};

const exportExcel = (items: SealReportItem[]) => {
    if (Platform.OS !== 'web') return;
    const headers = ['หมายเลขซีล', 'สถานะ', 'สังกัด กฟภ.', 'ผู้จ่าย', 'ผู้รับ', 'ช่างที่ติดตั้ง', 'ช่างที่ส่งคืน', 'ผู้รับคืน', 'เลขมิเตอร์', 'วันที่สร้าง', 'วันที่จ่าย', 'วันที่ติดตั้ง'];
    const rows = items.map(item => [
        item.seal_number, item.status, item.pea_code,
        item.issued_by_name || '-', item.receiver_name || item.technician_name || '-',
        item.used_by_name || '-', item.returned_by_technician_name || '-',
        item.returned_by_name || '-', item.installed_serial || '-',
        formatDate(item.created_at), formatDate(item.issued_at), formatDate(item.used_at),
    ]);
    let html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"></head><body><table>';
    html += '<tr>' + headers.map(h => `<th style="background:#752257;color:white;padding:8px;font-weight:bold">${h}</th>`).join('') + '</tr>';
    rows.forEach(row => {
        html += '<tr>' + row.map(c => `<td style="padding:6px;border:1px solid #ddd">${c}</td>`).join('') + '</tr>';
    });
    html += '</table></body></html>';
    const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `seal_report_${new Date().toISOString().slice(0, 10)}.xls`; a.click();
    URL.revokeObjectURL(url);
};

const exportPDF = (items: SealReportItem[]) => {
    if (Platform.OS !== 'web') return;
    const headers = ['หมายเลขซีล', 'สถานะ', 'สังกัด กฟภ.', 'ผู้จ่าย', 'ผู้รับ', 'ช่างที่ติดตั้ง', 'ช่างที่ส่งคืน', 'ผู้รับคืน', 'เลขมิเตอร์', 'วันที่สร้าง', 'วันที่จ่าย', 'วันที่ติดตั้ง'];
    const rows = items.map(item => [
        item.seal_number, item.status, item.pea_code,
        item.issued_by_name || '-', item.receiver_name || item.technician_name || '-',
        item.used_by_name || '-', item.returned_by_technician_name || '-',
        item.returned_by_name || '-', item.installed_serial || '-',
        formatDate(item.created_at), formatDate(item.issued_at), formatDate(item.used_at),
    ]);
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>รายงานสรุปข้อมูลซีล</title>
    <style>
        @page { size: landscape; margin: 15mm; }
        body { font-family: 'Sarabun', 'Tahoma', sans-serif; font-size: 11px; }
        h1 { color: #752257; font-size: 18px; margin-bottom: 4px; }
        .subtitle { color: #666; font-size: 12px; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #752257; color: white; padding: 8px 6px; text-align: left; font-size: 11px; }
        td { padding: 6px; border-bottom: 1px solid #eee; font-size: 11px; }
        tr:nth-child(even) { background: #f9f9f9; }
    </style></head><body>
    <h1>📊 รายงานสรุปข้อมูลซีล</h1>
    <div class="subtitle">ระบบจัดการซีล PEAsecSeal — พิมพ์เมื่อ ${new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} — ทั้งหมด ${items.length} รายการ</div>
    <table><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    rows.forEach(row => {
        html += '<tr>' + row.map(c => `<td>${c}</td>`).join('') + '</tr>';
    });
    html += '</table></body></html>';
    const printWindow = window.open('', '_blank');
    if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 500);
    }
};


// ═════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────
// ═════════════════════════════════════════════════════
export const ReportScreen: React.FC = () => {
    const { user } = useAuth();

    // Filters
    const today = new Date();
    const firstOfYear = new Date(today.getFullYear(), 0, 1);
    const [startDate, setStartDate] = useState(formatDateInput(firstOfYear));
    const [endDate, setEndDate] = useState(formatDateInput(today));
    const [peaCode, setPeaCode] = useState(user?.pea_code || '');
    const [statusFilter, setStatusFilter] = useState('');

    // Update peaCode if user loads late
    useEffect(() => {
        if (user?.pea_code && !peaCode) {
            setPeaCode(user.pea_code);
        }
    }, [user?.pea_code]);

    // Data
    const [items, setItems] = useState<SealReportItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Table
    const [searchQuery, setSearchQuery] = useState('');
    const [sortField, setSortField] = useState<SortField>('created_at');
    const [sortDir, setSortDir] = useState<SortDir>('desc');
    const [page, setPage] = useState(1);
    const [showDashboard, setShowDashboard] = useState(true);
    const [showAnomalies, setShowAnomalies] = useState(false);

    // ─── Dashboard computed data ────────────────────
    const dashboardData = useMemo(() => {
        if (items.length === 0) return null;

        // Status counts for pie chart
        const statusCounts: Record<string, number> = {};
        items.forEach(item => {
            statusCounts[item.status] = (statusCounts[item.status] || 0) + 1;
        });

        const STATUS_CHART_COLORS: Record<string, string> = {
            [SealStatus.READY]: '#4caf50',
            [SealStatus.ISSUED]: '#ff9800',
            [SealStatus.INSTALLED]: '#2196f3',
            [SealStatus.USED]: '#9c27b0',
            [SealStatus.DAMAGED]: '#f44336',
            [SealStatus.LOST]: '#b71c1c',
        };

        const pieData: PieChartData[] = Object.entries(statusCounts).map(([label, value]) => ({
            label,
            value,
            color: STATUS_CHART_COLORS[label] || '#999',
        }));

        // Monthly creation counts for bar chart
        const monthCounts: Record<string, number> = {};
        items.forEach(item => {
            if (item.created_at) {
                const d = new Date(item.created_at);
                const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                monthCounts[key] = (monthCounts[key] || 0) + 1;
            }
        });

        const MONTH_NAMES = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
        const barData: BarChartData[] = Object.entries(monthCounts)
            .sort(([a], [b]) => a.localeCompare(b))
            .slice(-12)  // Last 12 months max
            .map(([key, value]) => {
                const monthIdx = parseInt(key.split('-')[1]) - 1;
                return {
                    label: MONTH_NAMES[monthIdx],
                    value,
                    color: '#7c4dff',
                };
            });

        // KPI calculations
        const total = items.length;
        const installed = statusCounts[SealStatus.INSTALLED] || 0;
        const used = statusCounts[SealStatus.USED] || 0;
        const damaged = statusCounts[SealStatus.DAMAGED] || 0;
        const lost = statusCounts[SealStatus.LOST] || 0;
        const issued = statusCounts[SealStatus.ISSUED] || 0;
        const totalIssued = installed + used + damaged + lost + issued;
        const installRate = totalIssued > 0 ? (((installed + used) / totalIssued) * 100).toFixed(1) : '0.0';
        const issueRate = total > 0 ? (((damaged + lost) / total) * 100).toFixed(1) : '0.0';

        // Average days from issue to install
        let avgDays = '-';
        const daysArr: number[] = [];
        items.forEach(item => {
            if (item.issued_at && item.used_at) {
                const diff = new Date(item.used_at).getTime() - new Date(item.issued_at).getTime();
                if (diff > 0) daysArr.push(diff / (1000 * 60 * 60 * 24));
            }
        });
        if (daysArr.length > 0) {
            avgDays = (daysArr.reduce((a, b) => a + b, 0) / daysArr.length).toFixed(1);
        }

        return { pieData, barData, total, totalIssued, installed, used, damaged, lost, issued, installRate, issueRate, avgDays };
    }, [items]);

    const anomalyCount = useMemo(() => getAnomalyCount(items), [items]);

    // ─── Fetch data ─────────────────────────────────
    const fetchData = useCallback(async () => {
        setLoading(true);
        const filters: ReportFilters = {};
        if (peaCode) filters.pea_code = peaCode;
        if (statusFilter) filters.status = statusFilter;
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;
        const response = await reportService.getReportSeals(filters);
        setItems(response.items || []);
        setPage(1);
        setLoading(false);
    }, [peaCode, statusFilter, startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ✅ Real-time Updates
    useRealtime(peaCode || user?.pea_code, useCallback((msg: string) => {
        if (msg === 'seal_updated') {
            console.log('🔄 Dashboard real-time update triggered');
            fetchData();
        }
    }, [fetchData]));

    // ─── Filter + Sort + Page ───────────────────────
    const filteredItems = useMemo(() => {
        let result = [...items];
        // Client-side search
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(item =>
                item.seal_number.toLowerCase().includes(q) ||
                item.status.toLowerCase().includes(q) ||
                (item.issued_by_name || '').toLowerCase().includes(q) ||
                (item.receiver_name || '').toLowerCase().includes(q) ||
                (item.technician_name || '').toLowerCase().includes(q) ||
                (item.installed_serial || '').toLowerCase().includes(q)
            );
        }
        // Sort
        result.sort((a, b) => {
            let aVal = (a as any)[sortField] || '';
            let bVal = (b as any)[sortField] || '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [items, searchQuery, sortField, sortDir]);

    const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
    const pagedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(d => d === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const SortIndicator: React.FC<{ field: SortField }> = ({ field }) => (
        <Text style={{ fontSize: 10, marginLeft: 4, color: sortField === field ? colors.primaryPurple : '#aaa' }}>
            {sortField === field ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
        </Text>
    );

    // ─── PEA code options ───────────────────────────
    const peaOptions = useMemo(() => {
        const codes = Array.from(new Set(items.map(i => i.pea_code).filter(Boolean)));
        return [{ label: 'ทั้งหมด', value: '' }, ...codes.map(c => ({ label: c, value: c }))];
    }, [items]);

    const statusOptions = useMemo(() => {
        return [{ label: 'ทั้งหมด', value: '' }, ...ALL_STATUSES.map(s => ({ label: s, value: s }))];
    }, []);

    // ─── Render ─────────────────────────────────────
    return (
        <View style={styles.mainContainer}>
            <Header />
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {/* ── Title ─────────────────────────── */}
                <View style={styles.titleSection}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View>
                            <Text style={styles.title}>รายงานสรุปข้อมูลซีล</Text>
                            <Text style={styles.subtitle}>ระบบจัดการซีล PEAsecSeal</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.toggleDashboardBtn}
                            onPress={() => setShowDashboard(!showDashboard)}
                        >
                            <Text style={styles.toggleDashboardText}>
                                {showDashboard ? '📊 ซ่อน Dashboard' : '📊 แสดง Dashboard'}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleAnomalyBtn, showAnomalies && styles.toggleAnomalyBtnActive]}
                            onPress={() => setShowAnomalies(!showAnomalies)}
                        >
                            <Text style={[styles.toggleAnomalyText, showAnomalies && styles.toggleAnomalyTextActive]}>
                                {showAnomalies ? '⚠️ ซ่อน Alerts' : '⚠️ ดู Alerts'}
                            </Text>
                            {anomalyCount > 0 && (
                                <View style={styles.anomalyBadge}>
                                    <Text style={styles.anomalyBadgeText}>{anomalyCount}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Dashboard Section ────────────── */}
                {showDashboard && dashboardData && (
                    <>
                        {/* KPI Cards */}
                        <View style={styles.kpiRow}>
                            <KPICard
                                title="ซีลทั้งหมด"
                                value={dashboardData.total.toLocaleString()}
                                subtitle="ในช่วงเวลาที่เลือก"
                                icon="📦"
                                color="#7c4dff"
                            />
                            <KPICard
                                title="อัตราติดตั้งสำเร็จ"
                                value={`${dashboardData.installRate}%`}
                                subtitle={`${(dashboardData.installed + dashboardData.used).toLocaleString()} / ${dashboardData.totalIssued.toLocaleString()} ชิ้น`}
                                icon="✅"
                                color="#4caf50"
                            />
                            <KPICard
                                title="เสียหาย / สูญหาย"
                                value={`${dashboardData.issueRate}%`}
                                subtitle={`${(dashboardData.damaged + dashboardData.lost).toLocaleString()} ชิ้น`}
                                icon="⚠️"
                                color="#f44336"
                            />
                            <KPICard
                                title="ระยะเวลาเฉลี่ย (จ่าย→ติดตั้ง)"
                                value={dashboardData.avgDays === '-' ? '-' : `${dashboardData.avgDays} วัน`}
                                subtitle="เฉลี่ยตั้งแต่จ่ายจนติดตั้ง"
                                icon="⏱️"
                                color="#2196f3"
                            />
                        </View>

                        {/* Charts Row */}
                        <View style={styles.chartsRow}>
                            <View style={styles.chartCard}>
                                <PieChart
                                    data={dashboardData.pieData}
                                    title="🔵 สัดส่วนสถานะซีล"
                                    size={180}
                                />
                            </View>
                            <View style={[styles.chartCard, { flex: 1.5 }]}>
                                <BarChart
                                    data={dashboardData.barData}
                                    title="📈 จำนวนซีลที่สร้างแยกตามเดือน"
                                    barHeight={180}
                                />
                            </View>
                        </View>
                    </>
                )}

                {/* ── Anomaly Report Section ────────── */}
                {showAnomalies && (
                    <AnomalyReport items={items} onClose={() => setShowAnomalies(false)} />
                )}

                {/* ── Filters Card ────────────────── */}
                <View style={[styles.card, { zIndex: 100, overflow: 'visible' as any }]}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>🔍 ตัวกรองข้อมูล</Text>
                    </View>
                    <View style={[styles.filterRow, { zIndex: 100, overflow: 'visible' as any }]}>
                        <DateInput label="วันที่เริ่มต้น" value={startDate} onChange={setStartDate} />
                        <DateInput label="วันที่สิ้นสุด" value={endDate} onChange={setEndDate} />
                        <Dropdown label="สังกัด (PEA Code)" value={peaCode} options={peaOptions} onChange={setPeaCode} zIndex={20} />
                        <Dropdown label="สถานะซีล" value={statusFilter} options={statusOptions} onChange={setStatusFilter} zIndex={10} />
                    </View>
                </View>

                {/* ── Export + Search Section ─────── */}
                <View style={[styles.card, { zIndex: 50 }]}>
                    <View style={styles.exportRow}>
                        <View style={styles.exportLeft}>
                            <Text style={styles.exportIcon}>📋</Text>
                            <Text style={styles.exportTitle}>ส่งออกรายงาน</Text>
                            <Text style={styles.exportCount}>({filteredItems.length} รายการ)</Text>
                        </View>
                        <View style={styles.exportButtons}>
                            <TouchableOpacity style={[styles.exportBtn, { borderColor: '#4caf50' }]} onPress={() => exportCSV(filteredItems)}>
                                <Text style={[styles.exportBtnText, { color: '#4caf50' }]}>📄 CSV</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.exportBtn, { borderColor: '#2196f3' }]} onPress={() => exportExcel(filteredItems)}>
                                <Text style={[styles.exportBtnText, { color: '#2196f3' }]}>📊 Excel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.exportBtn, { borderColor: '#f44336' }]} onPress={() => exportPDF(filteredItems)}>
                                <Text style={[styles.exportBtnText, { color: '#f44336' }]}>📕 PDF</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ── Table Card ──────────────────── */}
                <View style={styles.card}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.tableTitle}>รายการซีลทั้งหมด</Text>
                        <View style={styles.searchContainer}>
                            <Text style={styles.searchIcon}>🔍</Text>
                            <TextInput
                                style={styles.searchInput}
                                placeholder="ค้นหาหมายเลขซีล, สถานะ, ผู้รับ..."
                                placeholderTextColor="#aaa"
                                value={searchQuery}
                                onChangeText={(t) => { setSearchQuery(t); setPage(1); }}
                            />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => setSearchQuery('')}>
                                    <Text style={styles.clearSearch}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={colors.primaryPurple} />
                            <Text style={styles.loadingText}>กำลังดึงข้อมูล...</Text>
                        </View>
                    ) : filteredItems.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyIcon}>📭</Text>
                            <Text style={styles.emptyText}>ไม่พบข้อมูลซีลตามเงื่อนไขที่เลือก</Text>
                        </View>
                    ) : (
                        <>
                            {/* Table */}
                            <ScrollView horizontal showsHorizontalScrollIndicator>
                                <View>
                                    {/* Header Row */}
                                    <View style={styles.headerRow}>
                                        <TouchableOpacity style={[styles.cell, styles.cellSealNo]} onPress={() => handleSort('seal_number')}>
                                            <Text style={styles.headerText}>หมายเลขซีล</Text>
                                            <SortIndicator field="seal_number" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.cell, styles.cellStatus]} onPress={() => handleSort('status')}>
                                            <Text style={styles.headerText}>สถานะ</Text>
                                            <SortIndicator field="status" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.cell, styles.cellPea]} onPress={() => handleSort('pea_code')}>
                                            <Text style={styles.headerText}>สังกัด กฟภ.</Text>
                                            <SortIndicator field="pea_code" />
                                        </TouchableOpacity>
                                        <View style={[styles.cell, styles.cellName]}>
                                            <Text style={styles.headerText}>ผู้จ่าย</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellName]}>
                                            <Text style={styles.headerText}>ผู้รับ</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellName]}>
                                            <Text style={styles.headerText}>ช่างที่ติดตั้ง</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellName]}>
                                            <Text style={styles.headerText}>ช่างที่ส่งคืน</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellName]}>
                                            <Text style={styles.headerText}>ผู้รับคืน</Text>
                                        </View>
                                        <View style={[styles.cell, styles.cellSerial]}>
                                            <Text style={styles.headerText}>เลขมิเตอร์</Text>
                                        </View>
                                        <TouchableOpacity style={[styles.cell, styles.cellDate]} onPress={() => handleSort('created_at')}>
                                            <Text style={styles.headerText}>วันที่สร้าง</Text>
                                            <SortIndicator field="created_at" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.cell, styles.cellDate]} onPress={() => handleSort('issued_at')}>
                                            <Text style={styles.headerText}>วันที่จ่าย</Text>
                                            <SortIndicator field="issued_at" />
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.cell, styles.cellDate]} onPress={() => handleSort('used_at')}>
                                            <Text style={styles.headerText}>วันที่ติดตั้ง</Text>
                                            <SortIndicator field="used_at" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Data Rows */}
                                    {pagedItems.map((item, idx) => {
                                        const statusColor = STATUS_COLORS[item.status] || { bg: '#f5f5f5', text: '#333' };
                                        return (
                                            <View key={item.id} style={[styles.dataRow, idx % 2 === 1 && styles.dataRowAlt]}>
                                                <View style={[styles.cell, styles.cellSealNo]}>
                                                    <Text style={styles.sealNoText}>{item.seal_number}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellStatus]}>
                                                    <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
                                                        <Text style={[styles.badgeText, { color: statusColor.text }]}>{item.status}</Text>
                                                    </View>
                                                </View>
                                                <View style={[styles.cell, styles.cellPea]}>
                                                    <Text style={styles.cellText}>{item.pea_code || '-'}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellName]}>
                                                    <Text style={styles.cellText}>{item.issued_by_name || '-'}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellName]}>
                                                    <Text style={styles.cellText}>{item.receiver_name || item.technician_name || '-'}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellName]}>
                                                    <Text style={styles.cellText}>{item.used_by_name || '-'}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellName]}>
                                                    <Text style={styles.cellText}>{item.returned_by_technician_name || '-'}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellName]}>
                                                    <Text style={styles.cellText}>{item.returned_by_name || '-'}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellSerial]}>
                                                    <Text style={styles.cellText}>{item.installed_serial || '-'}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellDate]}>
                                                    <Text style={styles.cellText}>{formatDate(item.created_at)}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellDate]}>
                                                    <Text style={styles.cellText}>{formatDate(item.issued_at)}</Text>
                                                </View>
                                                <View style={[styles.cell, styles.cellDate]}>
                                                    <Text style={styles.cellText}>{formatDate(item.used_at)}</Text>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            {/* Pagination */}
                            <View style={styles.pagination}>
                                <TouchableOpacity
                                    style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
                                    onPress={() => setPage(Math.max(1, page - 1))}
                                    disabled={page === 1}
                                >
                                    <Text style={[styles.pageBtnText, page === 1 && styles.pageBtnTextDisabled]}>◀ ก่อนหน้า</Text>
                                </TouchableOpacity>
                                <Text style={styles.pageInfo}>หน้า {page} / {totalPages} ({filteredItems.length} รายการ)</Text>
                                <TouchableOpacity
                                    style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
                                    onPress={() => setPage(Math.min(totalPages, page + 1))}
                                    disabled={page === totalPages}
                                >
                                    <Text style={[styles.pageBtnText, page === totalPages && styles.pageBtnTextDisabled]}>ถัดไป ▶</Text>
                                </TouchableOpacity>
                            </View>
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

    // Dashboard toggle
    toggleDashboardBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: sizes.radiusRound, backgroundColor: '#f3e5f5', borderWidth: 1, borderColor: '#ce93d8' },
    toggleDashboardText: { fontSize: sizes.fontSm, color: colors.primaryPurple, fontWeight: '600' },

    // Anomaly toggle
    toggleAnomalyBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: sizes.radiusRound, backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#ef9a9a', gap: 6, marginLeft: 8 },
    toggleAnomalyBtnActive: { backgroundColor: '#c62828', borderColor: '#c62828' },
    toggleAnomalyText: { fontSize: sizes.fontSm, color: '#c62828', fontWeight: '600' },
    toggleAnomalyTextActive: { color: 'white' },
    anomalyBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#f44336', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
    anomalyBadgeText: { fontSize: 11, color: 'white', fontWeight: 'bold' },

    // KPI Row
    kpiRow: { width: '100%', maxWidth: 1200, flexDirection: 'row', flexWrap: 'wrap', marginBottom: sizes.md },

    // Charts Row
    chartsRow: { width: '100%', maxWidth: 1200, flexDirection: 'row', flexWrap: 'wrap', gap: sizes.md, marginBottom: sizes.md },
    chartCard: { flex: 1, minWidth: 320, backgroundColor: 'white', borderRadius: sizes.radiusMd, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },

    // Card
    card: { width: '100%', maxWidth: 1200, backgroundColor: 'white', borderRadius: sizes.radiusMd, marginBottom: sizes.md, overflow: 'visible' as any, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
    cardHeader: { padding: sizes.md, paddingBottom: sizes.sm, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    cardTitle: { fontSize: sizes.fontMd, fontWeight: 'bold', color: colors.text },

    // Filter
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', padding: sizes.md, gap: sizes.sm },

    // Export
    exportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: sizes.md, flexWrap: 'wrap' },
    exportLeft: { flexDirection: 'row', alignItems: 'center' },
    exportIcon: { fontSize: 18, marginRight: 8 },
    exportTitle: { fontSize: sizes.fontMd, fontWeight: 'bold', color: colors.text },
    exportCount: { fontSize: sizes.fontSm, color: colors.textLight, marginLeft: 8 },
    exportButtons: { flexDirection: 'row', gap: sizes.sm },
    exportBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: sizes.radiusSm, borderWidth: 1.5, backgroundColor: 'white' },
    exportBtnText: { fontSize: sizes.fontSm, fontWeight: 'bold' },

    // Table header
    tableHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: sizes.md, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', flexWrap: 'wrap', gap: sizes.sm },
    tableTitle: { fontSize: sizes.fontMd, fontWeight: 'bold', color: colors.text },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: sizes.radiusRound, paddingHorizontal: 12, height: 38, borderWidth: 1, borderColor: '#dee2e6', minWidth: 280 },
    searchIcon: { fontSize: 14, marginRight: 6 },
    searchInput: { flex: 1, fontSize: sizes.fontSm, color: colors.text, height: '100%' },
    clearSearch: { fontSize: 16, color: colors.textLight, paddingHorizontal: 4 },

    // Table
    headerRow: { flexDirection: 'row', backgroundColor: '#f8f9fa', borderBottomWidth: 2, borderBottomColor: '#dee2e6' },
    headerText: { fontSize: sizes.fontXs, fontWeight: 'bold', color: colors.textLight, textTransform: 'uppercase' as any },
    dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    dataRowAlt: { backgroundColor: '#fafafa' },
    cell: { paddingVertical: 12, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center' },
    cellSealNo: { width: 150 },
    cellStatus: { width: 120 },
    cellPea: { width: 100 },
    cellName: { width: 140 },
    cellSerial: { width: 120 },
    cellDate: { width: 120 },
    cellText: { fontSize: sizes.fontSm, color: colors.text },
    sealNoText: { fontSize: sizes.fontSm, color: colors.primaryPurple, fontWeight: '600' },

    // Badge
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: sizes.radiusRound },
    badgeText: { fontSize: sizes.fontXs, fontWeight: 'bold' },

    // Pagination
    pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: sizes.md, gap: sizes.md },
    pageBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: sizes.radiusSm, backgroundColor: colors.primaryPurple },
    pageBtnDisabled: { backgroundColor: '#e0e0e0' },
    pageBtnText: { color: 'white', fontSize: sizes.fontSm, fontWeight: 'bold' },
    pageBtnTextDisabled: { color: '#999' },
    pageInfo: { fontSize: sizes.fontSm, color: colors.textLight },

    // Loading / Empty
    loadingContainer: { padding: sizes.xxl, alignItems: 'center' },
    loadingText: { marginTop: sizes.md, color: colors.textLight },
    emptyContainer: { padding: sizes.xxl, alignItems: 'center' },
    emptyIcon: { fontSize: 48, marginBottom: sizes.md },
    emptyText: { fontSize: sizes.fontMd, color: colors.textLight },
});
