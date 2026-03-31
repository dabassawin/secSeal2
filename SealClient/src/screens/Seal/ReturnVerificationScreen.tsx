import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform, Modal, Pressable, Image } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { useAuth } from '@/context/AuthContext';
import { sealService } from '@/services/sealService';
import { SealStatus } from '../../constants/status';
import api from '@/services/api';

// ─── Status badge colors ────────────────────────────
const REMARK_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
    'ซีลเก่าที่ถูกตัดออก': { bg: '#f3e5f5', text: '#7b1fa2', icon: '✂️' },
    'ชำรุดก่อนใช้งาน': { bg: '#fff3e0', text: '#e65100', icon: '⚠️' },
    'ไม่ได้ใช้งาน (คืนคลัง)': { bg: '#e8f5e9', text: '#2e7d32', icon: '😊' },
    [SealStatus.PENDING_RETURN]: { bg: '#e3f2fd', text: '#1565c0', icon: '🔍' },
};

interface PendingReturnItem {
    id: number;
    seal_number: string;
    status: string;
    pea_code: string;
    return_remarks: string;
    returned_at: string | null;
    image2?: string;
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

    // ─── Confirmation modal state ────────────────────
    const [confirmItem, setConfirmItem] = useState<PendingReturnItem | null>(null);
    const [confirmed, setConfirmed] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

    // ─── Helper: get image url ───────────────────────
    const getImageUrl = (imagePath: string | undefined) => {
        if (!imagePath) return '';
        let cleanPath = imagePath.replace(/\\/g, '/');
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        const baseURL = api.defaults.baseURL || 'http://localhost:3000';
        return `${baseURL}/${cleanPath}`;
    };

    // ─── Batch selection state ───────────────────────
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [batchModalVisible, setBatchModalVisible] = useState(false);
    const [batchConfirmed, setBatchConfirmed] = useState(false);
    const [batchProcessing, setBatchProcessing] = useState(false);

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

    // ─── Single item confirm ─────────────────────────
    const openConfirmModal = (item: PendingReturnItem) => {
        setConfirmItem(item);
        setConfirmed(true);
    };

    const closeConfirmModal = () => {
        setConfirmItem(null);
        setConfirmed(false);
    };

