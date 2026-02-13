import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { useNavigation } from '@react-navigation/native';

export const CreateSealScreen: React.FC = () => {
    const navigation = useNavigation();
    const [sealNumber, setSealNumber] = useState('');
    const [count, setCount] = useState('');
    const [loading, setLoading] = useState(false);

    // Modal State
    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    const handleCreate = async () => {
        if (!sealNumber || !count) {
            setModalStatus('error');
            setModalMessage('กรุณากรอกข้อมูลให้ครบทุกช่อง');
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
                count: countNum
            });

            setModalStatus('success');
            setModalMessage('สร้างซีลชุดใหม่เรียบร้อยแล้ว');
            setModalVisible(true);
        } catch (error: any) {
            console.error('Error creating seals:', error);
            setModalStatus('error');
            setModalMessage('ไม่สามารถสร้างซีลได้ กรุณาลองใหม่');
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
            <View style={styles.container}>
                <View style={styles.card}>
                    <Text style={styles.title}>สร้างซีลใหม่ (Batch)</Text>
                    <Text style={styles.subtitle}>ระบบจะทำการสร้าง Serial Number ให้อัตโนมัติตามจำนวนที่ระบุ</Text>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>เลขซีลเริ่มต้น (Start Seal Number)</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Ex. F0001"
                            value={sealNumber}
                            onChangeText={setSealNumber}
                        />
                    </View>

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
            </View>

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
        backgroundColor: colors.bgLight,
    },
    container: {
        padding: sizes.md,
        flex: 1,
    },
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
    formGroup: {
        marginBottom: sizes.md,
    },
    label: {
        fontSize: sizes.fontSm,
        color: colors.text,
        marginBottom: 8,
        fontWeight: '500',
    },
    input: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: sizes.radiusMd,
        padding: 12,
        fontSize: sizes.fontMd,
        backgroundColor: '#fafafa',
    },
    button: {
        backgroundColor: colors.primaryPurple,
        padding: 14,
        borderRadius: sizes.radiusMd,
        alignItems: 'center',
        marginTop: sizes.md,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: sizes.fontMd,
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
