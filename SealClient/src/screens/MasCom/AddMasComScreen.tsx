import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { masComService } from '@/services/masComService';
import { userService } from '@/services/userService';

export const AddMasComScreen: React.FC = () => {
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    // MasPea Selection State
    const [showPeaModal, setShowPeaModal] = useState(false);
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [searchPeaQuery, setSearchPeaQuery] = useState('');
    const [selectedPeaName, setSelectedPeaName] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        comCode: '',
        nameTh: '',
        nameEng: '',
        peaCode: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

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

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.comCode) newErrors.comCode = 'กรุณากรอกรหัสศูนย์งาน (เช่น 46735206)';
        if (!formData.nameTh) newErrors.nameTh = 'กรุณากรอกชื่อศูนย์งาน (ภาษาไทย)';
        if (!formData.nameEng) newErrors.nameEng = 'ไม่พบชื่อย่อระบบ (กรุณาเลือกสังกัดอื่นที่มีอักษรย่อ)';
        if (!formData.peaCode) newErrors.peaCode = 'กรุณาเลือกสังกัดการไฟฟ้าแม่ข่าย';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        try {
            setLoading(true);

            const payload = {
                com_code: formData.comCode,
                name_th: formData.nameTh,
                name_eng: formData.nameEng,
                pea_code: formData.peaCode,
            };

            await masComService.createMasCom(payload);

            setModalStatus('success');
            setModalMessage('เพิ่มข้อมูลศูนย์งานเรียบร้อยแล้ว');
            setModalVisible(true);
        } catch (error: any) {
            console.error('Error creating MasCom:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'ไม่สามารถเพิ่มข้อมูลได้ กรุณาลองใหม่');
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

    // Filter MasPea list
    const filteredPeas = masPeaList.filter(item => {
        const code = item.pea_code || item.PeaCode || item.code || '';
        const nameTh = item.name_th || item.NameTh || '';
        const nameEng = item.name_eng || item.NameEng || '';
        const query = searchPeaQuery.toLowerCase();
        return code.toLowerCase().includes(query) || nameTh.includes(query) || nameEng.toLowerCase().includes(query);
    });

    const handleSelectPea = (item: any) => {
        const code = item.pea_code || item.PeaCode || item.code || '';
        const nameTh = item.name_th || item.NameTh || '';
        const nameEng = item.name_eng || item.NameEng || '';

        setFormData({ ...formData, peaCode: code, nameEng: nameEng });
        setSelectedPeaName(nameTh);
        setShowPeaModal(false);
    };

    return (
        <View style={styles.mainContainer}>
            <Header />

            <ScrollView style={styles.content}>
                {/* Form Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>🏢</Text>
                        <Text style={styles.cardTitle}>เพิ่มข้อมูลศูนย์งาน (บริษัทตัวแทน)</Text>
                    </View>

                    <View style={styles.formFields}>
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>รหัสศูนย์งาน (Com Code) <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.comCode && styles.inputError]}
                                    placeholder="เช่น 46735206"
                                    value={formData.comCode}
                                    onChangeText={(text) => setFormData({ ...formData, comCode: text })}
                                    keyboardType="numeric"
                                />
                                {errors.comCode && <Text style={styles.errorText}>{errors.comCode}</Text>}
                                <Text style={styles.hint}>รหัสบริษัท 8-10 หลัก</Text>
                            </View>

                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>ชื่อย่อระบบ (Name Eng) <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, { color: '#999', backgroundColor: '#f0f0f0' }]}
                                    placeholder="เลือกสังกัดเพื่อดึงระดับ"
                                    value={formData.nameEng}
                                    editable={false}
                                />
                                {errors.nameEng && <Text style={styles.errorText}>{errors.nameEng}</Text>}
                                <Text style={styles.hint}>ดึงจากสังกัดการไฟฟ้าอัตโนมัติ</Text>
                            </View>
                        </View>

                        <View style={styles.fieldRow}>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>ชื่อบริษัท/ศูนย์งาน (ภาษาไทย) <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.nameTh && styles.inputError]}
                                    placeholder="เช่น T.S.N.รุ่งเจริญกิจ-(สรน)"
                                    value={formData.nameTh}
                                    onChangeText={(text) => setFormData({ ...formData, nameTh: text })}
                                />
                                {errors.nameTh && <Text style={styles.errorText}>{errors.nameTh}</Text>}
                            </View>
                        </View>

                        {/* MasPea Selection */}
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>สังกัดการไฟฟ้าแม่ข่าย <Text style={styles.required}>*</Text></Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.selectInput, errors.peaCode && styles.inputError]}
                                    onPress={() => setShowPeaModal(true)}
                                >
                                    <Text style={formData.peaCode ? styles.inputText : styles.placeholderText}>
                                        {formData.peaCode ? `${selectedPeaName || formData.peaCode}` : 'เลือกสังกัด...'}
                                    </Text>
                                    <Text>▼</Text>
                                </TouchableOpacity>
                                {errors.peaCode && <Text style={styles.errorText}>{errors.peaCode}</Text>}
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
                            {modalStatus === 'success' ? 'บันทึกสำเร็จ' : 'เกิดข้อผิดพลาด'}
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

            {/* MasPea Selection Modal */}
            <Modal
                transparent={true}
                visible={showPeaModal}
                animationType="slide"
                onRequestClose={() => setShowPeaModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '80%', width: '90%' }]}>
                        <Text style={styles.modalTitle}>เลือกสังกัด</Text>
                        <TextInput
                            style={[styles.input, { width: '100%', marginBottom: 15 }]}
                            placeholder="ค้นหาชื่อ หรือรหัส..."
                            value={searchPeaQuery}
                            onChangeText={setSearchPeaQuery}
                        />

                        <FlatList
                            data={filteredPeas}
                            keyExtractor={(item, index) => index.toString()}
                            style={{ width: '100%' }}
                            renderItem={({ item }) => {
                                const code = item.pea_code || item.PeaCode || item.code || '';
                                const name = item.name_th || item.NameTh || '';
                                return (
                                    <TouchableOpacity
                                        style={styles.peaItem}
                                        onPress={() => handleSelectPea(item)}
                                    >
                                        <Text style={styles.peaCode}>{code}</Text>
                                        <Text style={styles.peaName}>{name}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>ไม่พบข้อมูล</Text>}
                        />

                        <TouchableOpacity
                            style={[styles.cancelBtn, { marginTop: 15, width: '100%' }]}
                            onPress={() => setShowPeaModal(false)}
                        >
                            <Text style={styles.cancelBtnText}>ปิด</Text>
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
    inputError: {
        borderColor: '#ff4d4f',
    },
    errorText: {
        color: '#ff4d4f',
        fontSize: 12,
        marginTop: 4,
    },
    hint: {
        fontSize: 11,
        color: '#999',
        marginTop: 6,
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
    selectInput: {
        justifyContent: 'space-between',
        flexDirection: 'row',
        alignItems: 'center',
    },
    inputText: {
        color: '#333',
    },
    placeholderText: {
        color: '#aaa',
    },
    peaItem: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        width: '100%',
    },
    peaCode: {
        fontWeight: 'bold',
        fontSize: 14,
        color: colors.primaryPurple,
        marginBottom: 2,
    },
    peaName: {
        fontSize: 14,
        color: '#333',
    },
});
