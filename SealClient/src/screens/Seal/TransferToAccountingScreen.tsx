import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { useAuth } from '@/context/AuthContext';
import { Seal } from '@/types';

type EntryMode = 'scan' | 'range' | 'existing';

interface StagedSeal {
    id: string;
    sealNumber: string;
    type: 'Single';
    status: 'available' | 'unavailable' | 'duplicate';
}

export const TransferToAccountingScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);

    // Seal entry
    const [entryMode, setEntryMode] = useState<EntryMode>('scan');
    const [singleSealInput, setSingleSealInput] = useState('');
    const [rangeStartInput, setRangeStartInput] = useState('');
    const [rangeCountInput, setRangeCountInput] = useState('');
    const [existingSearchQuery, setExistingSearchQuery] = useState('');
    const [existingSeals, setExistingSeals] = useState<Seal[]>([]);
    const [loadingExisting, setLoadingExisting] = useState(false);

    const [stagedSeals, setStagedSeals] = useState<StagedSeal[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        if (entryMode !== 'existing') return;
        fetchExistingSeals();
    }, [entryMode, user?.pea_code]);

    const fetchExistingSeals = async () => {
        try {
            setLoadingExisting(true);
            const rows = await sealService.getSeals(user?.pea_code);
            const readyInMeter = rows.filter(
                (s) => s.status === 'พร้อมใช้งาน' && s.inventory_department === 'meter'
            );
            setExistingSeals(readyInMeter);
        } catch (error) {
            setModalStatus('error');
            setModalMessage('ไม่สามารถดึงรายการซีลในคลังได้');
            setModalVisible(true);
        } finally {
            setLoadingExisting(false);
        }
    };

    const filteredExistingSeals = useMemo(() => {
        const q = existingSearchQuery.trim().toLowerCase();
        return existingSeals
            .filter((s) => {
                if (!s.seal_number) return false;
                if (stagedSeals.some((st) => st.sealNumber === s.seal_number)) return false;
                if (!q) return true;
                return s.seal_number.toLowerCase().includes(q);
            })
            .slice(0, 100);
    }, [existingSeals, existingSearchQuery, stagedSeals]);

    const generateSealRange = (start: string, count: number): string[] => {
        const seals: string[] = [];
        const match = start.match(/^([A-Za-z]+)(\d+)$/);

        if (!match) {
            if (count === 1) return [start];
            return [];
        }

        const prefix = match[1];
        const numberPart = match[2];
        const startNum = parseInt(numberPart, 10);
        const length = numberPart.length;

        for (let i = 0; i < count; i++) {
            const currentNum = startNum + i;
            const paddedNum = currentNum.toString().padStart(length, '0');
            seals.push(`${prefix}${paddedNum}`);
        }
        return seals;
    };

    const checkSealAvailabilityForTransfer = async (sealNum: string): Promise<{ ok: boolean; reason?: string }> => {
        try {
            // Must exist and belong to this PEA and be READY to transfer
            const results = await sealService.checkSeals([sealNum], user?.pea_code);
            if (!results[0]) return { ok: false, reason: 'ไม่พบข้อมูล' };

            const r = results[0];
            if (!r.is_available) {
                return { ok: false, reason: r.reason || 'ไม่พร้อมใช้งาน' };
            }
            return { ok: true };
        } catch (e) {
            return { ok: false, reason: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
        }
    };

    const handleAddSeal = async (sealNumRaw: string) => {
        const sealNum = sealNumRaw.trim();
        if (!sealNum) return;

        if (stagedSeals.some(s => s.sealNumber === sealNum)) {
            return;
        }

        const check = await checkSealAvailabilityForTransfer(sealNum);
        if (!check.ok) {
            setModalStatus('error');
            setModalMessage(`ไม่สามารถเพิ่มซีล ${sealNum} ได้\nเหตุผล: ${check.reason || '-'}`);
            setModalVisible(true);
            return;
        }

        const entry: StagedSeal = {
            id: Date.now().toString(),
            sealNumber: sealNum,
            type: 'Single',
            status: 'available'
        };
        setStagedSeals(prev => [entry, ...prev]);
    };

    const handleAddSingleSeal = async () => {
        await handleAddSeal(singleSealInput);
        setSingleSealInput('');
    };

    const handleAddRangeSeals = async () => {
        if (!rangeStartInput.trim() || !rangeCountInput.trim()) return;

        const count = parseInt(rangeCountInput.trim(), 10);
        if (isNaN(count) || count <= 0) {
            setModalStatus('error');
            setModalMessage('กรุณาระบุจำนวนที่ถูกต้อง (มากกว่า 0)');
            setModalVisible(true);
            return;
        }

        const startSeal = rangeStartInput.trim();
        const generated = generateSealRange(startSeal, count);
        if (generated.length === 0) {
            setModalStatus('error');
            setModalMessage('รูปแบบซีลเริ่มต้นไม่ถูกต้อง (ต้องเป็น ตัวอักษร+ตัวเลข)');
            setModalVisible(true);
            return;
        }

        setLoading(true);
        try {
            for (const sn of generated) {
                if (stagedSeals.some(s => s.sealNumber === sn)) continue;
                const check = await checkSealAvailabilityForTransfer(sn);
                if (check.ok) {
                    setStagedSeals(prev => [{ id: Date.now().toString() + sn, sealNumber: sn, type: 'Single', status: 'available' }, ...prev]);
                }
            }

            setRangeStartInput('');
            setRangeCountInput('');
        } finally {
            setLoading(false);
        }
    };

    const handleRemove = (id: string) => {
        setStagedSeals(prev => prev.filter(s => s.id !== id));
    };

    const handleConfirmTransfer = async () => {
        if (user?.role !== 'meter') {
            setModalStatus('error');
            setModalMessage('เฉพาะแผนกมิเตอร์เท่านั้นที่สามารถโอนให้บัญชีได้');
            setModalVisible(true);
            return;
        }

        const sealList = stagedSeals.filter(s => s.status === 'available').map(s => s.sealNumber);
        if (sealList.length === 0) {
            setModalStatus('error');
            setModalMessage('ไม่มีรายการซีลที่พร้อมโอนในรายการ');
            setModalVisible(true);
            return;
        }

        setLoading(true);
        try {
            await sealService.transferToUser('', sealList);
            setModalStatus('success');
            setModalMessage(`โอนซีลจำนวน ${sealList.length} รายการ เข้าคลังแผนกบัญชีเรียบร้อยแล้ว`);
            setModalVisible(true);
            setStagedSeals([]);
        } catch (e: any) {
            setModalStatus('error');
            setModalMessage(e?.response?.data?.error || 'เกิดข้อผิดพลาดในการโอนซีล');
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setModalVisible(false);
        if (modalStatus === 'success') {
            navigation.goBack();
        }
    };

    return (
        <View style={styles.mainContainer}>
            <Header />
            <View style={styles.contentContainer}>
                <View style={styles.leftPanel}>
                    <View style={[styles.sectionCard, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>1. เลือกรายการซีลที่จะโอนเข้าคลังบัญชี</Text>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, entryMode === 'scan' && styles.activeTab]}
                                onPress={() => setEntryMode('scan')}
                            >
                                <Text style={[styles.tabText, entryMode === 'scan' && styles.activeTabText]}>Scan / Single</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, entryMode === 'range' && styles.activeTab]}
                                onPress={() => setEntryMode('range')}
                            >
                                <Text style={[styles.tabText, entryMode === 'range' && styles.activeTabText]}>Batch / Range</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, entryMode === 'existing' && styles.activeTab]}
                                onPress={() => setEntryMode('existing')}
                            >
                                <Text style={[styles.tabText, entryMode === 'existing' && styles.activeTabText]}>Find Existing</Text>
                            </TouchableOpacity>
                        </View>

                        {entryMode === 'scan' ? (
                            <View style={styles.inputArea}>
                                <TextInput
                                    style={styles.scanInput}
                                    placeholder="ยิงบาร์โค้ด หรือพิมพ์ Serial..."
                                    value={singleSealInput}
                                    onChangeText={(text) => setSingleSealInput(text.replace(/^PEA\s+/i, ''))}
                                    onSubmitEditing={handleAddSingleSeal}
                                    blurOnSubmit={false}
                                />
                                <Text style={styles.helperText}>กด Enter เพื่อเพิ่มรายการลงตะกร้าทันที</Text>
                            </View>
                        ) : entryMode === 'range' ? (
                            <View style={styles.inputArea}>
                                <View style={styles.rangeRow}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.label}>เริ่มต้น (Start)</Text>
                                        <TextInput
                                            style={styles.rangeInput}
                                            placeholder="Ex. SL001"
                                            value={rangeStartInput}
                                            onChangeText={(text) => setRangeStartInput(text.replace(/^PEA\s+/i, ''))}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>จำนวน (Count)</Text>
                                        <TextInput
                                            style={styles.rangeInput}
                                            placeholder="Ex. 10"
                                            value={rangeCountInput}
                                            onChangeText={setRangeCountInput}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.addRangeBtn} onPress={handleAddRangeSeals}>
                                    <Text style={styles.addRangeBtnText}>เพิ่มรายการ (Add Range)</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.inputArea}>
                                <TextInput
                                    style={styles.rangeInput}
                                    placeholder="ค้นหา Serial ที่มีอยู่ในคลัง..."
                                    value={existingSearchQuery}
                                    onChangeText={(text) => setExistingSearchQuery(text.replace(/^PEA\s+/i, ''))}
                                />
                                {loadingExisting ? (
                                    <View style={styles.existingLoading}>
                                        <ActivityIndicator color={colors.primaryPurple} />
                                    </View>
                                ) : (
                                    <ScrollView style={styles.existingList}>
                                        {filteredExistingSeals.map((item) => (
                                            <TouchableOpacity
                                                key={item.id}
                                                style={styles.existingItem}
                                                onPress={() => handleAddSeal(item.seal_number)}
                                            >
                                                <Text style={styles.existingMain}>{item.seal_number}</Text>
                                                <Text style={styles.existingSub}>แตะเพื่อเพิ่มรายการโอน</Text>
                                            </TouchableOpacity>
                                        ))}
                                        {filteredExistingSeals.length === 0 && (
                                            <View style={styles.emptyState}>
                                                <Text style={styles.emptyText}>ไม่พบซีลที่พร้อมโอน</Text>
                                            </View>
                                        )}
                                    </ScrollView>
                                )}
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.rightPanel}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>รายการที่จะโอน</Text>
                        <Text style={styles.countText}>Total: {stagedSeals.length}</Text>
                    </View>

                    <View style={styles.tableHead}>
                        <Text style={[styles.th, { flex: 0.5 }]}>#</Text>
                        <Text style={[styles.th, { flex: 3 }]}>SERIAL NUMBER</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ACTION</Text>
                    </View>

                    <ScrollView style={styles.listContainer}>
                        {stagedSeals.map((item, index) => (
                            <View key={item.id} style={styles.tableRow}>
                                <Text style={[styles.td, { flex: 0.5 }]}>{index + 1}</Text>
                                <Text style={[styles.td, { flex: 3 }]}>{item.sealNumber}</Text>
                                <TouchableOpacity style={{ flex: 1, alignItems: 'center' }} onPress={() => handleRemove(item.id)}>
                                    <Text style={styles.deleteIcon}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        {stagedSeals.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>ยังไม่มีรายการ</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                            onPress={handleConfirmTransfer}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>💾 ยืนยันการโอน</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <Modal transparent={true} visible={modalVisible} animationType="fade" onRequestClose={handleModalClose}>
                <View style={styles.modalOverlay2}>
                    <View style={styles.modalContent2}>
                        <Text style={styles.modalTitle2}>{modalStatus === 'success' ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}</Text>
                        <Text style={styles.modalMessage2}>{modalMessage}</Text>
                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: modalStatus === 'success' ? colors.primaryPurple : '#f44336' }]} onPress={handleModalClose}>
                            <Text style={styles.modalBtnText}>ตกลง</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#f4f6f8' },
    contentContainer: { flex: 1, flexDirection: 'row', padding: 20 },
    leftPanel: { flex: 1, marginRight: 20 },
    rightPanel: { flex: 2, backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 2, flexDirection: 'column', overflow: 'hidden' },

    sectionCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primaryPurple, marginBottom: 15 },

    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 20 },
    tab: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 15 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: colors.primaryPurple },
    tabText: { fontSize: 14, color: '#666' },
    activeTabText: { color: colors.primaryPurple, fontWeight: 'bold' },

    inputArea: { minHeight: 100 },
    scanInput: { borderWidth: 2, borderColor: colors.primaryPurple, borderRadius: 8, padding: 15, fontSize: 16, textAlign: 'center', backgroundColor: '#fdfbff', borderStyle: 'dashed' },
    helperText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 },

    rangeRow: { flexDirection: 'row' },
    label: { fontSize: 12, color: '#666', marginBottom: 5 },
    rangeInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14 },
    addRangeBtn: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 15 },
    addRangeBtnText: { color: '#333', fontWeight: 'bold' },
    existingLoading: { padding: 16, alignItems: 'center' },
    existingList: { marginTop: 12, maxHeight: 250, borderWidth: 1, borderColor: '#eee', borderRadius: 8 },
    existingItem: { paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f2f2f2' },
    existingMain: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    existingSub: { fontSize: 12, color: '#888', marginTop: 2 },

    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryPurple },
    countText: { color: '#666' },

    tableHead: { flexDirection: 'row', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
    th: { fontWeight: 'bold', color: '#666', fontSize: 12 },
    listContainer: { flex: 1 },
    tableRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', alignItems: 'center' },
    td: { color: '#333' },

    deleteIcon: { fontSize: 16 },

    emptyState: { padding: 30, alignItems: 'center' },
    emptyText: { color: '#999' },

    footer: { paddingTop: 15, borderTopWidth: 1, borderTopColor: '#eee' },
    confirmBtn: { backgroundColor: colors.primaryPurple, borderRadius: 8, padding: 14, alignItems: 'center' },
    confirmBtnText: { color: 'white', fontWeight: 'bold' },

    modalOverlay2: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent2: { width: '85%', backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'center' },
    modalTitle2: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    modalMessage2: { color: '#444', textAlign: 'center', marginBottom: 15 },
    modalBtn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
    modalBtnText: { color: 'white', fontWeight: 'bold' },
});
