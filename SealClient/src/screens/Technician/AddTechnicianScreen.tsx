import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, Image, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { technicianService } from '@/services/technicianService';
import { masComService } from '@/services/masComService';

export const AddTechnicianScreen: React.FC = () => {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    // MasCom Selection State
    const [showComModal, setShowComModal] = useState(false);
    const [masComList, setMasComList] = useState<any[]>([]);
    const [searchComQuery, setSearchComQuery] = useState('');
    const [selectedComName, setSelectedComName] = useState(route.params?.center_name || '');

    // Image Upload State
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [previewUri, setPreviewUri] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        technicianCode: 'สร้างอัตโนมัติเมื่อกดบันทึก',
        comCode: route.params?.com_code || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        fetchMasCom();
    }, []);

    const fetchMasCom = async () => {
        try {
            const data = await masComService.getMasComs();
            setMasComList(data);
        } catch (error) {
            console.error('Failed to fetch MasCom:', error);
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.username) newErrors.username = 'กรุณากรอกชื่อผู้ใช้';
        if (!formData.password) newErrors.password = 'กรุณากรอกรหัสผ่าน';
        if (!formData.firstName) newErrors.firstName = 'กรุณากรอกชื่อจริง';
        if (!formData.lastName) newErrors.lastName = 'กรุณากรอกนามสกุล';
        if (!formData.phoneNumber) {
            newErrors.phoneNumber = 'กรุณากรอกเบอร์โทรศัพท์';
        } else if (formData.phoneNumber.length < 10) {
            newErrors.phoneNumber = 'ต้องมี 10 หลัก';
        }
        if (!formData.comCode) newErrors.comCode = 'กรุณาเลือกศูนย์งาน';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handlePickImage = () => {
        if (Platform.OS === 'web') {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/png, image/jpeg';
            input.onchange = (e: any) => {
                const file = e.target.files?.[0];
                if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                        alert('ไฟล์ภาพมีขนาดใหญ่เกิน 2MB');
                        return;
                    }
                    setProfileImage(file);
                    setPreviewUri(URL.createObjectURL(file));
                }
            };
            input.click();
        } else {
            alert('รองรับการอายัปโหลดบนเว็บเท่านั้นในขณะนี้');
        }
    };

    const handleSave = async () => {
        if (!validate()) return;

        try {
            setLoading(true);

            const payload = {
                technician_code: '', // ให้ Backend สร้างรหัสใหม่
                username: formData.username,
                password: formData.password,
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone_number: formData.phoneNumber,
                com_code: formData.comCode, // ส่ง com_code แทน pea_code เพื่อให้ Backend สร้างรหัสช่างได้
                company_name: selectedComName,
                department: '-',
            };

            const res = await technicianService.registerTechnician(payload);
            const newTechId = res.data?.id;

            if (profileImage && newTechId) {
                try {
                    await technicianService.uploadProfilePic(newTechId, profileImage);
                } catch (imgError) {
                    console.error('Failed to upload profile picture:', imgError);
                    alert('ลงทะเบียนสำเร็จ แต่ไม่สามารถอัปโหลดรูปภาพได้');
                }
            }

            setModalStatus('success');
            setModalMessage('ลงทะเบียนช่างเทคนิคเรียบร้อยแล้ว');
            setModalVisible(true);
        } catch (error: any) {
            console.error('Error registering technician:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่');
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

    const generateNewCode = () => {
        // ไม่ต้องทำอะไร ปล่อยให้ Backend ทำ
    };

    // Filter MasCom list
    const filteredComs = masComList.filter(item => {
        const code = item.com_code || '';
        const nameTh = item.name_th || '';
        const nameEng = item.name_eng || '';
        const query = searchComQuery.toLowerCase();
        return code.toLowerCase().includes(query) || nameTh.includes(query) || nameEng.toLowerCase().includes(query);
    });

    const handleSelectCom = (item: any) => {
        const code = item.com_code || '';
        const nameTh = item.name_th || '';

        setFormData({ ...formData, comCode: code });
        setSelectedComName(nameTh);
        setShowComModal(false);
    };

    return (
        <View style={styles.mainContainer}>
            <Header />

            <ScrollView style={styles.content}>
                {/* Personal Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>🆔</Text>
                        <Text style={styles.cardTitle}>ข้อมูลส่วนตัว</Text>
                    </View>

                    <View style={styles.row}>
                        <View style={styles.avatarSection}>
                            <TouchableOpacity style={styles.avatarCircle} onPress={handlePickImage} activeOpacity={0.8}>
                                {previewUri ? (
                                    <Image source={{ uri: previewUri }} style={{ width: '100%', height: '100%', borderRadius: 60 }} />
                                ) : (
                                    <Text style={styles.avatarIcon}>📷</Text>
                                )}
                                <View style={styles.plusCircle}>
                                    <Text style={styles.plusText}>+</Text>
                                </View>
                            </TouchableOpacity>
                            <Text style={styles.avatarHint}>อัปโหลดรูปโปรไฟล์</Text>
                            <Text style={styles.avatarSubHint}>(JPG, PNG ไม่เกิน 2MB)</Text>
                        </View>

                        <View style={styles.formFields}>
                            <View style={styles.fieldRow}>
                                <View style={styles.fieldItem}>
                                    <Text style={styles.label}>ชื่อจริง <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={[styles.input, errors.firstName && styles.inputError]}
                                        placeholder="เช่น สมชาย"
                                        value={formData.firstName}
                                        onChangeText={(text) => setFormData({ ...formData, firstName: text })}
                                    />
                                    {errors.firstName && <Text style={styles.errorText}>{errors.firstName}</Text>}
                                </View>
                                <View style={styles.fieldItem}>
                                    <Text style={styles.label}>นามสกุล <Text style={styles.required}>*</Text></Text>
                                    <TextInput
                                        style={[styles.input, errors.lastName && styles.inputError]}
                                        placeholder="เช่น ใจดี"
                                        value={formData.lastName}
                                        onChangeText={(text) => setFormData({ ...formData, lastName: text })}
                                    />
                                    {errors.lastName && <Text style={styles.errorText}>{errors.lastName}</Text>}
                                </View>
                            </View>

                            <View style={styles.fieldRow}>
                                <View style={styles.fieldItem}>
                                    <Text style={styles.label}>เบอร์โทรศัพท์ <Text style={styles.required}>*</Text></Text>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputIcon}>📞</Text>
                                        <TextInput
                                            style={[styles.inputWithIcon, errors.phoneNumber && styles.inputError]}
                                            placeholder="08x-xxx-xxxx"
                                            value={formData.phoneNumber}
                                            onChangeText={(text) => setFormData({ ...formData, phoneNumber: text.replace(/[^0-9]/g, '') })}
                                            keyboardType="phone-pad"
                                            maxLength={10}
                                        />
                                    </View>
                                    {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}
                                </View>
                                <View style={styles.fieldItem}>
                                    <Text style={styles.label}>อีเมล (ถ้ามี)</Text>
                                    <View style={styles.inputContainer}>
                                        <Text style={styles.inputIcon}>✉️</Text>
                                        <TextInput
                                            style={styles.inputWithIcon}
                                            placeholder="example@email.com"
                                            value={formData.email}
                                            onChangeText={(text) => setFormData({ ...formData, email: text })}
                                            keyboardType="email-address"
                                        />
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Work Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>💼</Text>
                        <Text style={styles.cardTitle}>ข้อมูลงานและสังกัด</Text>
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={styles.fieldItem}>
                            <Text style={styles.label}>รหัสช่าง (Technician ID)</Text>
                            <View style={styles.inputContainer}>
                                <TextInput
                                    style={[styles.inputWithAction, { color: '#999', backgroundColor: '#f0f0f0' }]}
                                    value={formData.technicianCode}
                                    editable={false}
                                />
                            </View>
                            <Text style={styles.hint}>รหัสถูกสร้างอัตโนมัติจากระบบ</Text>
                        </View>

                        {/* MasCom Selection */}
                        <View style={styles.fieldItem}>
                            <Text style={styles.label}>ศูนย์งาน (Work Center) <Text style={styles.required}>*</Text></Text>
                            <TouchableOpacity
                                style={[styles.input, styles.selectInput, errors.comCode && styles.inputError]}
                                onPress={() => setShowComModal(true)}
                            >
                                <Text style={formData.comCode ? styles.inputText : styles.placeholderText}>
                                    {formData.comCode ? `${selectedComName || formData.comCode}` : 'เลือกศูนย์งาน...'}
                                </Text>
                                <Text>▼</Text>
                            </TouchableOpacity>
                            {errors.comCode && <Text style={styles.errorText}>{errors.comCode}</Text>}
                        </View>
                    </View>
                </View>

                {/* Account Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardIcon}>🔒</Text>
                        <Text style={styles.cardTitle}>ข้อมูลการเข้าสู่ระบบ</Text>
                    </View>

                    <View style={styles.fieldRow}>
                        <View style={styles.fieldItem}>
                            <Text style={styles.label}>ชื่อผู้ใช้ (Username) <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={[styles.input, errors.username && styles.inputError]}
                                placeholder="เช่น tech01"
                                value={formData.username}
                                onChangeText={(text) => setFormData({ ...formData, username: text })}
                                autoCapitalize="none"
                            />
                            {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                        </View>
                        <View style={styles.fieldItem}>
                            <Text style={styles.label}>รหัสผ่าน (Password) <Text style={styles.required}>*</Text></Text>
                            <TextInput
                                style={[styles.input, errors.password && styles.inputError]}
                                placeholder="รหัสผ่านเข้าใช้งาน"
                                secureTextEntry
                                value={formData.password}
                                onChangeText={(text) => setFormData({ ...formData, password: text })}
                            />
                            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
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
                            {modalStatus === 'success' ? 'ลงทะเบียนสำเร็จ' : 'เกิดข้อผิดพลาด'}
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

            {/* MasCom Selection Modal */}
            <Modal
                transparent={true}
                visible={showComModal}
                animationType="slide"
                onRequestClose={() => setShowComModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '80%', width: '90%' }]}>
                        <Text style={styles.modalTitle}>เลือกศูนย์งาน</Text>
                        <TextInput
                            style={[styles.input, { width: '100%', marginBottom: 15 }]}
                            placeholder="ค้นหาชื่อ หรือรหัส..."
                            value={searchComQuery}
                            onChangeText={setSearchComQuery}
                        />

                        <FlatList
                            data={filteredComs}
                            keyExtractor={(item, index) => index.toString()}
                            style={{ width: '100%' }}
                            renderItem={({ item }) => {
                                const code = item.com_code || '';
                                const name = item.name_th || '';
                                return (
                                    <TouchableOpacity
                                        style={styles.peaItem}
                                        onPress={() => handleSelectCom(item)}
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
                            onPress={() => setShowComModal(false)}
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
    row: {
        flexDirection: 'row',
    },
    avatarSection: {
        alignItems: 'center',
        marginRight: 40,
        paddingTop: 10,
    },
    avatarCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#f8f9fa',
        borderWidth: 2,
        borderColor: '#eee',
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        marginBottom: 15,
    },
    avatarIcon: {
        fontSize: 40,
        opacity: 0.2,
    },
    plusCircle: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#c0a060',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    plusText: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
        marginTop: -2,
    },
    avatarHint: {
        fontSize: 12,
        color: '#666',
        fontWeight: '600',
    },
    avatarSubHint: {
        fontSize: 10,
        color: '#999',
        marginTop: 2,
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 48,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        backgroundColor: '#fafafa',
        overflow: 'hidden',
    },
    inputIcon: {
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#999',
        backgroundColor: '#f0f0f0',
        height: '100%',
        textAlignVertical: 'center',
        paddingTop: 12,
    },
    inputWithIcon: {
        flex: 1,
        paddingHorizontal: 15,
        fontSize: 14,
    },
    inputWithAction: {
        flex: 1,
        paddingHorizontal: 15,
        fontSize: 14,
    },
    actionBtn: {
        width: 48,
        height: 48,
        backgroundColor: '#f0f2f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderLeftWidth: 1,
        borderLeftColor: '#e0e0e0',
    },
    actionBtnText: {
        fontSize: 18,
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
