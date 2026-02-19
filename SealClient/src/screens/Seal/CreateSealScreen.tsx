import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ActivityIndicator, Modal, FlatList, ScrollView
} from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { userService } from '@/services/userService';
import { useNavigation } from '@react-navigation/native';

export const CreateSealScreen: React.FC = () => {
    const navigation = useNavigation();
    const [sealNumber, setSealNumber] = useState('');
    const [count, setCount] = useState('');
    const [loading, setLoading] = useState(false);

    // PEA Selection
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [selectedPeaCode, setSelectedPeaCode] = useState('');
    const [selectedPeaName, setSelectedPeaName] = useState('');
    const [showPeaModal, setShowPeaModal] = useState(false);
    const [peaSearch, setPeaSearch] = useState('');

    // Status Modal
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

    const filteredPeaList = masPeaList.filter(p => {
        const code = p.pea_code || p.PeaCode || p.code || '';
        const name = p.name_th || p.NameTh || '';
        const q = peaSearch.toLowerCase();
        return code.toLowerCase().includes(q) || name.toLowerCase().includes(q);
    });

    const handleSelectPea = (item: any) => {
        const code = item.pea_code || item.PeaCode || item.code || '';
        const name = item.name_th || item.NameTh || '';
        setSelectedPeaCode(code);
        setSelectedPeaName(name);
        setShowPeaModal(false);
        setPeaSearch('');
    };

    const handleCreate = async () => {
        if (!sealNumber || !count) {
            setModalStatus('error');
            setModalMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
            setModalVisible(true);
            return;
        }
        if (!selectedPeaCode) {
            setModalStatus('error');
            setModalMessage('กรุณาเลือกสังกัดการไฟฟ้า (PEA Code)');
            setModalVisible(true);
            return;
        }

        const countNum = parseInt(count);
        if (isNaN(countNum) || countNum <= 0) {
            setModalStatus('error');
            setModalMessage('จำนวนต้องเป็นตัวเลขที่มากกว่า 0');
            setModalVisible(true);
            return;
        }

        setLoading(true);
        try {
            await sealService.createSeal({
                seal_number: sealNumber,
                count: countNum,
                pea_code: selectedPeaCode,
            });

            setModalStatus('success');
            setModalMessage(`สร้างซีลชุดใหม่จำนวน ${countNum} อัน เรียบร้อยแล้ว`);
            setModalVisible(true);
        } catch (error: any) {
            console.error('Error creating seals:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'ไม่สามารถสร้างซีลได้ กรุณาลองใหม่');
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
            <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>สร้างซีลใหม่ (Batch)</Text>
                    <Text style={styles.subtitle}>ระบบจะทำการสร้าง Serial Number ให้อัตโนมัติตามจำนวนที่ระบุ</Text>

                    {/* PEA Selector */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>สังกัดการไฟฟ้า (PEA Code) <Text style={styles.required}>*</Text></Text>
                        <TouchableOpacity style={styles.peaSelector} onPress={() => setShowPeaModal(true)}>
                            {selectedPeaCode ? (
                                <View>
                                    <Text style={styles.peaCode}>{selectedPeaCode}</Text>
                                    <Text style={styles.peaName}>{selectedPeaName}</Text>
                                </View>
                            ) : (
                                <Text style={styles.peaPlaceholder}>เลือกการไฟฟ้า...</Text>
                            )}
                            <Text style={styles.dropdownIcon}>▼</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Seal Number */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>เลขซีลเริ่มต้น (Start Seal Number)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex. F0001"
                            value={sealNumber}
                            onChangeText={setSealNumber}
                        />
                    </View>

                    {/* Count */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>จำนวน (Count)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex. 100"
                            value={count}
                            onChangeText={setCount}
                            keyboardType="numeric"
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        onPress={handleCreate}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>ยืนยันการสร้าง</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* PEA Selection Modal */}
            <Modal visible={showPeaModal} transparent animationType="slide" onRequestClose={() => setShowPeaModal(false)}>
                <View style={styles.peaModalOverlay}>
                    <View style={styles.peaModalContent}>
                        <View style={styles.peaModalHeader}>
                            <Text style={styles.peaModalTitle}>เลือกสังกัดการไฟฟ้า</Text>
                            <TouchableOpacity onPress={() => setShowPeaModal(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.peaSearchInput}
                            placeholder="ค้นหาด้วยรหัสหรือชื่อ..."
                            value={peaSearch}
                            onChangeText={setPeaSearch}
                        />
                        <FlatList
                            data={filteredPeaList}
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
                        <View style={[
                            styles.modalIconCircle,
                            { backgroundColor: modalStatus === 'success' ? '#e8f5e9' : '#ffebee' }
                        ]}>
                            <Text style={[
                                styles.modalIcon,
                                { color: modalStatus === 'success' ? '#4caf50' : '#f44336' }
                            ]}>
                                {modalStatus === 'success' ? '✅' : '❌'}
                            </Text>
                        </View>
                        <Text style={styles.modalTitle}>
                            {modalStatus === 'success' ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}
                        </Text>
                        <Text style={styles.modalMessage}>{modalMessage}</Text>
                        <TouchableOpacity
                            style={[
                                styles.modalBtn,
                                { backgroundColor: modalStatus === 'success' ? colors.primaryPurple : '#f44336' }
                            ]}
                            onPress={handleModalClose}
                        >
                            <Text style={styles.modalBtnText}>ตกลง</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: colors.bgLight },
    scroll: { flex: 1 },
    container: { padding: sizes.md, paddingBottom: 40 },
    card: {
        backgroundColor: '#fff',
        padding: sizes.lg,
        borderRadius: sizes.radiusMd,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    title: {
        fontSize: sizes.fontLg,
        fontWeight: 'bold',
        color: colors.primaryPurple,
        marginBottom: sizes.xs,
    },
    subtitle: {
        fontSize: sizes.fontSm,
        color: colors.textLight,
        marginBottom: sizes.lg,
    },
    formGroup: { marginBottom: sizes.md },
    label: { fontSize: sizes.fontSm, color: colors.text, marginBottom: 8, fontWeight: '500' },
    required: { color: '#f44336' },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: sizes.radiusMd,
        padding: 12,
        fontSize: sizes.fontMd,
        backgroundColor: '#fafafa',
    },
    peaSelector: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: sizes.radiusMd,
        padding: 12,
        backgroundColor: '#fafafa',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 50,
    },
    peaCode: { fontSize: 15, fontWeight: 'bold', color: colors.primaryPurple },
    peaName: { fontSize: 13, color: '#555', marginTop: 2 },
    peaPlaceholder: { fontSize: sizes.fontMd, color: '#aaa' },
    dropdownIcon: { color: '#999', fontSize: 14 },
    button: {
        backgroundColor: colors.primaryPurple,
        padding: 14,
        borderRadius: sizes.radiusMd,
        alignItems: 'center',
        marginTop: sizes.md,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonText: { color: '#fff', fontWeight: 'bold', fontSize: sizes.fontMd },

    // PEA Modal
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

    // Status Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        width: 350,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 30,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    modalIconCircle: {
        width: 80, height: 80, borderRadius: 40,
        justifyContent: 'center', alignItems: 'center', marginBottom: 20,
    },
    modalIcon: { fontSize: 40 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    modalMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    modalBtn: { width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});
