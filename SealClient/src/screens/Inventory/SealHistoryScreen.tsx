import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Modal, Alert, Platform } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import api from '@/services/api';
import { Seal, Log } from '@/types';
import { SealStatus } from '../../constants/status';

// ── Status Color / Icon Mapping ──────────────────────────────────
const STATUS_MAP: Record<string, { color: string; icon: string; label: string }> = {
    [SealStatus.READY]: { color: '#2196F3', icon: '🔵', label: 'พร้อมใช้งาน (Available)' },
    [SealStatus.ISSUED]: { color: '#FF9800', icon: '🟡', label: 'จ่ายซีลให้ช่าง (Issued)' },
    [SealStatus.INSTALLED]: { color: '#4CAF50', icon: '✅', label: 'ติดตั้งแล้ว (Installed)' },
    [SealStatus.USED]: { color: '#9C27B0', icon: '🟣', label: 'ใช้งานแล้ว (Used)' },
    [SealStatus.DAMAGED]: { color: '#F44336', icon: '🔴', label: 'เสียหาย (Damaged)' },
    [SealStatus.LOST]: { color: '#F44336', icon: '🔴', label: 'สูญหาย (Lost)' },
    [SealStatus.PENDING_RETURN]: { color: '#FF9800', icon: '🔶', label: 'รอตรวจสอบคืน (Pending Return)' },
};
const getStatusInfo = (status?: string) =>
    STATUS_MAP[status || ''] || { color: '#9E9E9E', icon: '⚪', label: status || 'ไม่ทราบสถานะ' };

// ── Timeline Activity Item ───────────────────────────────────────
const ActivityItem: React.FC<{ log: Log; isLast?: boolean }> = ({ log, isLast }) => {
    const getActionDetails = (action: string) => {
        if (action.includes('created') || action.includes('นำเข้า') || action.includes('สร้างข้อมูล'))
            return { icon: '➕', color: '#66bb6a', label: 'สร้างข้อมูล (Created)' };
        if (action.includes('ตรวจสอบ') || action.includes('พร้อมใช้งาน'))
            return { icon: '🔵', color: '#2196F3', label: 'พร้อมใช้งาน (Available)' };
        if (action.includes('assigned') || action.includes(SealStatus.ISSUED))
            return { icon: '🟡', color: '#FF9800', label: 'จ่ายซีลให้ช่าง (Issued)' };
        if (action.includes('used') || action.includes('ติดตั้ง') || action.includes(SealStatus.INSTALLED))
            return { icon: '✅', color: '#4CAF50', label: 'ติดตั้งซีลแล้ว (Installed)' };
        if (action.includes('return') || action.includes('คืน'))
            return { icon: '🔶', color: '#FF9800', label: 'คืนซีล (Returned)' };
        return { icon: '📝', color: '#9E9E9E', label: 'การดำเนินงานอื่นๆ' };
    };
    const details = getActionDetails(log.action);
    const date = new Date(log.timestamp || log.created_at || Date.now());

    // Try to extract user/name from the action text
    const byMatch = log.action.match(/โดย[:\s]*(.+?)(?:\s*$)/);
    const byText = byMatch ? byMatch[1] : undefined;

    return (
        <View style={styles.activityContainer}>
            <View style={styles.timelineColumn}>
                <View style={[styles.timelineDot, { backgroundColor: details.color }]}>
                    <Text style={styles.timelineDotIcon}>{details.icon}</Text>
                </View>
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: details.color + '40' }]} />}
            </View>
            <View style={styles.activityCard}>
                <View style={styles.activityHeader}>
                    <Text style={[styles.activityTitle, { color: details.color }]}>{details.label}</Text>
                </View>
                {byText && <Text style={styles.activityUser}>โดย: {byText}</Text>}
                <View style={styles.activityMeta}>
                    <Text style={styles.activityTime}>
                        {date.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })} · {date.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                    </Text>
                </View>
            </View>
        </View>
    );
};

