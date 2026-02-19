import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { userService } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';

export const ChangeWorkplaceScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user } = useAuth(); // We need user info to update
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    // MasPea State
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [filteredPeaList, setFilteredPeaList] = useState<any[]>([]);
    const [selectedPea, setSelectedPea] = useState<string>('');
    const [searchText, setSearchText] = useState('');
    const [showPeaModal, setShowPeaModal] = useState(false);

    // Selected Data
    const [selectedPeaData, setSelectedPeaData] = useState<any>(null);

    useEffect(() => {
        fetchMasPea();
        if (user) {
            setSelectedPea(`${user.pea_code} - ${user.pea_name}`);
        }
    }, [user]);

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
            setFilteredPeaList(data);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const handleSearchPea = (text: string) => {
        setSearchText(text);
        if (text) {
            const filtered = masPeaList.filter(item => {
                const code = item.pea_code || item.PeaCode || item.code || '';
                const nameTh = item.name_th || item.NameTh || '';
                const nameEng = item.name_eng || item.NameEng || '';

                return code.includes(text) ||
                    nameTh.includes(text) ||
                    (nameEng && nameEng.toLowerCase().includes(text.toLowerCase()));
            });
            setFilteredPeaList(filtered);
        } else {
            setFilteredPeaList(masPeaList);
        }
    };

    const handleSelectPea = (item: any) => {
        const code = item.pea_code || item.PeaCode || item.code || '';
        const nameTh = item.name_th || item.NameTh || '';
        const nameEng = item.name_eng || item.NameEng || '';

        setSelectedPeaData({
            ...item,
            pea_code: code,
            name_th: nameTh,
            name_eng: nameEng
        });
        setSelectedPea(code ? `${code} - ${nameTh}` : nameTh);
        setShowPeaModal(false);
    };

    const handleSave = async () => {
        if (!selectedPeaData || !user?.username) {
            setModalStatus('error');
            setModalMessage('กรุณาเลือกหน่วยงานใหม่');
            setModalVisible(true);
            return;
        }

        try {
            setLoading(true);

            const payload = {
                pea_code: selectedPeaData.pea_code,
                pea_short: selectedPeaData.name_eng, // Mapping name_eng to pea_short for now
                pea_name: selectedPeaData.name_th,
            };

            await userService.updateUser(user.username, payload);

            setModalStatus('success');
            setModalMessage('บันทึกข้อมูลเรียบร้อยแล้ว');
            setModalVisible(true);
        } catch (error: any) {
            console.error('Error updating workplace:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'ไม่สามารถบันทึกข้อมูลได้');
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

            <ScrollView style={styles.content}>
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>🏢</Text>
                        <Text style={styles.cardTitle}>เปลี่ยนที่ทำงาน (Workplace)</Text>
                    </View>

                    <View style={styles.formFields}>
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>สังกัด / หน่วยงาน (PEA) <Text style={styles.required}>*</Text></Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.dropdownBtn]}
                                    onPress={() => {
                                        setSearchText('');
                                        setFilteredPeaList(masPeaList);
                                        setShowPeaModal(true);
                                    }}
                                >
                                    <Text style={{ color: selectedPea ? '#333' : '#999' }}>
                                        {selectedPea || 'เลือกสังกัด...'}
                                    </Text>
                                    <Text>▼</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" />
                        ) : (
                            <>
                                <Text style={styles.saveBtnIcon}>💾</Text>
                                <Text style={styles.saveBtnText}>บันทึกข้อมูล</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* PEA Selection Modal */}
            <Modal
                visible={showPeaModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowPeaModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.peaModalContent}>
                        <View style={styles.peaModalHeader}>
                            <Text style={styles.peaModalTitle}>เลือกสังกัด</Text>
                            <TouchableOpacity onPress={() => setShowPeaModal(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <TextInput
                            style={styles.searchInput}
                            placeholder="ค้นหา (รหัส, ชื่อไทย, ชื่ออังกฤษ)..."
                            value={searchText}
                            onChangeText={handleSearchPea}
                        />

                        <ScrollView style={styles.peaList}>
                            {filteredPeaList.map((item, index) => {
                                const code = item.pea_code || item.PeaCode || item.code || '';
                                const nameTh = item.name_th || item.NameTh || '';
                                const nameEng = item.name_eng || item.NameEng || '';
                                return (
                                    <TouchableOpacity
                                        key={item.id || index}
                                        style={styles.peaItem}
                                        onPress={() => handleSelectPea(item)}
                                    >
                                        <Text style={styles.peaItemCode}>{code || 'No Code'}</Text>
                                        <View>
                                            <Text style={styles.peaItemName}>{nameTh}</Text>
                                            <Text style={styles.peaItemSub}>{nameEng}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Status Modal */}
            <Modal
                transparent={true}
                visible={modalVisible}
                animationType="fade"
                onRequestClose={handleModalClose}
            >
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
    mainContainer: {
        flex: 1,
        backgroundColor: '#f5f7f9',
    },
    content: {
        flex: 1,
        padding: sizes.lg,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: sizes.radMd,
        padding: 25,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    cardIcon: {
        fontSize: 18,
        marginRight: 10,
        color: colors.primaryPurple,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primaryPurple,
    },
    formFields: {
        flex: 1,
    },
    fieldRow: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    fieldItem: {
        flex: 1,
        marginHorizontal: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    required: {
        color: '#ff4d4f',
    },
    input: {
        height: 48,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 14,
        backgroundColor: '#fafafa',
    },
    dropdownBtn: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingBottom: 50,
        marginTop: 10,
    },
    cancelBtn: {
        height: 48,
        paddingHorizontal: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0f2f5',
        marginRight: 15,
    },
    cancelBtnText: {
        color: '#666',
        fontWeight: 'bold',
        fontSize: 15,
    },
    saveBtn: {
        height: 48,
        flexDirection: 'row',
        paddingHorizontal: 30,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.primaryPurple,
    },
    saveBtnIcon: {
        color: 'white',
        fontSize: 16,
        marginRight: 8,
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
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
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalIcon: {
        fontSize: 40,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    modalMessage: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
    },
    modalBtn: {
        width: '100%',
        height: 50,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // PEA Modal Styles
    peaModalContent: {
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
    peaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    peaModalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primaryPurple,
    },
    closeBtn: {
        fontSize: 24,
        color: '#999',
    },
    searchInput: {
        height: 48,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 14,
        backgroundColor: '#fafafa',
        marginBottom: 10,
    },
    peaList: {
        flex: 1,
    },
    peaItem: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    peaItemCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primaryPurple,
        width: 80,
    },
    peaItemName: {
        fontSize: 14,
        color: '#333',
    },
    peaItemSub: {
        fontSize: 12,
        color: '#666',
    },
});
