import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TextInput, TouchableOpacity, Modal, Alert, Platform } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { userService } from '@/services/userService';
import { Seal } from '@/types';
import { useNavigation, useFocusEffect, useRoute } from '@react-navigation/native';
import { useAuth } from '@/context/AuthContext';
import { SealStatus } from '../../constants/status';
import { useRealtime } from '@/hooks/useRealtime';

// ─── Status Badge ────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string; seal?: Seal }> = ({ status, seal }) => {
    let bgColor: string = colors.bgLight;
    let textColor: string = colors.textLight;

    const { user } = useAuth();
    
    const label = useMemo(() => {
        switch (status) {
            case SealStatus.READY: return 'พร้อมใช้งาน';
            case SealStatus.WAIT_CONFIRMATION: 
                if (seal && seal.pending_pea_code === user?.pea_code) {
                    return 'รอยืนยันรับโอน';
                }
                return 'รอยืนยัน';
            case SealStatus.ISSUED: return 'จ่าย';
            case SealStatus.INSTALLED: return 'ติดตั้งแล้ว';
            case SealStatus.USED: return 'ใช้งานแล้ว';
            case SealStatus.PENDING_RETURN: return 'รอตรวจสอบคืน';
            case SealStatus.DAMAGED: return 'เสียหาย';
            case SealStatus.LOST: return 'สูญหาย';
            default: return status;
        }
    }, [status, seal, user?.pea_code]);

    switch (status) {
        case SealStatus.READY:
            bgColor = '#E8F5E9';
            textColor = '#2E7D32';
            break;
        case SealStatus.ISSUED:
        case SealStatus.INSTALLED:
            bgColor = '#E3F2FD';
            textColor = '#1976D2';
            break;
        case SealStatus.WAIT_CONFIRMATION:
            if (seal && seal.pending_pea_code === user?.pea_code) {
                bgColor = '#E8F5E9'; // Use green for incoming to stand out? Or Cyan.
                textColor = '#2E7D32';
            } else {
                bgColor = '#E0F7FA';
                textColor = '#006064';
            }
            break;
        case SealStatus.USED:
            bgColor = '#F3E5F5';
            textColor = '#7B1FA2';
            break;
        case SealStatus.DAMAGED:
        case SealStatus.LOST:
            bgColor = '#FFEBEE';
            textColor = '#C62828';
            break;
        case SealStatus.PENDING_RETURN:
            bgColor = '#FFF3E0';
            textColor = '#E65100';
            break;
        default:
            bgColor = colors.bgLight;
            textColor = colors.textLight;
    }

    return (
        <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
            <Text style={[styles.statusText, { color: textColor }]}>{label}</Text>
        </View>
    );
};