// ── Main Screen ──────────────────────────────────────────────────
export const SealHistoryScreen: React.FC = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const params = route.params as { sealNumber?: string } | undefined;
    const sealNumber = params?.sealNumber;

    const [seal, setSeal] = useState<Seal | null>(null);
    const [logs, setLogs] = useState<Log[]>([]);
    const [loading, setLoading] = useState(true);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);

    // Edit Status State
    const [editStatusModalVisible, setEditStatusModalVisible] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<string>('');
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    const STATUS_OPTIONS = [
        SealStatus.READY, SealStatus.ISSUED, SealStatus.INSTALLED,
        SealStatus.USED, SealStatus.DAMAGED, SealStatus.LOST, SealStatus.PENDING_RETURN
    ];

    useEffect(() => {
        if (sealNumber) fetchData();
        else setLoading(false);
    }, [sealNumber]);

    useEffect(() => {
        if (Platform.OS === 'web') {
            const handlePopState = () => window.location.reload();
            window.addEventListener('popstate', handlePopState);
            return () => window.removeEventListener('popstate', handlePopState);
        }
    }, []);

    const fetchData = async () => {
        if (!sealNumber) return;
        try {
            setLoading(true);
            const [sealData, logData] = await Promise.all([
                sealService.getSealByNumber(sealNumber),
                sealService.getSealLogs(sealNumber)
            ]);
            setSeal(sealData);
            setLogs(logData);
        } catch (error) {
            console.error('Error fetching seal history:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelSeal = async () => {
        if (!sealNumber) return;
        try {
            await sealService.cancelSeal(sealNumber);
            setConfirmModalVisible(false);
            Alert.alert("สำเร็จ", "ยกเลิกซีลแล้ว สถานะกลับเป็น พร้อมใช้งาน");
            fetchData();
        } catch (error) {
            console.error("Cancel failed", error);
            Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถยกเลิกซีลได้");
        }
    };

    const handleUpdateStatus = async () => {
        if (!sealNumber || !selectedStatus) return;
        if (selectedStatus === seal?.status) { setEditStatusModalVisible(false); return; }
        try {
            setIsUpdatingStatus(true);
            await sealService.updateSealStatus(sealNumber, selectedStatus);
            setEditStatusModalVisible(false);
            Alert.alert("สำเร็จ", `เปลี่ยนสถานะเป็น '${selectedStatus}' เรียบร้อยแล้ว`);
            fetchData();
        } catch (error: any) {
            console.error("Update status failed", error);
            Alert.alert("เกิดข้อผิดพลาด", error.response?.data?.error || "ไม่สามารถเปลี่ยนสถานะซีลได้");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const openEditStatusModal = () => {
        setSelectedStatus(seal?.status || SealStatus.READY);
        setEditStatusModalVisible(true);
    };

    const getImageUrl = (imagePath: string | undefined) => {
        if (!imagePath) return '';
        let cleanPath = imagePath.replace(/\\/g, '/');
        if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
        const baseURL = api.defaults.baseURL || 'http://localhost:3000';
        return `${baseURL}/${cleanPath}`;
    };

    const statusInfo = getStatusInfo(seal?.status);
    const updatedDate = seal?.updated_at ? new Date(seal.updated_at) : null;

    // ── Guard: No seal number ────────────────────────────────────
    if (!sealNumber) {
        return (
            <View style={styles.centerContainer}>
                <Text style={styles.emptyText}>ไม่พบข้อมูลหมายเลขซีล (No Seal Number provided)</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.purpleBtn, { marginTop: 20, width: 200 }]}>
                    <Text style={styles.purpleBtnText}>กลับ (Go Back)</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Guard: Loading ───────────────────────────────────────────
    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={colors.primaryPurple} />
            </View>
        );
    }

    // ── Helper: render a single image slot ───────────────────────
    const renderImageSlot = (imagePath: string | undefined, label: string, sublabel: string) => {
        const img = imagePath || (seal as any)?.[label.replace(/\s/g, '')];
        if (img) {
            const uri = getImageUrl(img);
            return (
                <TouchableOpacity
                    style={styles.imageSlot}
                    activeOpacity={0.85}
                    onPress={() => setSelectedImageUri(uri)}
                >
                    <Image source={{ uri }} style={styles.imageSlotImg} resizeMode="cover" />
                    <Text style={styles.imageSlotLabel}>{sublabel}</Text>
                </TouchableOpacity>
            );
        }
        return (
            <View style={styles.imageSlotEmpty}>
                <View style={styles.imageSlotEmptyInner}>
                    <Text style={styles.imageSlotEmptyIcon}>🖼️</Text>
                    <Text style={styles.imageSlotEmptyText}>ไม่มีรูปภาพ ({sublabel})</Text>
                </View>
            </View>
        );
    };

    // ══════════════════════════════════════════════════════════════
    // ██  RENDER
    // ══════════════════════════════════════════════════════════════
    return (
        <View style={styles.mainContainer}>
            <Header />

            <ScrollView style={styles.scrollView}>
                <View style={styles.content}>

                    {/* ═══════ HEADER BANNER ═══════ */}
                    <View style={styles.banner}>
                        <View style={styles.bannerLeft}>
                            <View style={styles.iconBox}>
                                <Text style={styles.iconBoxText}>|||</Text>
                            </View>
                            <View style={styles.bannerInfo}>
                                <Text style={styles.bannerLabel}>SERIAL NUMBER</Text>
                                <Text style={styles.bannerValue}>{sealNumber}</Text>
                            </View>
                        </View>
                        <View style={styles.bannerRight}>
                            <TouchableOpacity
                                style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}
                                onPress={openEditStatusModal}
                            >
                                <Text style={styles.statusBadgeText}>
                                    {statusInfo.icon} สถานะ: {seal?.status || SealStatus.READY} ({statusInfo.label.match(/\((.+)\)/)?.[1] || ''})
                                </Text>
                            </TouchableOpacity>
                            {updatedDate && (
                                <Text style={styles.bannerTimestamp}>
                                    อัปเดตล่าสุด: {updatedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} {updatedDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* ═══════ BODY — 2 COLUMNS ═══════ */}
                    <View style={styles.body}>

                        {/* ──── LEFT COLUMN ──── */}
                        <View style={styles.leftCol}>

                            {/* --- Operation Info --- */}
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>📋 ข้อมูลปฏิบัติงาน (Operation Info)</Text>
                                <View style={styles.opRow}>
                                    {/* Technician */}
                                    <View style={styles.opSubCard}>
                                        <View style={styles.opSubCardHeader}>
                                            <View style={[styles.opIconCircle, { backgroundColor: '#E8EAF6' }]}>
                                                <Text style={styles.opIconText}>👤</Text>
                                            </View>
                                            <Text style={styles.opSubLabel}>ช่างผู้รับผิดชอบ (Technician)</Text>
                                        </View>
                                        <Text style={styles.opSubValue}>
                                            {seal?.employee_code
                                                ? `${seal.employee_code}`
                                                : 'ยังไม่ได้มอบหมาย'}
                                        </Text>
                                        {seal?.employee_code && (
                                            <Text style={styles.opSubMeta}>ID: {seal.employee_code}</Text>
                                        )}
                                    </View>
                                    {/* Meter No */}
                                    <View style={styles.opSubCard}>
                                        <View style={styles.opSubCardHeader}>
                                            <View style={[styles.opIconCircle, { backgroundColor: '#E0F7FA' }]}>
                                                <Text style={styles.opIconText}>🔢</Text>
                                            </View>
                                            <Text style={styles.opSubLabel}>หมายเลขมิเตอร์ (Meter No.)</Text>
                                        </View>
                                        <Text style={[styles.opSubValue, { fontFamily: Platform.OS === 'web' ? 'monospace' : undefined }]}>
                                            {seal?.installed_serial || 'ยังไม่ได้ติดตั้ง'}
                                        </Text>
                                        {seal?.installed_serial && (
                                            <Text style={styles.opSubMeta}>📍 พิกัด: -</Text>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* --- Evidence Images (3-column grid) --- */}
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>📸 รูปภาพหลักฐาน (Evidence Images)</Text>
                                <View style={styles.imageGrid}>
                                    {renderImageSlot(seal?.image1 || (seal as any)?.Image1, 'Image1', 'Image 1')}
                                    {renderImageSlot(seal?.image2 || (seal as any)?.Image2, 'Image2', 'Image 2')}
                                    {renderImageSlot(seal?.image3 || (seal as any)?.Image3, 'Image3', 'Image 3')}
                                </View>
                            </View>

                            {/* --- Remarks --- */}
                            <View style={styles.remarksRow}>
                                <View style={[styles.remarkCard, { backgroundColor: '#FFFDE7', borderColor: '#FFF176' }]}>
                                    <Text style={styles.remarkTitle}>📝 หมายเหตุตอนสร้าง/บันทึก (Create Remarks)</Text>
                                    <Text style={styles.remarkText}>
                                        {seal?.create_remarks || (seal as any)?.CreateRemarks || 'ไม่มีหมายเหตุ'}
                                    </Text>
                                </View>
                                <View style={[styles.remarkCard, { backgroundColor: '#F5F5F5', borderColor: '#E0E0E0' }]}>
                                    <Text style={styles.remarkTitle}>📎 หมายเหตุตอนติดตั้ง (Issue/Install Remarks)</Text>
                                    <Text style={styles.remarkText}>
                                        {seal?.issue_remark || (seal as any)?.IssueRemark || 'ไม่มีหมายเหตุ'}
                                    </Text>
                                </View>
                            </View>

                            {/* --- Cancel action (if applicable) --- */}
                            {[SealStatus.USED, SealStatus.INSTALLED].includes(seal?.status as any) && (
                                <View style={styles.cancelCard}>
                                    <Text style={styles.cancelCardTitle}>⚠️ ยกเลิกรายการ (Cancel)</Text>
                                    <Text style={styles.cancelCardDesc}>
                                        หากบันทึกการติดตั้งผิดพลาด สามารถกดยกเลิกเพื่อคืนสถานะเป็น "พร้อมใช้งาน" ได้
                                    </Text>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={() => setConfirmModalVisible(true)}>
                                        <Text style={styles.cancelBtnText}>🚫 ยกเลิกซีลนี้</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>

                        {/* ──── RIGHT COLUMN ──── */}
                        <View style={styles.rightCol}>
                            <View style={styles.sectionCard}>
                                <Text style={styles.sectionTitle}>🕒 ประวัติการดำเนินการ (History Log)</Text>
                                {logs.length === 0 ? (
                                    <Text style={styles.emptyText}>ยังไม่มีประวัติการดำเนินการสำหรับซีลนี้</Text>
                                ) : (
                                    <>
                                        {logs.map((log, index) => (
                                            <ActivityItem key={log.id} log={log} isLast={index === logs.length - 1} />
                                        ))}
                                        <View style={styles.startOfRecordRow}>
                                            <View style={[styles.timelineDot, { backgroundColor: '#BDBDBD' }]}>
                                                <Text style={styles.timelineDotIcon}>⚪</Text>
                                            </View>
                                            <Text style={styles.startOfRecordText}>START OF RECORD</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

                {/* ═══════ MODALS ═══════ */}

                {/* Cancel Confirmation Modal */}
                <Modal visible={confirmModalVisible} transparent animationType="fade" onRequestClose={() => setConfirmModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalIconContainer}>
                                <Text style={styles.modalIcon}>⚠️</Text>
                            </View>
                            <Text style={styles.modalTitle}>ยืนยันการยกเลิก</Text>
                            <Text style={styles.modalMessage}>
                                คุณต้องการยกเลิกซีลเบอร์ <Text style={{ fontWeight: 'bold' }}>{sealNumber}</Text> ใช่หรือไม่?{'\n'}
                                สถานะจะถูกเปลี่ยนกลับเป็น "พร้อมใช้งาน"
                            </Text>
                            <View style={styles.modalActions}>
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setConfirmModalVisible(false)}>
                                    <Text style={styles.modalCancelText}>ปิด</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalConfirmBtn} onPress={handleCancelSeal}>
                                    <Text style={styles.modalConfirmText}>ยืนยันยกเลิก</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Edit Status Modal */}
                <Modal visible={editStatusModalVisible} transparent animationType="fade" onRequestClose={() => setEditStatusModalVisible(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={[styles.modalIconContainer, { backgroundColor: '#e8eaf6' }]}>
                                <Text style={styles.modalIcon}>✏️</Text>
                            </View>
                            <Text style={styles.modalTitle}>แก้ไขสถานะซีล</Text>
                            <Text style={[styles.modalMessage, { marginBottom: 15 }]}>
                                ซีลเบอร์: <Text style={{ fontWeight: 'bold' }}>{sealNumber}</Text>
                            </Text>
                            <View style={styles.statusOptionsContainer}>
                                {STATUS_OPTIONS.map((status) => {
                                    const info = getStatusInfo(status);
                                    return (
                                        <TouchableOpacity
                                            key={status}
                                            style={[styles.statusOptionBtn, selectedStatus === status && styles.statusOptionSelected]}
                                            onPress={() => setSelectedStatus(status)}
                                        >
                                            <Text style={[styles.statusOptionText, selectedStatus === status && styles.statusOptionTextSelected]}>
                                                {info.icon} {status}
                                            </Text>
                                            {selectedStatus === status && <Text style={styles.statusCheckIcon}>✓</Text>}
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            <View style={[styles.modalActions, { marginTop: 20 }]}>
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setEditStatusModalVisible(false)} disabled={isUpdatingStatus}>
                                    <Text style={styles.modalCancelText}>ยกเลิก</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.modalConfirmBtn, { backgroundColor: colors.primaryPurple }, isUpdatingStatus && { opacity: 0.7 }]}
                                    onPress={handleUpdateStatus}
                                    disabled={isUpdatingStatus}
                                >
                                    {isUpdatingStatus
                                        ? <ActivityIndicator color="white" size="small" />
                                        : <Text style={styles.modalConfirmText}>บันทึกสถานะ</Text>}
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

                {/* Fullscreen Image Modal */}
                <Modal visible={!!selectedImageUri} transparent animationType="fade" onRequestClose={() => setSelectedImageUri(null)}>
                    <View style={styles.fullScreenOverlay}>
                        <TouchableOpacity style={styles.closeOverlayBtn} onPress={() => setSelectedImageUri(null)}>
                            <Text style={styles.closeOverlayText}>✕ ปิดหน้าต่าง</Text>
                        </TouchableOpacity>
                        {selectedImageUri && (
                            <Image source={{ uri: selectedImageUri }} style={styles.fullScreenImage} resizeMode="contain" />
                        )}
                    </View>
                </Modal>

            </ScrollView>
        </View>
    );
};

// ══════════════════════════════════════════════════════════════════
// ██  STYLES
// ══════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#F0F2F5' },
    scrollView: { flex: 1 },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 20, fontSize: 14 },

    // ── Content wrapper
    content: {
        margin: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
    },

    // ── Banner ─────────────────────────────────────────────────
    banner: {
        backgroundColor: colors.primaryPurple,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 24,
    },
    bannerLeft: { flexDirection: 'row', alignItems: 'center' },
    iconBox: {
        width: 56, height: 56,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 18,
    },
    iconBoxText: { fontSize: 22, color: '#FFFFFF', fontWeight: 'bold', letterSpacing: 2 },
    bannerInfo: {},
    bannerLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
    bannerValue: { color: '#FFFFFF', fontSize: 30, fontWeight: 'bold', letterSpacing: 1 },
    bannerRight: { alignItems: 'flex-end' },
    statusBadge: {
        paddingHorizontal: 18, paddingVertical: 10,
        borderRadius: 24,
    },
    statusBadgeText: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 13 },
    bannerTimestamp: { color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 6 },

    // ── Body 2-col ─────────────────────────────────────────────
    body: { flexDirection: 'row', padding: 24, gap: 24 },
    leftCol: { flex: 2 },
    rightCol: { flex: 1 },

    // ── Section Card ───────────────────────────────────────────
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 14,
        padding: 20,
        borderWidth: 1, borderColor: '#EEE',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 16 },

    // ── Operation Info ─────────────────────────────────────────
    opRow: { flexDirection: 'row', gap: 16 },
    opSubCard: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    opSubCardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    opIconCircle: {
        width: 36, height: 36, borderRadius: 18,
        justifyContent: 'center', alignItems: 'center', marginRight: 10,
    },
    opIconText: { fontSize: 18 },
    opSubLabel: { fontSize: 11, color: '#888', fontWeight: '600' },
    opSubValue: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    opSubMeta: { fontSize: 11, color: '#AAA' },

    // ── Image Grid ─────────────────────────────────────────────
    imageGrid: { flexDirection: 'row', gap: 12 },
    imageSlot: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
    },
    imageSlotImg: {
        width: '100%',
        height: 180,
        borderRadius: 12,
    },
    imageSlotLabel: { fontSize: 11, color: '#888', textAlign: 'center', paddingVertical: 6 },
    imageSlotEmpty: {
        flex: 1,
        height: 180,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#DDD',
        borderStyle: 'dashed',
        justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
    imageSlotEmptyInner: { alignItems: 'center' },
    imageSlotEmptyIcon: { fontSize: 36, opacity: 0.25 },
    imageSlotEmptyText: { fontSize: 11, color: '#BBB', marginTop: 6 },

    // ── Remarks ────────────────────────────────────────────────
    remarksRow: { flexDirection: 'row', gap: 16, marginBottom: 20 },
    remarkCard: {
        flex: 1,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
    },
    remarkTitle: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
    remarkText: { fontSize: 13, color: '#666', lineHeight: 20 },

    // ── Cancel Card ────────────────────────────────────────────
    cancelCard: {
        backgroundColor: '#FFEBEE',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#FFCDD2',
        marginBottom: 20,
    },
    cancelCardTitle: { fontSize: 14, fontWeight: 'bold', color: '#C62828', marginBottom: 6 },
    cancelCardDesc: { fontSize: 12, color: '#D32F2F', lineHeight: 18, marginBottom: 12 },
    cancelBtn: { backgroundColor: '#C62828', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    cancelBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

    // ── Timeline ───────────────────────────────────────────────
    activityContainer: { flexDirection: 'row', marginBottom: 4 },
    timelineColumn: { alignItems: 'center', marginRight: 12, width: 32 },
    timelineDot: {
        width: 28, height: 28, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', zIndex: 1,
    },
    timelineDotIcon: { fontSize: 13 },
    timelineLine: { width: 2, flex: 1, marginVertical: 2 },
    activityCard: {
        flex: 1,
        backgroundColor: '#FAFAFA',
        borderRadius: 10,
        padding: 12,
        marginBottom: 8,
        borderWidth: 1, borderColor: '#F0F0F0',
    },
    activityHeader: { marginBottom: 4 },
    activityTitle: { fontSize: 13, fontWeight: 'bold' },
    activityUser: { fontSize: 12, color: '#666', marginBottom: 2 },
    activityMeta: { flexDirection: 'row', alignItems: 'center' },
    activityTime: { fontSize: 11, color: '#AAA' },

    startOfRecordRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    startOfRecordText: { fontSize: 11, color: '#CCC', fontWeight: '600', letterSpacing: 1, marginLeft: 12 },

    // ── Modals ─────────────────────────────────────────────────
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: 340, backgroundColor: '#FFF', borderRadius: 16, padding: 25, alignItems: 'center', elevation: 10 },
    modalIconContainer: { width: 60, height: 60, backgroundColor: '#ffebee', borderRadius: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    modalIcon: { fontSize: 30 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    modalMessage: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 22 },
    modalActions: { flexDirection: 'row', width: '100%', justifyContent: 'space-between' },
    modalCancelBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 10, alignItems: 'center' },
    modalCancelText: { color: '#666', fontWeight: 'bold' },
    modalConfirmBtn: { flex: 1, padding: 12, borderRadius: 8, backgroundColor: '#d32f2f', alignItems: 'center', justifyContent: 'center' },
    modalConfirmText: { color: '#FFF', fontWeight: 'bold' },
    statusOptionsContainer: { width: '100%' },
    statusOptionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#eee', marginBottom: 8 },
    statusOptionSelected: { borderColor: colors.primaryPurple, backgroundColor: '#f3e5f5' },
    statusOptionText: { fontSize: 15, color: '#333' },
    statusOptionTextSelected: { color: colors.primaryPurple, fontWeight: 'bold' },
    statusCheckIcon: { color: colors.primaryPurple, fontWeight: 'bold', fontSize: 16 },

    // ── Fullscreen Image ───────────────────────────────────────
    fullScreenOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', justifyContent: 'center', alignItems: 'center' },
    fullScreenImage: { width: '100%', height: '80%' },
    closeOverlayBtn: { position: 'absolute', top: 40, right: 20, padding: 12, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 24 },
    closeOverlayText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' },

    // ── Misc ───────────────────────────────────────────────────
    purpleBtn: { height: 42, backgroundColor: colors.primaryPurple, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    purpleBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
});
