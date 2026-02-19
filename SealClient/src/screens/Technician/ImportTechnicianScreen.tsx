import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { technicianService } from '@/services/technicianService';
import { userService } from '@/services/userService'; // Import userService
import { Technician } from '@/types';

type ImportTab = 'file' | 'json';

export const ImportTechnicianScreen: React.FC = () => {
    const navigation = useNavigation();
    const [activeTab, setActiveTab] = useState<ImportTab>('json');
    const [jsonInput, setJsonInput] = useState('');
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    // MasPea Data
    const [masPeaList, setMasPeaList] = useState<any[]>([]);

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

    const getPeaName = (code?: string) => {
        if (!code) return '';
        const pea = masPeaList.find(p => p.pea_code === code || p.PeaCode === code || p.code === code);
        return pea ? (pea.name_th || pea.NameTh) : '';
    };

    const handlePreview = () => {
        if (activeTab === 'json') {
            try {
                if (!jsonInput.trim()) {
                    setModalStatus('error');
                    setModalMessage('กรุณาวางข้อมูล JSON');
                    setModalVisible(true);
                    return;
                }
                const parsed = JSON.parse(jsonInput);
                const dataArray = Array.isArray(parsed) ? parsed : [parsed];
                setPreviewData(dataArray);
                setShowPreview(true);
            } catch (error) {
                setModalStatus('error');
                setModalMessage('รูปแบบ JSON ไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง');
                setModalVisible(true);
            }
        } else {
            setModalStatus('error');
            setModalMessage('ระบบอัปโหลดไฟล์ยังไม่เปิดใช้งานในเวอร์ชันนี้ กรุณาใช้การวาง JSON');
            setModalVisible(true);
        }
    };

    const handleImport = async () => {
        try {
            setLoading(true);
            // In a real scenario, we'd validate the data structure here
            await technicianService.importTechnicians(previewData);

            setModalStatus('success');
            setModalMessage(`นำเข้าข้อมูลช่างสำเร็จจำนวน ${previewData.length} รายการ`);
            setModalVisible(true);
        } catch (error: any) {
            console.error('Import error:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'เกิดข้อผิดพลาดในการนำเข้าข้อมูล');
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

    const renderPreviewTable = () => (
        <View style={styles.previewContainer}>
            <View style={styles.previewHeader}>
                <Text style={styles.previewTitle}>ตรวจสอบข้อมูล (Preview)</Text>
                <Text style={styles.previewCount}>ทั้งหมด {previewData.length} รายการ</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={true}>
                <View>
                    <View style={styles.tableHeader}>
                        <Text style={[styles.headerCell, { width: 120 }]}>รหัสช่าง</Text>
                        <Text style={[styles.headerCell, { width: 150 }]}>ชื่อ-นามสกุล</Text>
                        <Text style={[styles.headerCell, { width: 120 }]}>เบอร์โทรศัพท์</Text>
                        <Text style={[styles.headerCell, { width: 120 }]}>รหัสการไฟฟ้า</Text>
                        <Text style={[styles.headerCell, { width: 180 }]}>ชื่อการไฟฟ้า</Text>
                    </View>
                    <FlatList
                        data={previewData}
                        keyExtractor={(_, index) => index.toString()}
                        renderItem={({ item }) => (
                            <View style={styles.tableRow}>
                                <Text style={[styles.cell, { width: 120 }]}>{item.technician_code || item.id || '-'}</Text>
                                <Text style={[styles.cell, { width: 150 }]}>{`${item.first_name || ''} ${item.last_name || ''}`}</Text>
                                <Text style={[styles.cell, { width: 120 }]}>{item.phone_number || '-'}</Text>
                                <Text style={[styles.cell, { width: 120 }]}>{item.pea_code || '-'}</Text>
                                <Text style={[styles.cell, { width: 180 }]}>{getPeaName(item.pea_code) || '-'}</Text>
                            </View>
                        )}
                        scrollEnabled={false}
                    />
                </View>
            </ScrollView>
            <View style={styles.previewFooter}>
                <TouchableOpacity style={styles.backBtn} onPress={() => setShowPreview(false)}>
                    <Text style={styles.backBtnText}>แก้ไขข้อมูล</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.confirmBtn} onPress={handleImport} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>ยืนยันการนำเข้า</Text>}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <Header />
            <ScrollView style={styles.content}>
                {!showPreview ? (
                    <View style={styles.card}>
                        <View style={styles.cardHeader}>
                            <View style={styles.stepCircle}><Text style={styles.stepNum}>1</Text></View>
                            <Text style={styles.cardTitle}>เลือกแหล่งข้อมูล</Text>
                            <TouchableOpacity style={styles.templateLink}>
                                <Text style={styles.templateText}>📥 ดาวน์โหลด Template (.xlsx)</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'file' && styles.activeTab]}
                                onPress={() => setActiveTab('file')}
                            >
                                <Text style={[styles.tabText, activeTab === 'file' && styles.activeTabText]}>📄 อัปโหลดไฟล์ (Excel/CSV)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, activeTab === 'json' && styles.activeTab]}
                                onPress={() => setActiveTab('json')}
                            >
                                <Text style={[styles.tabText, activeTab === 'json' && styles.activeTabText]}>{'</> วาง JSON Data'}</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.importArea}>
                            {activeTab === 'file' ? (
                                <View style={styles.uploadBox}>
                                    <Text style={styles.uploadIcon}>☁️</Text>
                                    <Text style={styles.uploadMainText}>ลากไฟล์มาวางที่นี่ หรือ <Text style={styles.uploadLink}>คลิกเพื่อเลือกไฟล์</Text></Text>
                                    <Text style={styles.uploadSubText}>รองรับไฟล์ .xlsx, .csv ขนาดไม่เกิน 10MB</Text>
                                </View>
                            ) : (
                                <TextInput
                                    style={styles.jsonTextArea}
                                    multiline
                                    placeholder='[ {"technician_code": "T001", "first_name": "Somchai", "pea_code": "B00001", ...} ]'
                                    value={jsonInput}
                                    onChangeText={setJsonInput}
                                />
                            )}
                        </View>

                        <View style={styles.footer}>
                            <TouchableOpacity style={styles.previewBtn} onPress={handlePreview}>
                                <Text style={styles.previewBtnText}>ตรวจสอบข้อมูล (Preview) ➔</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    renderPreviewTable()
                )}
            </ScrollView>

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
                        <TouchableOpacity
                            style={[styles.modalBtn, { backgroundColor: modalStatus === 'success' ? colors.primaryPurple : '#f44336' }]}
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
        borderRadius: 15,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    stepCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primaryPurple,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    stepNum: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primaryPurple,
        flex: 1,
    },
    templateLink: {
        padding: 5,
    },
    templateText: {
        fontSize: 14,
        color: '#c0a060',
        fontWeight: '500',
    },
    tabContainer: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 25,
    },
    tab: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginRight: 10,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderBottomColor: colors.primaryPurple,
    },
    tabText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    activeTabText: {
        color: colors.primaryPurple,
        fontWeight: 'bold',
    },
    importArea: {
        marginBottom: 25,
    },
    uploadBox: {
        height: 250,
        borderWidth: 2,
        borderColor: '#eee',
        borderStyle: 'dashed',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    uploadIcon: {
        fontSize: 40,
        color: colors.primaryPurple,
        marginBottom: 15,
    },
    uploadMainText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
        textAlign: 'center',
    },
    uploadLink: {
        color: '#c0a060',
        textDecorationLine: 'underline',
    },
    uploadSubText: {
        fontSize: 13,
        color: '#999',
        marginTop: 10,
    },
    jsonTextArea: {
        height: 250,
        borderWidth: 1,
        borderColor: '#eee',
        borderRadius: 12,
        padding: 20,
        fontSize: 14,
        fontFamily: 'monospace',
        backgroundColor: '#fafafa',
        textAlignVertical: 'top',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
    },
    previewBtn: {
        backgroundColor: colors.primaryPurple,
        paddingVertical: 12,
        paddingHorizontal: 25,
        borderRadius: 10,
    },
    previewBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    previewContainer: {
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 25,
    },
    previewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginBottom: 20,
    },
    previewTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.primaryPurple,
    },
    previewCount: {
        fontSize: 14,
        color: '#666',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        paddingVertical: 12,
        borderTopLeftRadius: 8,
        borderTopRightRadius: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerCell: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        paddingHorizontal: 15,
    },
    tableRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
    },
    cell: {
        fontSize: 14,
        color: '#666',
        paddingHorizontal: 15,
    },
    previewFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 25,
    },
    backBtn: {
        paddingVertical: 12,
        paddingHorizontal: 25,
        marginRight: 15,
    },
    backBtnText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '500',
    },
    confirmBtn: {
        backgroundColor: colors.primaryPurple,
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 10,
    },
    confirmBtnText: {
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
});