// ─── Checkbox Component ──────────────────────────────────────────────────
const Checkbox: React.FC<{ checked: boolean; onPress: () => void; partial?: boolean }> = ({ checked, onPress, partial }) => (
    <TouchableOpacity
        style={[
            styles.checkbox,
            checked && styles.checkboxChecked,
            partial && !checked && styles.checkboxPartial,
        ]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        {checked && <Text style={styles.checkboxMark}>✓</Text>}
        {partial && !checked && <Text style={styles.checkboxMark}>—</Text>}
    </TouchableOpacity>
);

// ─── Main Screen ─────────────────────────────────────────────────────────
export const SealInventoryScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const { user } = useAuth();
    const routeParams = route?.params as { filter?: string } | undefined;
    const userPeaCode = user?.pea_code as string | undefined;

    // Data
    const [seals, setSeals] = useState<Seal[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('สถานะทั้งหมด');
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [masPeaList, setMasPeaList] = useState<any[]>([]);

    // Selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Modals
    const [showStatusModal, setShowStatusModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
    const [transferDropdownOpen, setTransferDropdownOpen] = useState(false);

    // Modal form values
    const [newStatus, setNewStatus] = useState('');
    const [statusRemark, setStatusRemark] = useState('');
    const [newPeaCode, setNewPeaCode] = useState('');
    const [actionLoading, setActionLoading] = useState(false);

    const statuses = [
        'สถานะทั้งหมด',
        'รอยืนยันรับโอน',
        SealStatus.READY,
        SealStatus.WAIT_CONFIRMATION,
        SealStatus.ISSUED,
        SealStatus.INSTALLED,
        SealStatus.USED,
        SealStatus.DAMAGED,
        SealStatus.LOST,
        SealStatus.PENDING_RETURN
    ];

    const statusOptions = [
        SealStatus.READY,
        SealStatus.WAIT_CONFIRMATION,
        SealStatus.ISSUED,
        SealStatus.INSTALLED,
        SealStatus.USED,
        SealStatus.DAMAGED,
        SealStatus.LOST,
        SealStatus.PENDING_RETURN
    ];

    const getStatusLabel = (status: string, seal?: Seal) => {
        switch (status) {
            case SealStatus.READY: return 'พร้อมใช้งาน';
            case SealStatus.WAIT_CONFIRMATION: 
                if (seal && seal.pending_pea_code === user?.pea_code) {
                    return 'รอยืนยันรับโอน';
                }
                return 'รอยืนยัน';
            case SealStatus.ISSUED: return 'จ่าย';
            case SealStatus.INSTALLED: return 'ติดตั้งแล้ว';
            case SealStatus.USED: return 'ใช้งานแล้ว';
            case SealStatus.PENDING_RETURN: return 'รอตรวจสอบคืน';
            case SealStatus.DAMAGED: return 'เสียหาย';
            case SealStatus.LOST: return 'สูญหาย';
            default: return status;
        }
    };

    useFocusEffect(
        useCallback(() => {
            const filterValue = route.params?.filter;

            if (filterValue) {
                setStatusFilter(filterValue);
                // Clear the param after using it so it doesn't stick
                navigation.setParams({ filter: undefined } as any);
            }
            fetchSeals();
            fetchMasPea();
        }, [userPeaCode, route.params?.filter])
    );

    // ✅ Real-time Updates
    useRealtime(userPeaCode, (msg) => {
        if (msg === 'seal_updated') {
            console.log('🔄 Real-time update: refreshing seals...');
            fetchSeals();
        }
    });

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
        } catch (e) { console.error('MasPea fetch error', e); }
    };

    const getPeaName = (code?: string) => {
        if (!code) return '-';
        const found = masPeaList.find(p =>
            (p.pea_code || p.PeaCode || p.code) === code
        );
        return found ? (found.name_th || found.NameTh || code) : code;
    };

    const fetchSeals = async () => {
        try {
            setLoading(true);
            // Fetch seals belonging to this PEA
            const owned = await sealService.getSeals(userPeaCode);
            // Fetch seals transferred to this PEA
            const incoming = await sealService.getSeals(undefined, userPeaCode);
            
            // Combine and remove any potential duplicates (though unlikely)
            const combined = [...owned, ...incoming];
            const unique = Array.from(new Map(combined.map(s => [s.id, s])).values());
            
            setSeals(unique);
        } catch (error) {
            console.error('Error fetching seals:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredSeals = useMemo(() => {
        return seals.filter(seal => {
            const matchesSearch = seal.seal_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (seal.installed_serial && seal.installed_serial.toLowerCase().includes(searchQuery.toLowerCase()));
            
            let matchesStatus = true;
            if (statusFilter !== 'สถานะทั้งหมด') {
                if (statusFilter === 'รอยืนยันรับโอน') {
                    matchesStatus = seal.status === SealStatus.WAIT_CONFIRMATION && seal.pending_pea_code === user?.pea_code;
                } else {
                    matchesStatus = seal.status === statusFilter;
                }
            }
            return matchesSearch && matchesStatus;
        });
    }, [seals, searchQuery, statusFilter, user?.pea_code]);

    // ─── Selection Logic ─────────────────────────────────────────────
    const isAllSelected = filteredSeals.length > 0 && filteredSeals.every(s => selectedIds.has(s.id));
    const isSomeSelected = filteredSeals.some(s => selectedIds.has(s.id));

    const toggleSelectAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredSeals.map(s => s.id)));
        }
    };

    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const clearSelection = () => setSelectedIds(new Set());

    const selectedSealNumbers = useMemo(() => {
        return seals.filter(s => selectedIds.has(s.id)).map(s => s.seal_number);
    }, [seals, selectedIds]);

    const canRecall = useMemo(() => {
        return selectedIds.size > 0;
    }, [selectedIds.size]);

    const canConfirmTransfer = useMemo(() => {
        if (selectedIds.size === 0) return false;
        const selectedSeals = seals.filter(s => selectedIds.has(s.id));
        return selectedSeals.every(s =>
            s.status === SealStatus.WAIT_CONFIRMATION &&
            s.pending_pea_code === user?.pea_code
        );
    }, [seals, selectedIds, user?.pea_code]);

    // ─── Bulk Actions ────────────────────────────────────────────────
    const handleBulkStatusUpdate = async () => {
        if (!newStatus) {
            Alert.alert('กรุณาเลือกสถานะ', 'โปรดเลือกสถานะที่ต้องการเปลี่ยน');
            return;
        }
        try {
            setActionLoading(true);
            const res = await sealService.bulkUpdateStatus(selectedSealNumbers, newStatus, statusRemark);
            Alert.alert('สำเร็จ ✅', res.data.message || `อัปเดตสถานะซีลสำเร็จ ${selectedIds.size} รายการ`);
            setShowStatusModal(false);
            setNewStatus('');
            setStatusRemark('');
            clearSelection();
            fetchSeals();
        } catch (err: any) {
            Alert.alert('เกิดข้อผิดพลาด', err.response?.data?.error || 'ไม่สามารถอัปเดตสถานะได้');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkTransfer = async () => {
        if (!newPeaCode) {
            Alert.alert('กรุณาเลือกสังกัด', 'โปรดเลือกสังกัดปลายทาง');
            return;
        }
        try {
            setActionLoading(true);
            const res = await sealService.bulkTransferPeaCode(selectedSealNumbers, newPeaCode);
            Alert.alert('สำเร็จ ✅', res.data.message || `โอนย้ายซีลสำเร็จ ${selectedIds.size} รายการ`);
            setShowTransferModal(false);
            setNewPeaCode('');
            clearSelection();
            fetchSeals();
        } catch (err: any) {
            Alert.alert('เกิดข้อผิดพลาด', err.response?.data?.error || 'ไม่สามารถโอนย้ายได้');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkRecall = async () => {
        // 1. Validate statuses first
        const selectedSeals = seals.filter(s => selectedIds.has(s.id));
        const invalidSeals = selectedSeals.filter(s =>
            s.status !== SealStatus.WAIT_CONFIRMATION &&
            s.status !== SealStatus.ISSUED
        );

        if (invalidSeals.length > 0) {
            const errorMsg = 'สามารถเรียกคืนได้เฉพาะซีลที่อยู่ในสถานะ "รอยืนยัน" และ "จ่าย" เท่านั้น';
            if (Platform.OS === 'web') {
                window.alert(errorMsg);
            } else {
                Alert.alert('ไม่สามารถดำเนินการได้', errorMsg);
            }
            return;
        }

        const title = 'ยืนยันการเรียกคืนซีล';
        const message = `คุณต้องการเรียกคืนซีลจำนวน ${selectedIds.size} รายการ กลับเป็นสถานะ 'พร้อมใช้งาน' หรือไม่?`;

        const proceed = await new Promise((resolve) => {
            if (Platform.OS === 'web') {
                resolve(window.confirm(message));
            } else {
                Alert.alert(title, message, [
                    { text: 'ยกเลิก', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'เรียกคืนซีล', style: 'destructive', onPress: () => resolve(true) }
                ]);
            }
        });

        if (!proceed) return;

        try {
            setActionLoading(true);
            const res = await sealService.bulkRecallSeals(selectedSealNumbers);
            const successMsg = res.data.message || `เรียกคืนซีลสำเร็จ ${res.data.count} รายการ`;

            if (Platform.OS === 'web') {
                window.alert(successMsg);
            } else {
                Alert.alert('สำเร็จ ✅', successMsg);
            }
            clearSelection();
            fetchSeals();
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'ไม่สามารถเรียกคืนซีลได้';
            if (Platform.OS === 'web') {
                window.alert(errorMsg);
            } else {
                Alert.alert('เกิดข้อผิดพลาด', errorMsg);
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkConfirmTransfer = async () => {
        const title = 'ยืนยันการรับโอนซีล';
        const message = `คุณต้องการยืนยันการรับโอนซีลจำนวน ${selectedIds.size} รายการ เข้าสู่สังกัดของคุณหรือไม่?`;

        const proceed = await new Promise((resolve) => {
            if (Platform.OS === 'web') {
                resolve(window.confirm(message));
            } else {
                Alert.alert(title, message, [
                    { text: 'ยกเลิก', style: 'cancel', onPress: () => resolve(false) },
                    { text: 'ยืนยันรับโอน', style: 'default', onPress: () => resolve(true) }
                ]);
            }
        });

        if (!proceed) return;

        try {
            setActionLoading(true);
            const res = await sealService.bulkConfirmCompanyTransfer(selectedSealNumbers, user?.pea_code || '');
            const successMsg = res.data.message || `ยืนยันรับโอนซีลสำเร็จ ${res.data.confirmed} รายการ`;

            if (Platform.OS === 'web') {
                window.alert(successMsg);
            } else {
                Alert.alert('สำเร็จ ✅', successMsg);
            }
            clearSelection();
            fetchSeals();
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'ไม่สามารถยืนยันรับโอนซีลได้';
            if (Platform.OS === 'web') {
                window.alert(errorMsg);
            } else {
                Alert.alert('เกิดข้อผิดพลาด', errorMsg);
            }
        } finally {
            setActionLoading(false);
        }
    };

    // ─── Render ──────────────────────────────────────────────────────
    return (
        <View style={styles.mainContainer}>
            <Header />

            <View style={styles.content}>
                {/* Title Label */}
                <View style={[styles.titleLabelContainer, { position: 'absolute', top: -15, left: 20, zIndex: 10 }]}>
                    <Text style={styles.titleLabelText}>📑 ซีลในคลัง {userPeaCode ? `(${userPeaCode})` : ''}</Text>
                </View>

                {/* Toolbar */}
                <View style={styles.toolbar}>
                    <View style={styles.searchContainer}>
                        <Text style={styles.searchIcon}>🔍</Text>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ค้นหาเบอร์ซีล (Serial)..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>

                    {/* Status Filter Dropdown */}
                    <View style={styles.filterContainer}>
                        <TouchableOpacity
                            style={styles.dropdownTrigger}
                            onPress={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <Text style={styles.dropdownValue}>{getStatusLabel(statusFilter)}</Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>

                        {isDropdownOpen && (
                            <View style={styles.dropdownMenu}>
                                {statuses.map((s) => (
                                    <TouchableOpacity
                                        key={s}
                                        style={[
                                            styles.dropdownItem,
                                            statusFilter === s && styles.dropdownItemActive
                                        ]}
                                        onPress={() => {
                                            setStatusFilter(s);
                                            setIsDropdownOpen(false);
                                        }}
                                    >
                                        <Text style={[
                                            styles.dropdownItemText,
                                            statusFilter === s && styles.dropdownItemTextActive
                                        ]}>
                                            {getStatusLabel(s)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )}
                    </View>

                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => (navigation as any).navigate('Seals', { screen: 'CreateSeal' })}
                    >
                        <Text style={styles.addButtonText}>+ นำเข้าซีลใหม่</Text>
                    </TouchableOpacity>
                </View>

                {/* Table */}
                <ScrollView style={{ flex: 1 }}>
                    <View style={{ width: '100%' }}>
                        {/* Table Header */}
                        <View style={styles.tableHeader}>
                            <View style={{ width: 44, alignItems: 'center' }}>
                                <Checkbox
                                    checked={isAllSelected}
                                    partial={!isAllSelected && isSomeSelected}
                                    onPress={toggleSelectAll}
                                />
                            </View>
                            <Text style={[styles.headerText, { flex: 2 }]}>หมายเลขซีล</Text>
                            <Text style={[styles.headerText, { flex: 1.5 }]}>สังกัด (PEA CODE)</Text>
                            <Text style={[styles.headerText, { flex: 1.5 }]}>สถานะ</Text>
                            <Text style={[styles.headerText, { flex: 1.5 }]}>อัปเดตล่าสุด</Text>
                        </View>

                        {/* Table Body */}
                        <View style={styles.scrollContent}>
                            {loading ? (
                                <View style={styles.centerContainer}>
                                    <ActivityIndicator size="large" color={colors.primaryPurple} />
                                </View>
                            ) : filteredSeals.length === 0 ? (
                                <View style={styles.centerContainer}>
                                    <Text style={styles.emptyText}>ไม่พบข้อมูลซีล</Text>
                                </View>
                            ) : (
                                filteredSeals.map((seal) => {
                                    const isSelected = selectedIds.has(seal.id);
                                    return (
                                        <TouchableOpacity
                                            key={seal.id}
                                            style={[styles.tableRow, isSelected && styles.tableRowSelected]}
                                            onPress={() => (navigation as any).navigate('SealHistory', { sealNumber: seal.seal_number })}
                                        >
                                            {/* Checkbox */}
                                            <View style={{ width: 44, alignItems: 'center' }}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onPress={() => toggleSelect(seal.id)}
                                                />
                                            </View>

                                            {/* Seal Number */}
                                            <View style={[styles.cell, { flex: 2 }]}>
                                                <Text style={styles.serialText}>{seal.seal_number}</Text>
                                                <Text style={styles.batchText}>Batch: {seal.box_number || '-'}</Text>
                                            </View>

                                            {/* PEA Code + Name */}
                                            <View style={[styles.cell, { flex: 1.5 }]}>
                                                <Text style={styles.peaCodeText}>{seal.pea_code || '-'}</Text>
                                                <Text style={styles.peaNameText}>{getPeaName(seal.pea_code)}</Text>
                                            </View>

                                             {/* Status */}
                                             <View style={[styles.cell, { flex: 1.5 }]}>
                                                 <StatusBadge status={seal.status} seal={seal} />
                                             </View>

                                            {/* Updated Date */}
                                            <View style={[styles.cell, { flex: 1.5 }]}>
                                                <Text style={styles.dateText}>
                                                    {new Date(seal.updated_at || seal.created_at || Date.now()).toLocaleDateString('th-TH', {
                                                        day: 'numeric', month: 'short', year: 'numeric'
                                                    })}
                                                </Text>
                                                <Text style={styles.timeText}>
                                                    {new Date(seal.updated_at || seal.created_at || Date.now()).toLocaleTimeString('th-TH', {
                                                        hour: '2-digit', minute: '2-digit'
                                                    })} น.
                                                </Text>
                                            </View>
                                        </TouchableOpacity>
                                    );
                                })
                            )}
                        </View>
                    </View>
                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        แสดง {filteredSeals.length} รายการ
                    </Text>
                    <View style={styles.pagination}>
                        <TouchableOpacity style={styles.pageBtn}><Text>‹</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.pageBtn, styles.pageBtnActive]}><Text style={{ color: 'white' }}>1</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.pageBtn}><Text>›</Text></TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* ═══════════════════════════════════════════════════════════════
                FLOATING ACTION BAR
               ═══════════════════════════════════════════════════════════════ */}
            {selectedIds.size > 0 && (
                <View style={styles.floatingBar}>
                    {/* Left: count + deselect */}
                    <View style={styles.floatingBarLeft}>
                        <View style={styles.floatingBadge}>
                            <Text style={styles.floatingBadgeText}>{selectedIds.size}</Text>
                        </View>
                        <View style={{ marginLeft: 10 }}>
                            <Text style={styles.floatingTitle}>รายการที่เลือก</Text>
                            <TouchableOpacity onPress={clearSelection}>
                                <Text style={styles.floatingDeselect}>ยกเลิกการเลือก</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Right: action buttons */}
                    <View style={styles.floatingBarRight}>
                        <TouchableOpacity
                            style={[styles.recallBtn, !canRecall && styles.recallBtnDisabled]}
                            onPress={handleBulkRecall}
                            disabled={!canRecall || actionLoading}
                        >
                            <Text style={styles.recallBtnText}>🔄 เรียกคืนซีล</Text>
                        </TouchableOpacity>

                        {canConfirmTransfer && (
                            <TouchableOpacity
                                style={styles.confirmTransferBtn}
                                onPress={handleBulkConfirmTransfer}
                                disabled={actionLoading}
                            >
                                <Text style={styles.confirmTransferBtnText}>📥 ยืนยันรับโอน</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.transferBtn}
                            onPress={() => setShowTransferModal(true)}
                        >
                            <Text style={styles.transferBtnText}>🏢 เปลี่ยนสังกัด</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.statusBtn}
                            onPress={() => setShowStatusModal(true)}
                        >
                            <Text style={styles.statusBtnText}>🏷️ อัปเดตสถานะ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                BULK STATUS UPDATE MODAL
               ═══════════════════════════════════════════════════════════════ */}
            <Modal visible={showStatusModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <Text style={{ fontSize: 18 }}>🏷️</Text>
                                <Text style={styles.modalTitle}>อัปเดตสถานะซีล (Bulk)</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setShowStatusModal(false); setNewStatus(''); setStatusRemark(''); }}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Summary Banner */}
                        <View style={styles.summaryBanner}>
                            <Text style={styles.summaryText}>
                                กำลังเปลี่ยนสถานะซีลจำนวน <Text style={styles.summaryCount}>{selectedIds.size}</Text> รายการ
                            </Text>
                        </View>

                        {/* Status Picker */}
                        <Text style={styles.fieldLabel}>เลือกสถานะใหม่ <Text style={{ color: '#C62828' }}>*</Text></Text>
                        <TouchableOpacity
                            style={styles.modalDropdownTrigger}
                            onPress={() => setStatusDropdownOpen(!statusDropdownOpen)}
                        >
                            <Text style={[styles.modalDropdownValue, !newStatus && { color: '#aaa' }]}>
                                {newStatus ? getStatusLabel(newStatus) : '-- เลือกสถานะ --'}
                            </Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>
                        {statusDropdownOpen && (
                            <View style={styles.modalDropdownMenu}>
                                <ScrollView style={{ maxHeight: 200 }}>
                                    {statusOptions.map((s) => (
                                        <TouchableOpacity
                                            key={s}
                                            style={[styles.dropdownItem, newStatus === s && styles.dropdownItemActive]}
                                            onPress={() => { setNewStatus(s); setStatusDropdownOpen(false); }}
                                        >
                                            <Text style={[styles.dropdownItemText, newStatus === s && styles.dropdownItemTextActive]}>
                                                {getStatusLabel(s)}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Remark */}
                        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>หมายเหตุ (เพื่อเก็บ Log)</Text>
                        <TextInput
                            style={styles.remarkInput}
                            placeholder="ระบุเหตุผลในการเปลี่ยนสถานะ..."
                            value={statusRemark}
                            onChangeText={setStatusRemark}
                            multiline
                            numberOfLines={3}
                        />

                        {/* Buttons */}
                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => { setShowStatusModal(false); setNewStatus(''); setStatusRemark(''); }}
                            >
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, actionLoading && { opacity: 0.6 }]}
                                onPress={handleBulkStatusUpdate}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>บันทึกสถานะ</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ═══════════════════════════════════════════════════════════════
                BULK TRANSFER MODAL
               ═══════════════════════════════════════════════════════════════ */}
            <Modal visible={showTransferModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        {/* Header */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <Text style={{ fontSize: 18 }}>🏢</Text>
                                <Text style={styles.modalTitle}>โอนย้ายสังกัด (Transfer)</Text>
                            </View>
                            <TouchableOpacity onPress={() => { setShowTransferModal(false); setNewPeaCode(''); }}>
                                <Text style={styles.modalClose}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Summary Banner */}
                        <View style={[styles.summaryBanner, { backgroundColor: '#F5F5F5' }]}>
                            <Text style={[styles.summaryText, { color: '#333' }]}>
                                กำลังโอนย้ายซีลจำนวน <Text style={[styles.summaryCount, { color: '#333' }]}>{selectedIds.size}</Text> รายการ
                            </Text>
                        </View>

                        {/* PEA Code picker */}
                        <Text style={styles.fieldLabel}>เลือกสังกัดปลายทาง (PEA Code) <Text style={{ color: '#C62828' }}>*</Text></Text>
                        <TouchableOpacity
                            style={styles.modalDropdownTrigger}
                            onPress={() => setTransferDropdownOpen(!transferDropdownOpen)}
                        >
                            <Text style={[styles.modalDropdownValue, !newPeaCode && { color: '#aaa' }]}>
                                {newPeaCode ? `${newPeaCode} — ${getPeaName(newPeaCode)}` : '-- เลือกหน่วยงาน กฟภ. --'}
                            </Text>
                            <Text style={styles.dropdownArrow}>▼</Text>
                        </TouchableOpacity>
                        {transferDropdownOpen && (
                            <View style={styles.modalDropdownMenu}>
                                <ScrollView style={{ maxHeight: 200 }}>
                                    {masPeaList.map((p) => {
                                        const code = p.pea_code || p.PeaCode || p.code;
                                        const name = p.name_th || p.NameTh || code;
                                        return (
                                            <TouchableOpacity
                                                key={code}
                                                style={[styles.dropdownItem, newPeaCode === code && styles.dropdownItemActive]}
                                                onPress={() => { setNewPeaCode(code); setTransferDropdownOpen(false); }}
                                            >
                                                <Text style={[styles.dropdownItemText, newPeaCode === code && styles.dropdownItemTextActive]}>
                                                    {code} — {name}
                                                </Text>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* Buttons */}
                        <View style={[styles.modalButtons, { marginTop: 24 }]}>
                            <TouchableOpacity
                                style={styles.cancelBtn}
                                onPress={() => { setShowTransferModal(false); setNewPeaCode(''); }}
                            >
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtnDark, actionLoading && { opacity: 0.6 }]}
                                onPress={handleBulkTransfer}
                                disabled={actionLoading}
                            >
                                {actionLoading ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={styles.confirmBtnText}>ยืนยันการโอนย้าย</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: colors.bgLight,
    },
    content: {
        flex: 1,
        margin: sizes.lg,
        backgroundColor: colors.white,
        borderRadius: sizes.radMd,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    titleLabelContainer: {
        backgroundColor: colors.primaryPurple,
        paddingHorizontal: sizes.md,
        paddingVertical: sizes.xs,
        borderRadius: sizes.radSm,
    },
    titleLabelText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: sizes.fontMd,
    },
    toolbar: {
        flexDirection: 'row',
        padding: sizes.md,
        paddingTop: sizes.xl,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        zIndex: 50,
    },
    searchContainer: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: sizes.radSm,
        paddingHorizontal: sizes.sm,
        marginRight: sizes.md,
    },
    searchIcon: {
        marginRight: sizes.xs,
    },
    searchInput: {
        flex: 1,
        height: 40,
        fontSize: sizes.fontSm,
    },
    filterContainer: {
        flex: 1.2,
        marginRight: sizes.md,
        position: 'relative',
        zIndex: 60,
    },
    dropdownTrigger: {
        height: 40,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: sizes.radSm,
        paddingHorizontal: sizes.sm,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    dropdownValue: {
        fontSize: sizes.fontSm,
        color: '#444',
    },
    dropdownArrow: {
        fontSize: 10,
        color: '#999',
    },
    dropdownMenu: {
        position: 'absolute',
        top: 45,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: sizes.radSm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 10,
        zIndex: 1000,
    },
    dropdownItem: {
        paddingVertical: sizes.sm,
        paddingHorizontal: sizes.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    dropdownItemActive: {
        backgroundColor: '#f0f0f0',
    },
    dropdownItemText: {
        fontSize: sizes.fontSm,
        color: '#666',
    },
    dropdownItemTextActive: {
        color: colors.primaryPurple,
        fontWeight: 'bold',
    },
    addButton: {
        backgroundColor: colors.primaryPurple,
        paddingHorizontal: sizes.md,
        height: 40,
        justifyContent: 'center',
        borderRadius: sizes.radSm,
    },
    addButtonText: {
        color: colors.white,
        fontWeight: 'bold',
        fontSize: sizes.fontSm,
    },
    // ── Table ──
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#F8F9FA',
        paddingVertical: sizes.sm,
        paddingHorizontal: sizes.md,
        borderBottomWidth: 2,
        borderBottomColor: '#eee',
        alignItems: 'center',
    },
    headerText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#666',
        textTransform: 'uppercase',
    },
    scrollContent: {
        flexGrow: 1,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: sizes.md,
        paddingHorizontal: sizes.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        alignItems: 'center',
    },
    tableRowSelected: {
        backgroundColor: '#F3E8FF',
    },
    cell: {
        justifyContent: 'center',
    },
    serialText: {
        fontSize: sizes.fontSm,
        fontWeight: 'bold',
        color: colors.primaryPurple,
    },
    batchText: {
        fontSize: 10,
        color: '#999',
    },
    cellText: {
        fontSize: sizes.fontSm,
        color: '#444',
    },
    peaCodeText: {
        fontSize: sizes.fontSm,
        fontWeight: '600',
        color: colors.primaryPurple,
    },
    peaNameText: {
        fontSize: 10,
        color: '#888',
    },
    statusBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    dateText: {
        fontSize: 12,
        color: '#444',
    },
    timeText: {
        fontSize: 10,
        color: '#999',
    },
    // ── Footer ──
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: sizes.md,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    footerText: {
        fontSize: sizes.fontXs,
        color: '#666',
    },
    pagination: {
        flexDirection: 'row',
    },
    pageBtn: {
        width: 32,
        height: 32,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 4,
    },
    pageBtnActive: {
        backgroundColor: colors.primaryPurple,
        borderColor: colors.primaryPurple,
    },
    centerContainer: {
        padding: sizes.xl,
        alignItems: 'center',
    },
    emptyText: {
        color: colors.textLight,
    },
    // ── Checkbox ──
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#ccc',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    checkboxChecked: {
        backgroundColor: colors.primaryPurple,
        borderColor: colors.primaryPurple,
    },
    checkboxPartial: {
        backgroundColor: '#B39DDB',
        borderColor: '#B39DDB',
    },
    checkboxMark: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
        lineHeight: 16,
    },
    // ── Floating Action Bar ──
    floatingBar: {
        position: 'absolute',
        bottom: 24,
        left: '15%',
        right: '15%',
        backgroundColor: '#1E1E2D',
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 20,
        zIndex: 100,
    },
    floatingBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    floatingBadge: {
        backgroundColor: colors.primaryPurple,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingBadgeText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    floatingTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    floatingDeselect: {
        color: '#aaa',
        fontSize: 11,
        textDecorationLine: 'underline',
    },
    floatingBarRight: {
        flexDirection: 'row',
        gap: 10,
    },
    recallBtn: {
        backgroundColor: '#D32F2F', // Deep red
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginRight: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    recallBtnDisabled: {
        backgroundColor: '#EF9A9A', // Lighter red for disabled
    },
    recallBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    confirmTransferBtn: {
        backgroundColor: '#2E7D32', // Green
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginRight: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    confirmTransferBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 13,
    },
    transferBtn: {
        backgroundColor: '#3A3A4A',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    transferBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    statusBtn: {
        backgroundColor: colors.primaryPurple,
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 10,
    },
    statusBtnText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 13,
    },
    // ── Modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '90%',
        maxWidth: 500,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    modalHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#333',
    },
    modalClose: {
        fontSize: 20,
        color: '#999',
        padding: 4,
    },
    summaryBanner: {
        backgroundColor: '#F3E5F5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    summaryText: {
        fontSize: 14,
        color: '#6A1B9A',
    },
    summaryCount: {
        fontWeight: 'bold',
        color: '#6A1B9A',
    },
    fieldLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
    },
    modalDropdownTrigger: {
        height: 44,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalDropdownValue: {
        fontSize: 14,
        color: '#333',
    },
    modalDropdownMenu: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 6,
    },
    remarkInput: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 80,
        textAlignVertical: 'top',
        backgroundColor: '#FAFAFA',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        gap: 12,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    cancelBtnText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },
    confirmBtn: {
        backgroundColor: colors.primaryPurple,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    confirmBtnDark: {
        backgroundColor: '#333',
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 8,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
