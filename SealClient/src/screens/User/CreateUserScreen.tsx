import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { userService } from '@/services/userService';

export const CreateUserScreen: React.FC = () => {
    const navigation = useNavigation();
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

    // Form State
    const [formData, setFormData] = useState({
        empId: '',
        title: '',
        firstName: '',
        lastName: '',
        username: '',
        email: '',
        role: 'user', // Default role
        peaCode: '',
        peaShort: '',
        peaName: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    React.useEffect(() => {
        fetchMasPea();
    }, []);

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

        setFormData({
            ...formData,
            peaCode: code,
            peaShort: nameEng,
            peaName: nameTh
        });
        setSelectedPea(code ? `${code} - ${nameTh}` : nameTh);
        setShowPeaModal(false);
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.empId) newErrors.empId = 'กรุณากรอกรหัสพนักงาน';
        if (!formData.title) newErrors.title = 'กรุณากรอกคำนำหน้า';
        if (!formData.firstName) newErrors.firstName = 'กรุณากรอกชื่อจริง';
        if (!formData.lastName) newErrors.lastName = 'กรุณากรอกนามสกุล';
        if (!formData.username) newErrors.username = 'กรุณากรอกชื่อผู้ใช้';
        if (!formData.email) newErrors.email = 'กรุณากรอกอีเมล';
        if (!formData.peaCode) newErrors.peaCode = 'กรุณาเลือกสังกัด (หรือข้อมูลสังกัดไม่สมบูรณ์)';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;

        try {
            setLoading(true);

            const payload = {
                emp_id: parseInt(formData.empId),
                title_s_desc: formData.title,
                first_name: formData.firstName,
                last_name: formData.lastName,
                username: formData.username,
                email: formData.email,
                role: formData.role,
                pea_code: formData.peaCode,
                pea_short: formData.peaShort,
                pea_name: formData.peaName,
            };

            await userService.createUser(payload);

            setModalStatus('success');
            setModalMessage('สร้างผู้ใช้งานเรียบร้อยแล้ว');
            setModalVisible(true);
        } catch (error: any) {
            console.error('Error creating user:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'ไม่สามารถสร้างผู้ใช้งานได้ กรุณาลองใหม่');
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
                        <Text style={styles.cardIcon}>👤</Text>
                        <Text style={styles.cardTitle}>ข้อมูลผู้ใช้งานใหม่</Text>
                    </View>

                    <View style={styles.formFields}>
                        {/* Row 1: Employee ID & Username */}
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>รหัสพนักงาน <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.empId && styles.inputError]}
                                    placeholder="เช่น 123456"
                                    value={formData.empId}
                                    onChangeText={(text) => setFormData({ ...formData, empId: text.replace(/[^0-9]/g, '') })}
                                    keyboardType="numeric"
                                />
                                {errors.empId && <Text style={styles.errorText}>{errors.empId}</Text>}
                            </View>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>ชื่อผู้ใช้ (Username) <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.username && styles.inputError]}
                                    placeholder="เช่น somchai.j"
                                    value={formData.username}
                                    onChangeText={(text) => setFormData({ ...formData, username: text })}
                                    autoCapitalize="none"
                                />
                                {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                            </View>
                        </View>

                        {/* Row 2: Title, First Name, Last Name */}
                        <View style={styles.fieldRow}>
                            <View style={{ flex: 0.5, marginHorizontal: 10 }}>
                                <Text style={styles.label}>คำนำหน้า <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.title && styles.inputError]}
                                    placeholder="นาย/นาง/นางสาว"
                                    value={formData.title}
                                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                                />
                                {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
                            </View>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>ชื่อจริง <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.firstName && styles.inputError]}
                                    placeholder="สมชาย"
                                    value={formData.firstName}
                                    onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                                />
                                {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                            </View>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>นามสกุล <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.lastName && styles.inputError]}
                                    placeholder="ใจดี"
                                    value={formData.lastName}
                                    onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                                />
                                {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                            </View>
                        </View>

                        {/* Row 3: Email & Role */}
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>อีเมล <Text style={styles.required}>*</Text></Text>
                                <TextInput
                                    style={[styles.input, errors.email && styles.inputError]}
                                    placeholder="example@pea.co.th"
                                    value={formData.email}
                                    onChangeText={(text) => setFormData({ ...formData, email: text })}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                            </View>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>สิทธิ์การใช้งาน (Role)</Text>
                                <View style={styles.radioGroup}>
                                    <TouchableOpacity
                                        style={[styles.radioButton, formData.role === 'user' && styles.radioButtonSelected]}
                                        onPress={() => setFormData({ ...formData, role: 'user' })}
                                    >
                                        <Text style={[styles.radioText, formData.role === 'user' && styles.radioTextSelected]}>User</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.radioButton, formData.role === 'admin' && styles.radioButtonSelected]}
                                        onPress={() => setFormData({ ...formData, role: 'admin' })}
                                    >
                                        <Text style={[styles.radioText, formData.role === 'admin' && styles.radioTextSelected]}>Admin</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Row 4: Organization (MasPea) */}
                        <View style={styles.fieldRow}>
                            <View style={styles.fieldItem}>
                                <Text style={styles.label}>สังกัด / หน่วยงาน (PEA) <Text style={styles.required}>*</Text></Text>
                                <TouchableOpacity
                                    style={[styles.input, styles.dropdownBtn, errors.peaCode && styles.inputError]}
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
    inputError: {
        borderColor: '#ff4d4f',
    },
    errorText: {
        color: '#ff4d4f',
        fontSize: 12,
        marginTop: 4,
    },
    radioGroup: {
        flexDirection: 'row',
        height: 48,
        backgroundColor: '#f0f2f5',
        borderRadius: 8,
        padding: 4,
    },
    radioButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 6,
    },
    radioButtonSelected: {
        backgroundColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    radioText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    radioTextSelected: {
        color: colors.primaryPurple,
        fontWeight: 'bold',
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
