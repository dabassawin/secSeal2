import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { userService, UserResponse } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

type EntryMode = 'scan' | 'range';

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

    // Receiver user selection
    const [users, setUsers] = useState<UserResponse[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserResponse | null>(null);
    const [searchUserQuery, setSearchUserQuery] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);

    // Seal entry
    const [entryMode, setEntryMode] = useState<EntryMode>('scan');
    const [singleSealInput, setSingleSealInput] = useState('');
    const [rangeStartInput, setRangeStartInput] = useState('');
    const [rangeCountInput, setRangeCountInput] = useState('');

    const [stagedSeals, setStagedSeals] = useState<StagedSeal[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    useEffect(() => {
        fetchUsers();
    }, [user?.pea_code, user?.username]);

    const fetchUsers = async () => {
        try {
            const all = await userService.getAllUsers();
            const pea = user?.pea_code;
            const filtered = all.filter(u => {
                if (!pea) return false;
                if (u.pea_code !== pea) return false;
                if (u.username === user?.username) return false;
                // accounting user = staff user, not meter
                if (u.role === 'meter') return false;
                return true;
            });
            setUsers(filtered);
        } catch (e) {
            console.error('Failed to fetch users', e);
        }
    };

    const filteredUsers = useMemo(() => {
        const q = searchUserQuery.trim().toLowerCase();
        if (!q) return users;
        return users.filter(u =>
            (u.first_name + ' ' + u.last_name).toLowerCase().includes(q) ||
            u.username.toLowerCase().includes(q)
        );
    }, [users, searchUserQuery]);

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

        if (!selectedUser) {
            setModalStatus('error');
            setModalMessage('กรุณาเลือกผู้รับ (แผนกบัญชี)');
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
            await sealService.transferToUser(selectedUser.username, sealList);
            setModalStatus('success');
            setModalMessage(`โอนซีลจำนวน ${sealList.length} รายการ เรียบร้อยแล้ว`);
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
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>1. ระบุผู้รับ (แผนกบัญชี)</Text>
                        <View style={styles.formGroup}>
                            <TouchableOpacity
                                style={styles.selector}
                                onPress={() => {
                                    setSearchUserQuery('');
                                    setShowUserDropdown(true);
                                }}
                            >
                                {selectedUser ? (
                                    <View>
                                        <Text style={styles.selectorMain}>{selectedUser.first_name} {selectedUser.last_name}</Text>
                                        <Text style={styles.selectorSub}>{selectedUser.username}</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.selectorPlaceholder}>เลือกผู้รับ...</Text>
                                )}
                                <Text style={styles.dropdownIcon}>▼</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.sectionCard, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>2. เลือกรายการซีลที่จะโอน</Text>

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

            <Modal visible={showUserDropdown} transparent animationType="slide" onRequestClose={() => setShowUserDropdown(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เลือกผู้รับ</Text>
                            <TouchableOpacity onPress={() => setShowUserDropdown(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.searchInput}
                            placeholder="ค้นหา (ชื่อ หรือ username)..."
                            value={searchUserQuery}
                            onChangeText={setSearchUserQuery}
                        />
                        <ScrollView style={{ flex: 1 }}>
                            {filteredUsers.map(u => (
                                <TouchableOpacity
                                    key={u.id}
                                    style={styles.userItem}
                                    onPress={() => {
                                        setSelectedUser(u);
                                        setShowUserDropdown(false);
                                    }}
                                >
                                    <Text style={styles.userMain}>{u.first_name} {u.last_name}</Text>
                                    <Text style={styles.userSub}>{u.username}</Text>
                                </TouchableOpacity>
                            ))}
                            {filteredUsers.length === 0 && (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyText}>ไม่พบผู้ใช้</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

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

    formGroup: { marginBottom: 15 },
    selector: {
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
    selectorMain: { fontSize: 15, fontWeight: 'bold', color: colors.primaryPurple },
    selectorSub: { fontSize: 12, color: '#666', marginTop: 2 },
    selectorPlaceholder: { fontSize: 14, color: '#aaa' },
    dropdownIcon: { color: '#999', fontSize: 14 },

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

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: '90%', height: '80%', backgroundColor: 'white', borderRadius: 12, padding: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: colors.primaryPurple },
    closeBtn: { fontSize: 22, color: '#999' },
    searchInput: { height: 48, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, backgroundColor: '#fafafa', marginBottom: 10 },
    userItem: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    userMain: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    userSub: { fontSize: 12, color: '#666', marginTop: 2 },

    modalOverlay2: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent2: { width: '85%', backgroundColor: 'white', borderRadius: 12, padding: 20, alignItems: 'center' },
    modalTitle2: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
    modalMessage2: { color: '#444', textAlign: 'center', marginBottom: 15 },
    modalBtn: { borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
    modalBtnText: { color: 'white', fontWeight: 'bold' },
});
