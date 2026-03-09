import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';
import { useHomeViewModel } from '../../viewmodels/HomeViewModel';
import { API_CONFIG, getApiUrl } from '../../config/api.config';
import { AuthService } from '../../services/AuthService';

export default function CompanyAssignSealScreen({ navigation }: any) {
    const [sealNumber, setSealNumber] = useState('');
    const [targetTechnicianId, setTargetTechnicianId] = useState('');
    const [loading, setLoading] = useState(false);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const { activeSeals, fetchSeals } = useHomeViewModel();
    const insets = useSafeAreaInsets();

    React.useEffect(() => {
        fetchSeals();
        fetchTechnicians();
    }, []);

    const fetchTechnicians = async () => {
        try {
            const token = await AuthService.getToken();
            const response = await fetch(getApiUrl('/technician/list'), {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setTechnicians(data);
            }
        } catch (error) {
            console.error('Error fetching technicians:', error);
        }
    };

    const sealOptions = activeSeals.map(seal => ({
        label: seal.seal_number,
        value: seal.seal_number
    }));

    const techOptions = technicians.map(tech => ({
        label: `${tech.first_name} ${tech.last_name} (${tech.technician_code})`,
        value: tech.id.toString()
    }));

    const handleAssign = async () => {
        if (!sealNumber.trim() || !targetTechnicianId.trim()) {
            Alert.alert('ข้อผิดพลาด', 'กรุณากรอกหมายเลขซีลและรหัสช่างให้ครบถ้วน');
            return;
        }

        setLoading(true);
        try {
            const token = await AuthService.getToken();
            const response = await fetch(getApiUrl('/technician/seals/transfer'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token} `
                },
                body: JSON.stringify({
                    seal_numbers: [sealNumber],
                    target_technician_id: parseInt(targetTechnicianId, 10)
                })
            });

            if (response.ok) {
                Alert.alert('สำเร็จ', 'จ่ายซีลให้ช่างเรียนร้อยแล้ว', [
                    {
                        text: 'ตกลง',
                        onPress: () => {
                            setSealNumber('');
                            setTargetTechnicianId('');
                            navigation.goBack();
                        }
                    }
                ]);
            } else {
                const data = await response.json();
                Alert.alert('ข้อผิดพลาด', data.error || 'ไม่สามารถจ่ายซีลได้');
            }
        } catch (error) {
            console.error('Error assigning seal:', error);
            Alert.alert('ข้อผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <SafeAreaView edges={[]} style={styles.headerContent}>
                    <Text style={styles.headerTitle}>จ่ายซีลให้ช่าง</Text>
                    <Text style={styles.headerSubtitle}>โอนซีลจากคลังบริษัทไปยังช่าง</Text>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.formCard}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="pricetag" size={40} color="#6A0DAD" />
                    </View>
                    <Text style={styles.formTitle}>ระบุข้อมูลการจ่ายซีล</Text>
                    <Text style={styles.formSubtitle}>กรุณาตรวจสอบความถูกต้องก่อนยืนยัน</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>หมายเลขซีล (Seal Number)</Text>
                        <View style={styles.pickerContainer}>
                            <RNPickerSelect
                                onValueChange={(value) => setSealNumber(value)}
                                items={sealOptions}
                                placeholder={{ label: 'เลือกหมายเลขซีลที่พร้อมจ่าย...', value: '' }}
                                value={sealNumber}
                                useNativeAndroidPickerStyle={false}
                                style={pickerSelectStyles}
                                Icon={() => <Ionicons name="chevron-down" size={20} color="#9E9E9E" style={styles.pickerIcon} />}
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>ช่างผู้รับซีล (Technician)</Text>
                        <View style={styles.pickerContainer}>
                            <RNPickerSelect
                                onValueChange={(value) => setTargetTechnicianId(value)}
                                items={techOptions}
                                placeholder={{ label: 'เลือกช่างผู้ปฏิบัติงาน...', value: '' }}
                                value={targetTechnicianId}
                                useNativeAndroidPickerStyle={false}
                                style={pickerSelectStyles}
                                Icon={() => <Ionicons name="chevron-down" size={20} color="#9E9E9E" style={styles.pickerIcon} />}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.assignButton, loading && styles.assignButtonDisabled]}
                        onPress={handleAssign}
                        disabled={loading}
                    >
                        <Text style={styles.assignButtonText}>
                            {loading ? 'กำลังดำเนินการ...' : 'ยืนยันการจ่ายซีล'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#6A0DAD', // Purple
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    backButton: {
        position: 'absolute',
        left: 20,
        top: 0,
        padding: 5,
        zIndex: 1,
    },
    headerTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    headerSubtitle: {
        color: '#E0B0FF',
        fontSize: 14,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 30,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    iconContainer: {
        width: 80,
        height: 80,
        backgroundColor: '#F3E5F5',
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    formTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputContainer: {
        width: '100%',
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#555',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: '#333',
    },
    assignButton: {
        backgroundColor: '#6A0DAD',
        width: '100%',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 10,
        elevation: 2,
        shadowColor: '#6A0DAD',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    assignButtonDisabled: {
        backgroundColor: '#B39DDB',
        elevation: 0,
        shadowOpacity: 0,
    },
    assignButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    pickerContainer: {
        backgroundColor: '#f9f9f9',
        borderWidth: 1,
        borderColor: '#E0E0E0',
        borderRadius: 12,
        justifyContent: 'center',
    },
    pickerIcon: {
        marginTop: 15,
        marginRight: 15,
    }
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 15,
        paddingHorizontal: 15,
        color: '#333',
        paddingRight: 40, // to ensure the text is never behind the icon
    },
    inputAndroid: {
        fontSize: 16,
        paddingVertical: 15,
        paddingHorizontal: 15,
        color: '#333',
        paddingRight: 40, // to ensure the text is never behind the icon
    },
});