    const handleAcceptReturn = async (sealNumber: string, id: number) => {
        setAcceptingId(id);
        closeConfirmModal();
        try {
            await sealService.acceptReturn(sealNumber);
            setItems(prev => prev.filter(i => i.id !== id));
            setSelectedIds(prev => { const next = new Set(prev); next.delete(id); return next; });
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert(error?.response?.data?.error || 'ไม่สามารถรับคืนซีลได้');
            }
        } finally {
            setAcceptingId(null);
        }
    };

    // ─── Batch selection handlers ────────────────────
    const toggleSelect = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredItems.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredItems.map(i => i.id)));
        }
    };

    // ─── Batch confirm ───────────────────────────────
    const openBatchModal = () => {
        setBatchModalVisible(true);
        setBatchConfirmed(true);
    };

    const closeBatchModal = () => {
        setBatchModalVisible(false);
        setBatchConfirmed(false);
    };

    const handleBatchAccept = async () => {
        const selectedItems = items.filter(i => selectedIds.has(i.id));
        if (selectedItems.length === 0) return;

        setBatchProcessing(true);
        const failedItems: string[] = [];

        for (const item of selectedItems) {
            try {
                await sealService.acceptReturn(item.seal_number);
            } catch {
                failedItems.push(item.seal_number);
            }
        }

        // Remove successfully accepted items
        const failedSet = new Set(failedItems);
        setItems(prev => prev.filter(i => !selectedIds.has(i.id) || failedSet.has(i.seal_number)));
        setSelectedIds(new Set());
        setBatchProcessing(false);
        closeBatchModal();

        if (failedItems.length > 0 && Platform.OS === 'web') {
            window.alert(`ไม่สามารถรับคืนซีลได้ ${failedItems.length} รายการ: ${failedItems.join(', ')}`);
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

    const selectedItems = items.filter(i => selectedIds.has(i.id));
    const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;

    // ─── Single Confirm Modal ────────────────────────
    const renderConfirmModal = () => {
        if (!confirmItem) return null;

        return (
            <Modal transparent animationType="fade" visible={!!confirmItem} onRequestClose={closeConfirmModal}>
                <Pressable style={styles.modalOverlay} onPress={closeConfirmModal}>
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>☑️ ยืนยันรับของจากช่าง</Text>
                            <TouchableOpacity onPress={closeConfirmModal} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalInfoBox}>
                            <View style={styles.modalInfoRow}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.modalInfoLabel}>หมายเลขซีล</Text>
                                    <Text style={styles.modalSealNumber}>{confirmItem.seal_number}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.modalInfoLabel}>ช่างผู้ส่งคืน</Text>
                                    <Text style={styles.modalTechName}>{confirmItem.technician_name || '-'}</Text>
                                </View>
                            </View>
                        </View>

                        <Text style={styles.modalSectionLabel}>ข้อมูลที่ช่างบันทึกมาจากแอปมือถือ:</Text>
                        <View style={styles.modalRemarkBox}>
                            <View style={styles.modalRemarkIconContainer}>
                                <Text style={styles.modalRemarkIcon}>📋</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.modalRemarkTitle}>สภาพซีลที่ช่างแจ้ง</Text>
                                <Text style={styles.modalRemarkValue}>{confirmItem.return_remarks || confirmItem.status}</Text>
                            </View>
                        </View>

                        {confirmItem.image2 && (
                            <View style={styles.modalImageContainer}>
                                <Text style={styles.modalRemarkTitle}>รูปภาพตอนคืน:</Text>
                                <TouchableOpacity onPress={() => setSelectedImageUri(getImageUrl(confirmItem.image2))}>
                                    <Image source={{ uri: getImageUrl(confirmItem.image2) }} style={styles.modalImagePreview} resizeMode="cover" />
                                </TouchableOpacity>
                            </View>
                        )}

                        <Text style={styles.modalVerifyLabel}>⊘ เจ้าหน้าที่ตรวจสอบของจริง:</Text>
                        <TouchableOpacity
                            style={[styles.modalCheckboxRow, confirmed && styles.modalCheckboxRowChecked]}
                            onPress={() => setConfirmed(!confirmed)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modalCheckbox, confirmed && styles.modalCheckboxChecked]}>
                                {confirmed && <Text style={styles.modalCheckmark}>✓</Text>}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.modalCheckboxTitle, confirmed && styles.modalCheckboxTitleChecked]}>
                                    ตรวจสอบแล้ว ข้อมูลตรงกัน
                                </Text>
                                <Text style={styles.modalCheckboxDesc}>
                                    ได้รับซากซีล / ของจริง เรียบร้อยแล้ว สภาพตรงตามที่ช่างแจ้ง
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={closeConfirmModal}>
                                <Text style={styles.modalCancelText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, !confirmed && styles.modalConfirmBtnDisabled]}
                                onPress={() => confirmed && handleAcceptReturn(confirmItem.seal_number, confirmItem.id)}
                                disabled={!confirmed}
                            >
                                <Text style={styles.modalConfirmText}>✓  ยืนยันการรับคืน</Text>
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>

                {!!selectedImageUri && (
                    <View style={[StyleSheet.absoluteFill, styles.fullScreenOverlay]}>
                        <TouchableOpacity style={styles.closeOverlayBtn} onPress={() => setSelectedImageUri(null)}>
                            <Text style={styles.closeOverlayText}>✕ ปิดหน้าต่าง</Text>
                        </TouchableOpacity>
                        <Image source={{ uri: selectedImageUri }} style={styles.fullScreenImage} resizeMode="contain" />
                    </View>
                )}
            </Modal>
        );
    };

    // ─── Batch Confirm Modal ─────────────────────────
    const renderBatchModal = () => {
        if (!batchModalVisible) return null;

        return (
            <Modal transparent animationType="fade" visible={batchModalVisible} onRequestClose={closeBatchModal}>
                <Pressable style={styles.modalOverlay} onPress={closeBatchModal}>
                    <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>☑️ ยืนยันรับคืนทั้งหมด {selectedItems.length} รายการ</Text>
                            <TouchableOpacity onPress={closeBatchModal} style={styles.modalCloseBtn}>
                                <Text style={styles.modalCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* List of selected seals */}
                        <ScrollView style={styles.batchListScroll}>
                            {selectedItems.map((item, idx) => {
                                const remarkStyle = REMARK_COLORS[item.return_remarks] || REMARK_COLORS[SealStatus.PENDING_RETURN];
                                return (
                                    <View key={item.id} style={[styles.batchItem, idx % 2 === 1 && { backgroundColor: '#faf5ff' }]}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.batchSealNumber}>{item.seal_number}</Text>
                                            <Text style={styles.batchTechName}>{item.technician_name}</Text>
                                        </View>
                                        <View style={[styles.remarkBadge, { backgroundColor: remarkStyle.bg }]}>
                                            <Text style={[styles.remarkText, { color: remarkStyle.text }]}>
                                                {remarkStyle.icon} {item.return_remarks || item.status}
                                            </Text>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>

                        <Text style={styles.modalVerifyLabel}>⊘ เจ้าหน้าที่ตรวจสอบของจริง:</Text>
                        <TouchableOpacity
                            style={[styles.modalCheckboxRow, batchConfirmed && styles.modalCheckboxRowChecked]}
                            onPress={() => setBatchConfirmed(!batchConfirmed)}
                            activeOpacity={0.7}
                        >
                            <View style={[styles.modalCheckbox, batchConfirmed && styles.modalCheckboxChecked]}>
                                {batchConfirmed && <Text style={styles.modalCheckmark}>✓</Text>}
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={[styles.modalCheckboxTitle, batchConfirmed && styles.modalCheckboxTitleChecked]}>
                                    ตรวจสอบแล้วทั้ง {selectedItems.length} รายการ
                                </Text>
                                <Text style={styles.modalCheckboxDesc}>
                                    ได้รับซากซีล / ของจริง เรียบร้อยแล้ว สภาพตรงตามที่ช่างแจ้งทุกรายการ
                                </Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.modalActions}>
                            <TouchableOpacity style={styles.modalCancelBtn} onPress={closeBatchModal}>
                                <Text style={styles.modalCancelText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalConfirmBtn, (!batchConfirmed || batchProcessing) && styles.modalConfirmBtnDisabled]}
                                onPress={handleBatchAccept}
                                disabled={!batchConfirmed || batchProcessing}
                            >
                                {batchProcessing ? (
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                        <ActivityIndicator size="small" color="white" />
                                        <Text style={styles.modalConfirmText}>กำลังดำเนินการ...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.modalConfirmText}>✓  ยืนยันรับคืนทั้ง {selectedItems.length} รายการ</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </Pressable>
                </Pressable>
            </Modal>
        );
    };

    return (
        <View style={styles.mainContainer}>
            <Header />
            {renderConfirmModal()}
            {renderBatchModal()}
            
            
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
                            <View>
                                {/* Header */}
                                <View style={styles.headerRow}>
                                    {/* Checkbox column */}
                                    <View style={[styles.cell, styles.cellCheck]}>
                                        <TouchableOpacity onPress={toggleSelectAll} style={[styles.rowCheckbox, allSelected && styles.rowCheckboxChecked]}>
                                            {allSelected && <Text style={styles.rowCheckmark}>✓</Text>}
                                        </TouchableOpacity>
                                    </View>
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
                                    const remarkStyle = REMARK_COLORS[item.return_remarks] || REMARK_COLORS[SealStatus.PENDING_RETURN];
                                    const isAccepting = acceptingId === item.id;
                                    const isSelected = selectedIds.has(item.id);
                                    return (
                                        <View key={item.id} style={[styles.dataRow, idx % 2 === 1 && styles.dataRowAlt, isSelected && styles.dataRowSelected]}>
                                            {/* Checkbox */}
                                            <View style={[styles.cell, styles.cellCheck]}>
                                                <TouchableOpacity onPress={() => toggleSelect(item.id)} style={[styles.rowCheckbox, isSelected && styles.rowCheckboxChecked]}>
                                                    {isSelected && <Text style={styles.rowCheckmark}>✓</Text>}
                                                </TouchableOpacity>
                                            </View>
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
                                                    onPress={() => openConfirmModal(item)}
                                                    disabled={isAccepting}
                                                >
                                                    {isAccepting ? (
                                                        <ActivityIndicator size="small" color="white" />
                                                    ) : (
                                                        <Text style={styles.acceptBtnText}>ตรวจสอบ</Text>
                                                    )}
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        </>
                    )}
                </View>
            </ScrollView>

            {/* ── Floating Batch Action Bar ────── */}
            {selectedIds.size > 0 && (
                <View style={styles.batchBar}>
                    <Text style={styles.batchBarText}>
                        เลือกแล้ว {selectedIds.size} รายการ
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity style={styles.batchClearBtn} onPress={() => setSelectedIds(new Set())}>
                            <Text style={styles.batchClearText}>ยกเลิกทั้งหมด</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.batchConfirmBtn} onPress={openBatchModal}>
                            <Text style={styles.batchConfirmText}>✓ ยืนยันรับคืน {selectedIds.size} รายการ</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
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
    dataRowSelected: { backgroundColor: '#f3e5f5' },
    cell: { paddingVertical: 14, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' },
    cellCheck: { width: 50, justifyContent: 'center', paddingHorizontal: 8 },
    cellTime: { flex: 1.5 },
    cellTech: { flex: 2 },
    cellSeal: { flex: 1.5 },
    cellRemark: { flex: 2 },
    cellAction: { flex: 1.5 },

    // Row Checkbox
    rowCheckbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#ccc', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
    rowCheckboxChecked: { backgroundColor: colors.primaryPurple, borderColor: colors.primaryPurple },
    rowCheckmark: { color: 'white', fontSize: 14, fontWeight: 'bold' },

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

    // ─── Floating Batch Bar ──────────────────────────
    batchBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#7b1fa2', paddingHorizontal: 24, paddingVertical: 14, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 8 },
    batchBarText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
    batchClearBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    batchClearText: { color: 'white', fontSize: 13, fontWeight: '500' },
    batchConfirmBtn: { backgroundColor: '#4caf50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
    batchConfirmText: { color: 'white', fontSize: 14, fontWeight: 'bold' },

    // ─── Batch Modal List ────────────────────────────
    batchListScroll: { maxHeight: 200, marginHorizontal: 20, marginTop: 16, marginBottom: 16, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
    batchItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f8f9fa', borderBottomWidth: 1, borderBottomColor: '#eee' },
    batchSealNumber: { fontSize: 14, fontWeight: 'bold', color: '#7b1fa2' },
    batchTechName: { fontSize: 12, color: '#999', marginTop: 2 },

    // ─── Confirmation Modal ──────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { backgroundColor: 'white', borderRadius: 16, width: '90%', maxWidth: 520, padding: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 24, elevation: 10 },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#7b1fa2', borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: 'white' },
    modalCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    modalCloseText: { fontSize: 16, color: 'white', fontWeight: 'bold' },

    modalInfoBox: { margin: 20, marginBottom: 12, padding: 16, backgroundColor: '#faf5ff', borderRadius: 12, borderWidth: 1, borderColor: '#e9d5f5' },
    modalInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    modalInfoLabel: { fontSize: 12, color: '#9e9e9e', marginBottom: 4 },
    modalSealNumber: { fontSize: 20, fontWeight: 'bold', color: '#7b1fa2' },
    modalTechName: { fontSize: 15, fontWeight: '600', color: '#333' },

    modalSectionLabel: { fontSize: 13, color: '#666', marginHorizontal: 20, marginBottom: 8, fontWeight: '500' },
    modalRemarkBox: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 16, padding: 14, backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
    modalRemarkIconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#e8eaf6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    modalRemarkIcon: { fontSize: 20 },
    modalRemarkTitle: { fontSize: 12, color: '#999', marginBottom: 2 },
    modalRemarkValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },

    modalVerifyLabel: { fontSize: 13, color: '#7b1fa2', marginHorizontal: 20, marginBottom: 8, fontWeight: 'bold' },
    modalCheckboxRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 20, padding: 14, backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1.5, borderColor: '#dee2e6' },
    modalCheckboxRowChecked: { backgroundColor: '#e8f5e9', borderColor: '#4caf50' },
    modalCheckbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: '#bbb', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white' },
    modalCheckboxChecked: { backgroundColor: '#4caf50', borderColor: '#4caf50' },
    modalCheckmark: { color: 'white', fontSize: 16, fontWeight: 'bold' },
    modalCheckboxTitle: { fontSize: 14, fontWeight: 'bold', color: '#555' },
    modalCheckboxTitleChecked: { color: '#2e7d32' },
    modalCheckboxDesc: { fontSize: 12, color: '#999', marginTop: 2 },

    modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f0f0f0', gap: 12 },
    modalCancelBtn: { paddingHorizontal: 20, paddingVertical: 10 },
    modalCancelText: { fontSize: 14, color: '#666', fontWeight: '500' },
    modalConfirmBtn: { backgroundColor: '#4caf50', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
    modalConfirmBtnDisabled: { backgroundColor: '#c8e6c9', opacity: 0.7 },
    modalConfirmText: { color: 'white', fontSize: 14, fontWeight: 'bold' },

    modalImageContainer: { marginHorizontal: 20, marginBottom: 16 },
    modalImagePreview: { width: '100%', height: 180, borderRadius: 10, marginTop: 8, borderWidth: 1, borderColor: '#eee' },

    // ── Fullscreen Image ───────────────────────────────────────
    fullScreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center', zIndex: 9999, elevation: 9999 },
    fullScreenImage: { width: '100%', height: '80%', zIndex: 10000 },
    closeOverlayBtn: { position: 'absolute', top: 40, right: 20, padding: 12, zIndex: 10001, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24, elevation: 10001 },
    closeOverlayText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },
});
