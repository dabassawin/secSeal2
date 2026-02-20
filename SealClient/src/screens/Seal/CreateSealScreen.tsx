import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { userService } from '@/services/userService';

type EntryMode = 'scan' | 'range';

interface StagedBatch {
    id: string;
    sealNumber: string;
    type: 'Single' | 'Batch';
    count: number;
    status: 'checking' | 'available' | 'unavailable';
}

export const CreateSealScreen: React.FC = () => {
    const navigation = useNavigation();

    // Data & Loading
    const [loading, setLoading] = useState(false);

    // PEA Selection
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [selectedPea, setSelectedPea] = useState<any | null>(null);
    const [searchPeaQuery, setSearchPeaQuery] = useState('');
    const [showPeaDropdown, setShowPeaDropdown] = useState(false);

    // Seal Entry
    const [entryMode, setEntryMode] = useState<EntryMode>('scan');
    const [singleSealInput, setSingleSealInput] = useState('');
    const [rangeStartInput, setRangeStartInput] = useState('');
    const [rangeCountInput, setRangeCountInput] = useState('');

    // Staging
    const [stagedBatches, setStagedBatches] = useState<StagedBatch[]>([]);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        fetchMasPea();
    }, []);

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const filterPeaList = () => {
        if (!searchPeaQuery) return [];
        return masPeaList.filter(p => {
            const code = p.pea_code || p.PeaCode || p.code || '';
            const name = p.name_th || p.NameTh || '';
            const level = p.level || p.Level || '';
            if (level !== '1') return false; // Filter only Level 1

            return code.toLowerCase().includes(searchPeaQuery.toLowerCase()) ||
                name.toLowerCase().includes(searchPeaQuery.toLowerCase());
        });
    };

    const handleSelectPea = (item: any) => {
        setSelectedPea(item);
        const code = item.pea_code || item.PeaCode || item.code || '';
        const name = item.name_th || item.NameTh || '';
        setSearchPeaQuery(`${code} - ${name}`);
        setShowPeaDropdown(false);
    };

    const handleClearPea = () => {
        setSelectedPea(null);
        setSearchPeaQuery('');
    };

    const checkSealExistence = async (sealNum: string) => {
        try {
            const result = await sealService.checkSealExists(sealNum);
            // Returns message: "Seal number is available" or 409 Conflict
            return { status: 'available' };
        } catch (error: any) {
            if (error.response?.status === 409) {
                return { status: 'unavailable', reason: 'มีเลขซีลนี้ในระบบแล้ว' };
            }
            return { status: 'unavailable', reason: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
        }
    };

    const handleAddSingleSeal = async () => {
        if (!singleSealInput.trim()) return;

        const sealNum = singleSealInput.trim();

        // Check local duplicate
        if (stagedBatches.some(s => s.sealNumber === sealNum)) {
            setSingleSealInput('');
            return;
        }

        const checkResult = await checkSealExistence(sealNum);

        if (checkResult.status === 'unavailable') {
            setModalStatus('error');
            setModalMessage(`ไม่สามารถสร้างซีล ${sealNum} ได้\nเหตุผล: ${checkResult.reason || 'มีการสร้างไปแล้ว'}`);
            setModalVisible(true);
            setSingleSealInput('');
            return;
        }

        const newEntry: StagedBatch = {
            id: Date.now().toString(),
            sealNumber: sealNum,
            type: 'Single',
            count: 1,
            status: 'available'
        };

        setStagedBatches(prev => [newEntry, ...prev]);
        setSingleSealInput('');
    };

    const handleAddBatchSeals = async () => {
        if (!rangeStartInput.trim() || !rangeCountInput.trim()) return;

        const count = parseInt(rangeCountInput.trim(), 10);
        if (isNaN(count) || count <= 0) {
            setModalStatus('error');
            setModalMessage('กรุณาระบุจำนวนที่ถูกต้อง (มากกว่า 0)');
            setModalVisible(true);
            return;
        }

        const startSeal = rangeStartInput.trim();

        const checkResult = await checkSealExistence(startSeal);

        if (checkResult.status === 'unavailable') {
            setModalStatus('error');
            setModalMessage(`ไม่สามารถสร้างซีล ${startSeal} ได้\nเหตุผล: ${checkResult.reason || 'มีการสร้างไปแล้ว'}`);
            setModalVisible(true);
            return;
        }

        const newEntry: StagedBatch = {
            id: Date.now().toString(),
            sealNumber: startSeal,
            type: 'Batch',
            count: count,
            status: 'available'
        };

        setStagedBatches(prev => [newEntry, ...prev]);
        setRangeStartInput('');
        setRangeCountInput('');
    };

    const handleRemoveBatch = (id: string) => {
        setStagedBatches(prev => prev.filter(s => s.id !== id));
    };

    const handleConfirmCreation = async () => {
        if (!selectedPea) {
            setModalStatus('error');
            setModalMessage('กรุณาระบุสังกัดการไฟฟ้า (PEA Code)');
            setModalVisible(true);
            return;
        }

        const validBatches = stagedBatches.filter(s => s.status === 'available');
        if (validBatches.length === 0) {
            setModalStatus('error');
            setModalMessage('ไม่มีรายการซีลที่พร้อมสร้างในรายการ');
            setModalVisible(true);
            return;
        }

        const code = selectedPea.pea_code || selectedPea.PeaCode || selectedPea.code || '';

        setLoading(true);
        try {
            const batchesPayload = validBatches.map(b => ({
                seal_number: b.sealNumber,
                count: b.count,
                pea_code: code
            }));

            await sealService.generateBatches(batchesPayload);

            setModalStatus('success');
            setModalMessage(`สร้างซีลจำนวน ${validBatches.reduce((acc, curr) => acc + curr.count, 0)} ดวง เรียบร้อยแล้ว`);
            setModalVisible(true);
            setStagedBatches([]); // Clear list

        } catch (error: any) {
            console.error('Creation error:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างซีล');
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

                {/* LEFT PANEL: Inputs */}
                <View style={styles.leftPanel}>
                    {/* 1. PEA Selection */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>1. ระบุสังกัดการไฟฟ้า (PEA Code)</Text>

                        <View style={styles.formGroup}>
                            <TouchableOpacity style={styles.peaSelector} onPress={() => setShowPeaDropdown(true)}>
                                {selectedPea ? (
                                    <View>
                                        <Text style={styles.peaCode}>{selectedPea.pea_code || selectedPea.PeaCode || selectedPea.code}</Text>
                                        <Text style={styles.peaName}>{selectedPea.name_th || selectedPea.NameTh}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.peaPlaceholder}>เลือกการไฟฟ้า...</Text>
                                )}
                                <Text style={styles.dropdownIcon}>▼</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 2. Add Seals */}
                    <View style={[styles.sectionCard, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>2. ระบุรายละเอียดการสร้าง (Create Seals)</Text>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, entryMode === 'scan' && styles.activeTab]}
                                onPress={() => setEntryMode('scan')}
                            >
                                <Text style={[styles.tabText, entryMode === 'scan' && styles.activeTabText]}>llll Scan / Single</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, entryMode === 'range' && styles.activeTab]}
                                onPress={() => setEntryMode('range')}
                            >
                                <Text style={[styles.tabText, entryMode === 'range' && styles.activeTabText]}>📚 Batch / Range</Text>
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
                        ) : (
                            <View style={styles.inputArea}>
                                <View style={styles.rangeRow}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.label}>เริ่มต้น (Start)</Text>
                                        <TextInput
                                            style={styles.rangeInput}
                                            placeholder="Ex. SL-001"
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
                                <TouchableOpacity style={styles.addRangeBtn} onPress={handleAddBatchSeals}>
                                    <Text style={styles.addRangeBtnText}>เพิ่มรายการ (Add Range)</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.spacer} />
                        <Text style={styles.infoText}>ℹ ระบบจะเช็คไม่ให้เลขซีลซ้ำกับในฐานข้อมูล</Text>
                    </View>
                </View>

                {/* RIGHT PANEL: Staging List */}
                <View style={styles.rightPanel}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>รายการที่จะสร้าง (Staging List)</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>Total: {stagedBatches.length} รายการ (Groups)</Text>
                        </View>
                    </View>

                    <View style={styles.tableHead}>
                        <Text style={[styles.th, { flex: 0.5 }]}>#</Text>
                        <Text style={[styles.th, { flex: 3 }]}>START SERIAL</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>TYPE</Text>
                        <Text style={[styles.th, { flex: 2 }]}>STATUS CHECK</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ACTION</Text>
                    </View>

                    <ScrollView style={styles.listContainer}>
                        {stagedBatches.map((item, index) => (
                            <View key={item.id} style={[
                                styles.tableRow,
                                item.status === 'unavailable' && styles.rowError
                            ]}>
                                <Text style={[styles.td, { flex: 0.5 }]}>{index + 1}</Text>
                                <View style={{ flex: 3 }}>
                                    {item.type === 'Batch' && <View style={styles.rangeTag}><Text style={styles.rangeTagText}>BATCH ({item.count})</Text></View>}
                                    <Text style={styles.serialText}>{item.sealNumber}</Text>
                                </View>
                                <Text style={[styles.td, { flex: 1.5, color: '#666' }]}>{item.type}</Text>
                                <View style={{ flex: 2 }}>
                                    {item.status === 'checking' && <Text style={styles.statusChecking}>⏳ Checking...</Text>}
                                    {item.status === 'available' && <Text style={styles.statusOk}>✅ Ready</Text>}
                                    {item.status === 'unavailable' && <Text style={styles.statusError}>⛔ Exists</Text>}
                                </View>
                                <TouchableOpacity
                                    style={{ flex: 1, alignItems: 'center' }}
                                    onPress={() => handleRemoveBatch(item.id)}
                                >
                                    <Text style={styles.deleteIcon}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        {stagedBatches.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>ยังไม่มีรายการ</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>รวมทั้งหมด:</Text>
                            <Text style={styles.totalValue}>{stagedBatches.reduce((sum, item) => sum + item.count, 0)} <Text style={{ fontSize: 16, fontWeight: 'normal' }}>ชิ้น/Seals</Text></Text>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStagedBatches([])}>
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                                onPress={handleConfirmCreation}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>💾 ยืนยันการสร้างซีล (Create)</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* PEA Selection Modal */}
            <Modal visible={showPeaDropdown} transparent animationType="slide" onRequestClose={() => setShowPeaDropdown(false)}>
                <View style={styles.peaModalOverlay}>
                    <View style={styles.peaModalContent}>
                        <View style={styles.peaModalHeader}>
                            <Text style={styles.peaModalTitle}>เลือกสังกัดการไฟฟ้า</Text>
                            <TouchableOpacity onPress={() => setShowPeaDropdown(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.peaSearchInput}
                            placeholder="ค้นหาด้วยรหัสหรือชื่อ..."
                            value={searchPeaQuery}
                            onChangeText={setSearchPeaQuery}
                        />
                        <FlatList
                            data={filterPeaList()}
                            keyExtractor={(_, i) => i.toString()}
                            renderItem={({ item }) => {
                                const code = item.pea_code || item.PeaCode || item.code || '';
                                const name = item.name_th || item.NameTh || '';
                                return (
                                    <TouchableOpacity style={styles.peaItem} onPress={() => handleSelectPea(item)}>
                                        <Text style={styles.peaItemCode}>{code}</Text>
                                        <Text style={styles.peaItemName}>{name}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                            ItemSeparatorComponent={() => <View style={styles.separator} />}
                        />
                    </View>
                </View>
            </Modal>

            {/* Status Modal */}
            <Modal transparent={true} visible={modalVisible} animationType="fade" onRequestClose={handleModalClose}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalIconCircle, { backgroundColor: modalStatus === 'success' ? '#e8f5e9' : '#ffebee' }]}>
                            <Text style={[styles.modalIcon, { color: modalStatus === 'success' ? '#4caf50' : '#f44336' }]}>
                                {modalStatus === 'success' ? '✅' : '❌'}
                            </Text>
                        </View>
                        <Text style={styles.modalTitle}>{modalStatus === 'success' ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}</Text>
                        <Text style={styles.modalMessage}>{modalMessage}</Text>
                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: modalStatus === 'success' ? colors.primaryPurple : '#f44336' }]} onPress={handleModalClose}><Text style={styles.modalBtnText}>ตกลง</Text></TouchableOpacity>
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
    rightPanel: { flex: 2, backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 2, flexDirection: 'column' },

    sectionCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primaryPurple, marginBottom: 15 },

    // PEA Selection Modal
    formGroup: { marginBottom: 15 },
    peaSelector: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fafafa',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 50,
    },
    peaCode: { fontSize: 15, fontWeight: 'bold', color: colors.primaryPurple },
    peaName: { fontSize: 13, color: '#555', marginTop: 2 },
    peaPlaceholder: { fontSize: 14, color: '#aaa' },
    dropdownIcon: { color: '#999', fontSize: 14 },

    peaModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    peaModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
        maxHeight: '80%',
    },
    peaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    peaModalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryPurple },
    closeBtn: { fontSize: 18, color: '#999', padding: 5 },
    peaSearchInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        padding: 10,
        marginBottom: 10,
        fontSize: 15,
        backgroundColor: '#fafafa',
    },
    peaItem: { paddingVertical: 12, paddingHorizontal: 5 },
    peaItemCode: { fontSize: 15, fontWeight: 'bold', color: colors.primaryPurple },
    peaItemName: { fontSize: 13, color: '#555', marginTop: 2 },
    separator: { height: 1, backgroundColor: '#f0f0f0' },

    // Tabs
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 20 },
    tab: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 15 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: colors.primaryPurple },
    tabText: { fontSize: 14, color: '#666' },
    activeTabText: { color: colors.primaryPurple, fontWeight: 'bold' },

    // Inputs
    inputArea: { minHeight: 100 },
    scanInput: { borderWidth: 2, borderColor: colors.primaryPurple, borderRadius: 8, padding: 15, fontSize: 16, textAlign: 'center', backgroundColor: '#fdfbff', borderStyle: 'dashed' },
    helperText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 },

    rangeRow: { flexDirection: 'row' },
    label: { fontSize: 12, color: '#666', marginBottom: 5 },
    rangeInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14 },
    addRangeBtn: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 15 },
    addRangeBtnText: { color: '#333', fontWeight: 'bold' },
    spacer: { flex: 1 },
    infoText: { fontSize: 12, color: '#999', marginTop: 10 },

    // Right Panel
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    countBadge: { backgroundColor: '#f3e5f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    countText: { color: colors.primaryPurple, fontWeight: 'bold', fontSize: 13 },

    tableHead: { flexDirection: 'row', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 10 },
    th: { fontSize: 12, fontWeight: 'bold', color: '#999' },

    listContainer: { flex: 1 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    rowError: { backgroundColor: '#fff0f0' },
    rowWarning: { backgroundColor: '#fff8e1' },
    td: { fontSize: 14, color: '#333' },
    serialText: { fontWeight: 'bold', fontSize: 14, color: colors.primaryPurple },
    rangeTag: { backgroundColor: '#eabc29', paddingHorizontal: 5, borderRadius: 4, marginRight: 8, alignSelf: 'flex-start' },
    rangeTagText: { fontSize: 10, color: 'white', fontWeight: 'bold' },

    statusChecking: { color: '#f57c00', fontSize: 13 },
    statusOk: { color: '#4caf50', fontWeight: 'bold', fontSize: 13 },
    statusError: { color: '#f44336', fontWeight: 'bold', fontSize: 13 },
    deleteIcon: { fontSize: 16, color: '#ccc' },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#ccc', fontSize: 16 },

    footer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', marginBottom: 15 },
    totalLabel: { fontSize: 16, color: '#666', marginRight: 10 },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },

    actionButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 10 },
    cancelBtnText: { color: '#666' },
    confirmBtn: { backgroundColor: colors.primaryPurple, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
    confirmBtnText: { color: 'white', fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: 350, backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10 },
    modalIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalIcon: { fontSize: 40 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    modalMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    modalBtn: { width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
