import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { technicianService } from '@/services/technicianService';
import { sealService } from '@/services/sealService';
import { userService } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';
import { Technician } from '@/types';

type EntryMode = 'scan' | 'range';

interface StagedSeal {
    id: string; // unique key for list
    sealNumber: string;
    type: 'Single' | 'Range';
    status: 'checking' | 'available' | 'unavailable' | 'duplicate';
    rangeCount?: number; // Changed from rangeEnd to rangeCount
    startSeal?: string;  // Added to help with expansion
}

export const AssignSealScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, refreshUser } = useAuth(); // ดึงประวัติ user และฟังก์ชันอัปเดต

    // Data & Loading
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Technician Selection
    const [searchTechQuery, setSearchTechQuery] = useState('');
    const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
    const [showTechDropdown, setShowTechDropdown] = useState(false);

    // Seal Entry
    const [entryMode, setEntryMode] = useState<EntryMode>('scan');
    const [singleSealInput, setSingleSealInput] = useState('');
    const [rangeStartInput, setRangeStartInput] = useState('');
    const [rangeCountInput, setRangeCountInput] = useState(''); // Changed from rangeEndInput

    // Staging
    const [stagedSeals, setStagedSeals] = useState<StagedSeal[]>([]);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    useFocusEffect(
        React.useCallback(() => {
            refreshUser();
        }, [])
    );

    useEffect(() => {
        if (user?.pea_code) {
            fetchTechnicians();
            fetchMasPea();
        }
    }, [user?.pea_code]);

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const getPeaName = (code?: string) => {
        if (!code) return '-';
        const pea = masPeaList.find(p => p.pea_code === code || p.PeaCode === code || p.code === code);
        const nameTh = pea ? (pea.name_th || pea.NameTh) : null;
        return nameTh ? `${nameTh} (${code})` : code;
    };

    const fetchTechnicians = async () => {
        try {
            // ดึงเฉพาะ 4 หลักแรกของ PEA Code
            const peaPrefix = user?.pea_code ? user.pea_code.substring(0, 4) : undefined;

            // ส่ง parameter peaCode และ isPrefix = true
            const data = await technicianService.getTechnicians(peaPrefix, true);
            setTechnicians(data);
        } catch (error) {
            console.error('Failed to fetch technicians', error);
        } finally {
            setInitialLoading(false);
        }
    };

    const filterTechnicians = () => {
        if (!searchTechQuery) return technicians;
        return technicians.filter(t =>
            (t.first_name + ' ' + t.last_name).toLowerCase().includes(searchTechQuery.toLowerCase()) ||
            t.technician_code.toLowerCase().includes(searchTechQuery.toLowerCase())
        );
    };

    const handleSelectTechnician = (tech: Technician) => {
        setSelectedTech(tech);
        setSearchTechQuery(`${tech.first_name} ${tech.last_name}`);
        setShowTechDropdown(false);
    };

    const handleClearTechnician = () => {
        setSelectedTech(null);
        setSearchTechQuery('');
    };

    const checkSealAvailability = async (sealNum: string): Promise<{ status: 'available' | 'unavailable'; reason?: string }> => {
        try {
            const results = await sealService.checkSeals([sealNum]);
            if (results.length > 0) {
                const result = results[0];
                return {
                    status: result.is_available ? 'available' : 'unavailable',
                    reason: result.reason
                };
            }
            return { status: 'unavailable', reason: 'ไม่พบข้อมูล' };
        } catch (error) {
            return { status: 'unavailable', reason: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
        }
    };

    // Helper to generate seal range
    const generateSealRange = (start: string, count: number): string[] => {
        const seals: string[] = [];
        const match = start.match(/^([A-Za-z]+)(\d+)$/);

        if (!match) {
            // Fallback for non-standard formats (just returns start)
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

    const handleAddSingleSeal = async () => {
        if (!singleSealInput.trim()) return;

        const sealNum = singleSealInput.trim();

        // Check local duplicate
        if (stagedSeals.some(s => s.sealNumber === sealNum)) {
            setSingleSealInput(''); // Clear input
            return; // Or show error toast
        }

        // Perform check BEFORE adding to list
        const checkResult = await checkSealAvailability(sealNum);

        if (checkResult.status === 'unavailable') {
            setModalStatus('error');
            setModalMessage(`ไม่สามารถเพิ่มซีล ${sealNum} ได้\nเหตุผล: ${checkResult.reason || 'ไม่พร้อมใช้งาน'}`);
            setModalVisible(true);
            setSingleSealInput('');
            return;
        }

        // Add to list only if available
        const newEntry: StagedSeal = {
            id: Date.now().toString(),
            sealNumber: sealNum,
            type: 'Single',
            status: 'available' // We know it's available now
        };

        setStagedSeals(prev => [newEntry, ...prev]);
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
        const generatedSeals = generateSealRange(startSeal, count);

        if (generatedSeals.length === 0) {
            setModalStatus('error');
            setModalMessage('รูปแบบซีลเริ่มต้นไม่ถูกต้อง (ต้องเป็น ตัวอักษร+ตัวเลข)');
            setModalVisible(true);
            return;
        }

        // Check availability of ALL generated seals using CheckSeals (batch check)
        // Or check start and end as proxy? Let's verify all for safety since count is usually small-medium.
        // For better UX on large batches, we might just check start/end or rely on backend validation during assign.
        // Let's stick to check all for now to be safe.


        try {
            const results = await sealService.checkSeals(generatedSeals);
            const available = results.filter(r => r.is_available);
            const unavailable = results.filter(r => !r.is_available);

            // Add available ones first
            if (available.length > 0) {
                const newEntries: StagedSeal[] = available.map((result, index) => ({
                    id: Date.now().toString() + '-' + index,
                    sealNumber: result.seal_number, // Use the returned seal number to be safe
                    type: 'Single',
                    status: 'available'
                }));
                setStagedSeals(prev => [...newEntries, ...prev]);
            }

            // If there are unavailable ones, show error
            if (unavailable.length > 0) {
                // Show error with first few unavailable
                const reasons = unavailable.slice(0, 5).map(r => `${r.seal_number}: ${r.reason}`).join('\n');
                setModalStatus('error');

                let message = `พบซีลที่ไม่พร้อมใช้งาน ${unavailable.length} รายการ:\n${reasons}${unavailable.length > 5 ? '\n...' : ''}`;

                if (available.length > 0) {
                    message += `\n\n✅ เพิ่มซีลที่พร้อมใช้งาน ${available.length} รายการเรียบร้อยแล้ว`;
                }

                setModalMessage(message);
                setModalVisible(true);
            }

            // Clear inputs if at least some were added or if we just want to reset
            if (available.length > 0) {
                setRangeStartInput('');
                setRangeCountInput('');
            }

        } catch (error) {
            setModalStatus('error');
            setModalMessage('เกิดข้อผิดพลาดในการตรวจสอบสถานะซีล');
            setModalVisible(true);
            return;
        }
    };

    const handleRemoveSeal = (id: string) => {
        setStagedSeals(prev => prev.filter(s => s.id !== id));
    };

    const handleConfirmAssignment = async () => {
        if (!selectedTech) {
            setModalStatus('error');
            setModalMessage('กรุณาระบุตัวผู้รับ (Technician)');
            setModalVisible(true);
            return;
        }

        const validSeals = stagedSeals.filter(s => s.status === 'available');
        if (validSeals.length === 0) {
            setModalStatus('error');
            setModalMessage('ไม่มีรายการซีลที่พร้อมจ่ายในรายการ');
            setModalVisible(true);
            return;
        }

        setLoading(true);
        try {
            // Collect all seal numbers (they are all Single now)
            let sealList = validSeals.map(s => s.sealNumber);

            if (sealList.length === 0) {
                setModalStatus('error');
                setModalMessage('ไม่พบรายการซีลที่ถูกต้อง');
                setModalVisible(true);
                setLoading(false);
                return;
            }

            // Remove duplicates if any (though UI prevents easy duplicates)
            sealList = [...new Set(sealList)];

            await sealService.assignSealsByTechCode(
                selectedTech.technician_code,
                sealList
            );

            setModalStatus('success');
            setModalMessage(`มอบหมายซีลจำนวน ${sealList.length} รายการ เรียบร้อยแล้ว`);
            setModalVisible(true);
            setStagedSeals([]); // Clear list

        } catch (error: any) {
            console.error('Assignment error:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'เกิดข้อผิดพลาดในการมอบหมายงาน');
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setModalVisible(false);
        if (modalStatus === 'success') {
            // Optional: navigate back or stays
            // navigation.goBack(); 
        }
    };

    return (
        <View style={styles.mainContainer}>
            <Header />
            <View style={styles.contentContainer}>

                {/* LEFT PANEL: Inputs */}
                <View style={styles.leftPanel}>
                    {/* 1. Technician Selection */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>1. ระบุตัวผู้รับ (Technician)</Text>

                        {!selectedTech ? (
                            <View style={styles.formGroup}>
                                <TouchableOpacity style={styles.techSelector} onPress={() => {
                                    setSearchTechQuery('');
                                    setShowTechDropdown(true);
                                }}>
                                    <Text style={styles.techPlaceholder}>เลือกช่างรับซีล...</Text>
                                    <Text style={styles.dropdownIcon}>▼</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.selectedTechCard}>
                                <View style={styles.techAvatar}>
                                    <Text style={styles.techAvatarText}>{selectedTech.first_name.charAt(0)}</Text>
                                </View>
                                <View style={styles.techInfo}>
                                    <Text style={styles.techName}>{selectedTech.first_name} {selectedTech.last_name}</Text>
                                    <Text style={styles.techDetail}>รหัส: {selectedTech.technician_code} • สังกัด: {getPeaName(selectedTech.pea_code)}</Text>
                                    <View style={styles.techBadge}><Text style={styles.techBadgeText}>Active</Text></View>
                                </View>
                                <TouchableOpacity onPress={handleClearTechnician} style={styles.removeTechBtn}>
                                    <Text style={styles.removeTechText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* 2. Add Seals */}
                    <View style={[styles.sectionCard, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>2. เลือกรายการซีล (Add Seals)</Text>

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
                                <TouchableOpacity style={styles.addRangeBtn} onPress={handleAddRangeSeals}>
                                    <Text style={styles.addRangeBtnText}>เพิ่มรายการ (Add Range)</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.spacer} />
                        <Text style={styles.infoText}>ℹ ระบบจะเช็คสถานะ "พร้อมใช้งาน" อัตโนมัติ</Text>
                    </View>
                </View>

                {/* RIGHT PANEL: Staging List */}
                <View style={styles.rightPanel}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>รายการที่จะจ่าย (Staging List)</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>Total: {stagedSeals.length} รายการ (Groups)</Text>
                        </View>
                    </View>

                    <View style={styles.tableHead}>
                        <Text style={[styles.th, { flex: 0.5 }]}>#</Text>
                        <Text style={[styles.th, { flex: 3 }]}>SERIAL NUMBER</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>TYPE</Text>
                        <Text style={[styles.th, { flex: 2 }]}>STATUS CHECK</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ACTION</Text>
                    </View>

                    <ScrollView style={styles.listContainer}>
                        {stagedSeals.map((item, index) => (
                            <View key={item.id} style={[
                                styles.tableRow,
                                item.status === 'unavailable' && styles.rowError,
                                item.status === 'duplicate' && styles.rowWarning
                            ]}>
                                <Text style={[styles.td, { flex: 0.5 }]}>{index + 1}</Text>
                                <View style={{ flex: 3 }}>
                                    {item.type === 'Range' && <View style={styles.rangeTag}><Text style={styles.rangeTagText}>RANGE ({item.rangeCount})</Text></View>}
                                    <Text style={styles.serialText}>{item.sealNumber}</Text>
                                </View>
                                <Text style={[styles.td, { flex: 1.5, color: '#666' }]}>{item.type === 'Range' ? 'Batch' : 'Single'}</Text>
                                <View style={{ flex: 2 }}>
                                    {item.status === 'checking' && <Text style={styles.statusChecking}>⏳ Checking...</Text>}
                                    {item.status === 'available' && <Text style={styles.statusOk}>✅ Available</Text>}
                                    {item.status === 'unavailable' && <Text style={styles.statusError}>⛔ Unavailable</Text>}
                                </View>
                                <TouchableOpacity
                                    style={{ flex: 1, alignItems: 'center' }}
                                    onPress={() => handleRemoveSeal(item.id)}
                                >
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
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>รวมทั้งหมด:</Text>
                            <Text style={styles.totalValue}>{stagedSeals.reduce((sum, item) => sum + (item.type === 'Range' ? (item.rangeCount || 0) : 1), 0)} <Text style={{ fontSize: 16, fontWeight: 'normal' }}>ชิ้น/Seals</Text></Text>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStagedSeals([])}>
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                                onPress={handleConfirmAssignment}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>💾 ยืนยันการจ่ายงาน (Confirm)</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Technician Selection Modal */}
            <Modal visible={showTechDropdown} transparent animationType="slide" onRequestClose={() => setShowTechDropdown(false)}>
                <View style={styles.techModalOverlay}>
                    <View style={styles.techModalContent}>
                        <View style={styles.techModalHeader}>
                            <Text style={styles.techModalTitle}>เลือกช่าง</Text>
                            <TouchableOpacity onPress={() => setShowTechDropdown(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.techSearchInput}
                            placeholder="🔍 พิมพ์ชื่อ หรือรหัสช่าง..."
                            value={searchTechQuery}
                            onChangeText={setSearchTechQuery}
                        />

                        <ScrollView style={styles.techList}>
                            {filterTechnicians().map(tech => (
                                <TouchableOpacity
                                    key={tech.id}
                                    style={styles.techItem}
                                    onPress={() => handleSelectTechnician(tech)}
                                >
                                    <View style={styles.techAvatarSmall}>
                                        <Text style={styles.techAvatarTextSmall}>{tech.first_name.charAt(0)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.techItemName}>{tech.first_name} {tech.last_name}</Text>
                                        <Text style={styles.techItemSub}>รหัส: {tech.technician_code} • สังกัด: {getPeaName(tech.pea_code)}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {filterTechnicians().length === 0 && (
                                <View style={styles.emptyTechList}>
                                    <Text style={styles.emptyTechText}>ไม่พบข้อมูลช่าง</Text>
                                </View>
                            )}
                        </ScrollView>
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
    rightPanel: { flex: 2, backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 2, flexDirection: 'column', overflow: 'hidden' },

    sectionCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primaryPurple, marginBottom: 15 },

    // Tech Selection
    formGroup: { marginBottom: 15 },
    techSelector: {
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
    techPlaceholder: { fontSize: 14, color: '#aaa' },
    dropdownIcon: { color: '#999', fontSize: 14 },

    techModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    techModalContent: {
        width: '90%',
        height: '80%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    techModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    techModalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryPurple },
    closeBtn: { fontSize: 24, color: '#999' },
    techSearchInput: {
        height: 48,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 14,
        backgroundColor: '#fafafa',
        marginBottom: 10,
    },
    techList: {
        flex: 1,
    },
    techItem: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    techAvatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryPurple,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    techAvatarTextSmall: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    techItemName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
    },
    techItemSub: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    emptyTechList: {
        padding: 20,
        alignItems: 'center',
    },
    emptyTechText: {
        color: '#999',
        fontSize: 14,
    },

    selectedTechCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
    techAvatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: colors.primaryPurple, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    techAvatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    techInfo: { flex: 1 },
    techName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    techDetail: { fontSize: 12, color: '#666' },
    techBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
    techBadgeText: { fontSize: 10, color: '#4caf50', fontWeight: 'bold' },
    removeTechBtn: { padding: 8 },
    removeTechText: { fontSize: 16, color: '#999' },

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

    listContainer: { flex: 1, minHeight: 0 },
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
