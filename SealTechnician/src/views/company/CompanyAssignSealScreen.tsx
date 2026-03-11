import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, KeyboardAvoidingView, ScrollView, Platform, ActivityIndicator, Modal, FlatList, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import RNPickerSelect from 'react-native-picker-select';
import { useHomeViewModel } from '../../viewmodels/HomeViewModel';
import { getApiUrl } from '../../config/api.config';
import { AuthService } from '../../services/AuthService';

export default function CompanyAssignSealScreen({ navigation, route }: any) {
    const initialSelectedSeals = route.params?.initialSelectedSeals;
    const [selectedSealNumbers, setSelectedSealNumbers] = useState<string[]>(initialSelectedSeals || []);
    const [targetTechnicianId, setTargetTechnicianId] = useState('');
    const [loading, setLoading] = useState(false);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const { activeSeals, fetchSeals } = useHomeViewModel();
    const insets = useSafeAreaInsets();
    const processedParamsRef = React.useRef<string>('');

    // Modal states
    const [isSealModalVisible, setIsSealModalVisible] = useState(false);
    const [isTechModalVisible, setIsTechModalVisible] = useState(false);
    const [sealModalSearchText, setSealModalSearchText] = useState('');
    const [techModalSearchText, setTechModalSearchText] = useState('');
    const [tempSelectedSeals, setTempSelectedSeals] = useState<string[]>([]);

    useEffect(() => {
        fetchSeals();
        fetchTechnicians();
    }, []);

    useEffect(() => {
        const stringified = JSON.stringify(initialSelectedSeals);
        if (initialSelectedSeals && initialSelectedSeals.length > 0 && stringified !== processedParamsRef.current) {
            processedParamsRef.current = stringified;
            setSelectedSealNumbers(initialSelectedSeals);
        }
    }, [initialSelectedSeals]);

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

    const sealOptions = activeSeals
        .filter(s => !selectedSealNumbers.includes(s.seal_number))
        .map(seal => ({
            label: seal.seal_number,
            value: seal.seal_number
        }));

    const techOptions = technicians.map(tech => ({
        label: `${tech.first_name} ${tech.last_name} (${tech.technician_code})`,
        value: tech.id.toString()
    }));

    const toggleModalSelection = (sealNo: string) => {
        setTempSelectedSeals(prev =>
            prev.includes(sealNo)
                ? prev.filter(s => s !== sealNo)
                : [...prev, sealNo]
        );
    };

    const handleModalSelectAll = () => {
        const filteredSealNumbers = activeSeals
            .filter(s => !selectedSealNumbers.includes(s.seal_number) &&
                s.seal_number.toLowerCase().includes(sealModalSearchText.toLowerCase()))
            .map(s => s.seal_number);
        setTempSelectedSeals(filteredSealNumbers);
    };

    const handleModalClearAll = () => {
        setTempSelectedSeals([]);
    };

    const confirmSealModalSelection = () => {
        const newTotal = [...new Set([...selectedSealNumbers, ...tempSelectedSeals])];
        setSelectedSealNumbers(newTotal);
        setIsSealModalVisible(false);
        setTempSelectedSeals([]);
        setSealModalSearchText('');
    };

    const openSealModal = () => {
        setTempSelectedSeals([]);
        setSealModalSearchText('');
        setIsSealModalVisible(true);
    };

    const selectTechnician = (techId: string) => {
        setTargetTechnicianId(techId);
        setIsTechModalVisible(false);
        setTechModalSearchText('');
    };

    const getSelectedTechName = () => {
        const tech = technicians.find(t => t.id.toString() === targetTechnicianId);
        return tech ? `${tech.first_name} ${tech.last_name}` : 'เลือกช่างผู้ปฏิบัติงาน...';
    };

    const removeSeal = (sealNo: string) => {
        setSelectedSealNumbers(selectedSealNumbers.filter(s => s !== sealNo));
    };

    const clearSelectedSeals = () => {
        if (selectedSealNumbers.length === 0) return;
        Alert.alert(
            'ล้างรายการทั้งหมด',
            'คุณต้องการล้างรายการซีลทั้งหมดที่เลือกไว้หรือไม่?',
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ล้างทั้งหมด',
                    style: 'destructive',
                    onPress: () => setSelectedSealNumbers([])
                },
            ]
        );
    };

    const handleAssign = async () => {
        if (selectedSealNumbers.length === 0 || !targetTechnicianId.trim()) {
            Alert.alert('ข้อผิดพลาด', 'กรุณาเลือกซีลอย่างน้อย 1 รายการ และเลือกช่างผู้รับ');
            return;
        }

        setLoading(true);
        try {
            const token = await AuthService.getToken();
            const response = await fetch(getApiUrl('/technician/seals/transfer'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    seal_numbers: selectedSealNumbers,
                    target_technician_id: parseInt(targetTechnicianId, 10)
                })
            });

            if (response.ok) {
                Alert.alert('สำเร็จ', `จ่ายซีลจำนวน ${selectedSealNumbers.length} รายการให้ช่างเรียบร้อยแล้ว`, [
                    {
                        text: 'ตกลง',
                        onPress: () => {
                            setSelectedSealNumbers([]);
                            setTargetTechnicianId('');
                            navigation.navigate('InventoryTab');
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
                    <Text style={styles.headerSubtitle}>โอนซีลจากคลังบริษัทไปยังช่างผู้ปฏิบัติงาน</Text>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.formCard}>
                    {/* Technician Selection */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person-circle-outline" size={24} color="#6A0DAD" />
                            <Text style={styles.sectionTitle}>เลือกช่างผู้รับซีล</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.techSelectorButton}
                            onPress={() => {
                                setTechModalSearchText('');
                                setIsTechModalVisible(true);
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="person" size={20} color="#6A0DAD" />
                            <Text style={[styles.techSelectorText, !targetTechnicianId && styles.placeholderText]}>
                                {getSelectedTechName()}
                            </Text>
                            <Ionicons name="chevron-forward" size={18} color="#9E9E9E" />
                        </TouchableOpacity>
                    </View>

                    {/* Seal Selection */}
                    <View style={styles.sectionContainer}>
                        <View style={styles.sectionHeaderRow}>
                            <View style={styles.sectionTitleContainer}>
                                <Ionicons name="pricetags-outline" size={22} color="#6A0DAD" />
                                <Text style={styles.sectionTitle}>รายการซีลที่ต้องการจ่าย ({selectedSealNumbers.length})</Text>
                            </View>
                        </View>

                        {/* Add more seals */}
                        <TouchableOpacity
                            style={styles.addMoreButton}
                            onPress={openSealModal}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="add-circle" size={24} color="#6A0DAD" />
                            <Text style={styles.addMoreText}>เพิ่มซีลจากคลัง...</Text>
                            <Ionicons name="chevron-forward" size={20} color="#9E9E9E" />
                        </TouchableOpacity>

                        {/* Selected Seals List */}
                        <View style={styles.sealsList}>
                            {selectedSealNumbers.length === 0 ? (
                                <View style={styles.emptySeals}>
                                    <Text style={styles.emptyText}>ยังไม่มีซีลที่ถูกเลือก</Text>
                                    <Text style={styles.emptySubtext}>เลือกซีลจากคลังด้านบน</Text>
                                </View>
                            ) : (
                                selectedSealNumbers.map((sn) => (
                                    <View key={sn} style={styles.sealItem}>
                                        <Text style={styles.sealItemText}>{sn}</Text>
                                        <TouchableOpacity onPress={() => removeSeal(sn)} style={styles.removeBtn}>
                                            <Ionicons name="close-circle" size={22} color="#FF5252" />
                                        </TouchableOpacity>
                                    </View>
                                ))
                            )}

                            {selectedSealNumbers.length > 0 && (
                                <TouchableOpacity
                                    onPress={clearSelectedSeals}
                                    style={styles.clearAllButtonBottom}
                                    activeOpacity={0.6}
                                >
                                    <Ionicons name="trash-outline" size={16} color="#F44336" style={{ marginRight: 6 }} />
                                    <Text style={styles.clearAllTextBottom}>ล้างรายการที่เลือกทั้งหมด</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.assignButton, (loading || selectedSealNumbers.length === 0 || !targetTechnicianId) && styles.assignButtonDisabled]}
                        onPress={handleAssign}
                        disabled={loading || selectedSealNumbers.length === 0 || !targetTechnicianId}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="checkmark-done-circle" size={24} color="#fff" style={{ marginRight: 8 }} />
                                <Text style={styles.assignButtonText}>ยืนยันการจ่ายซีลทั้งหมด</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Seal Multi-Select Modal */}
            <Modal
                visible={isSealModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsSealModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { marginTop: insets.top + 50, marginBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เลือกซีลจากคลัง</Text>
                            <TouchableOpacity onPress={() => setIsSealModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalSearchContainer}>
                            <Ionicons name="search" size={20} color="#9E9E9E" />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="ค้นหาเบอร์ซีล..."
                                value={sealModalSearchText}
                                onChangeText={setSealModalSearchText}
                                autoCapitalize="characters"
                            />
                            {sealModalSearchText !== '' && (
                                <TouchableOpacity onPress={() => setSealModalSearchText('')}>
                                    <Ionicons name="close-circle" size={20} color="#9E9E9E" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.modalBulkActionRow}>
                            <TouchableOpacity
                                style={styles.modalBulkButton}
                                onPress={handleModalSelectAll}
                            >
                                <Ionicons name="checkbox-outline" size={18} color="#6A0DAD" />
                                <Text style={styles.modalBulkButtonText}>เลือกทั้งหมด</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.modalBulkButton}
                                onPress={handleModalClearAll}
                            >
                                <Ionicons name="trash-outline" size={18} color="#F44336" />
                                <Text style={[styles.modalBulkButtonText, { color: '#F44336' }]}>ล้างที่เลือก</Text>
                            </TouchableOpacity>
                        </View>

                        <FlatList
                            data={activeSeals.filter(s =>
                                !selectedSealNumbers.includes(s.seal_number) &&
                                s.seal_number.toLowerCase().includes(sealModalSearchText.toLowerCase())
                            )}
                            keyExtractor={item => item.seal_number}
                            renderItem={({ item }) => {
                                const isSelected = tempSelectedSeals.includes(item.seal_number);
                                return (
                                    <TouchableOpacity
                                        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                                        onPress={() => toggleModalSelection(item.seal_number)}
                                    >
                                        <Text style={[styles.modalItemText, isSelected && styles.modalItemSelectedText]}>
                                            {item.seal_number}
                                        </Text>
                                        <Ionicons
                                            name={isSelected ? "checkbox" : "square-outline"}
                                            size={24}
                                            color={isSelected ? "#6A0DAD" : "#CCC"}
                                        />
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.modalEmpty}>
                                    <Ionicons name="cube-outline" size={48} color="#EEE" />
                                    <Text style={styles.modalEmptyText}>ไม่พบซีลที่เลือกได้</Text>
                                </View>
                            }
                        />

                        <TouchableOpacity
                            style={[styles.modalConfirmButton, tempSelectedSeals.length === 0 && styles.modalConfirmButtonDisabled]}
                            onPress={confirmSealModalSelection}
                            disabled={tempSelectedSeals.length === 0}
                        >
                            <Text style={styles.modalConfirmText}>
                                เพิ่ม {tempSelectedSeals.length} รายการ
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Technician Selection Modal */}
            <Modal
                visible={isTechModalVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setIsTechModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { marginTop: insets.top + 50, marginBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เลือกช่างผู้รับซีล</Text>
                            <TouchableOpacity onPress={() => setIsTechModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalSearchContainer}>
                            <Ionicons name="search" size={20} color="#9E9E9E" />
                            <TextInput
                                style={styles.modalSearchInput}
                                placeholder="ค้นหาชื่อช่าง..."
                                value={techModalSearchText}
                                onChangeText={setTechModalSearchText}
                            />
                            {techModalSearchText !== '' && (
                                <TouchableOpacity onPress={() => setTechModalSearchText('')}>
                                    <Ionicons name="close-circle" size={20} color="#9E9E9E" />
                                </TouchableOpacity>
                            )}
                        </View>

                        <FlatList
                            data={technicians.filter(t =>
                                (t.first_name + ' ' + t.last_name).toLowerCase().includes(techModalSearchText.toLowerCase()) ||
                                t.technician_code.toLowerCase().includes(techModalSearchText.toLowerCase())
                            )}
                            keyExtractor={item => item.id.toString()}
                            renderItem={({ item }) => {
                                const isSelected = targetTechnicianId === item.id.toString();
                                return (
                                    <TouchableOpacity
                                        style={[styles.modalItem, isSelected && styles.modalItemSelected]}
                                        onPress={() => selectTechnician(item.id.toString())}
                                    >
                                        <View>
                                            <Text style={[styles.modalItemText, isSelected && styles.modalItemSelectedText]}>
                                                {item.first_name} {item.last_name}
                                            </Text>
                                            <Text style={styles.techCodeText}>{item.technician_code}</Text>
                                        </View>
                                        {isSelected && (
                                            <Ionicons name="checkmark-circle" size={24} color="#6A0DAD" />
                                        )}
                                    </TouchableOpacity>
                                );
                            }}
                            ListEmptyComponent={
                                <View style={styles.modalEmpty}>
                                    <Ionicons name="people-outline" size={48} color="#EEE" />
                                    <Text style={styles.modalEmptyText}>ไม่รายชื่อช่าง</Text>
                                </View>
                            }
                        />
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: '#6A0DAD',
        paddingBottom: 25,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    headerContent: {
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 26,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    headerSubtitle: {
        color: '#E0B0FF',
        fontSize: 14,
        textAlign: 'center',
    },
    scrollContent: {
        padding: 20,
        paddingTop: 15,
        paddingBottom: 100,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
    },
    sectionContainer: {
        width: '100%',
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#333',
        marginLeft: 8,
    },
    pickerContainer: {
        backgroundColor: '#F8F9FA',
        borderWidth: 1.5,
        borderColor: '#E9ECEF',
        borderRadius: 15,
        justifyContent: 'center',
    },
    pickerIcon: {
        marginTop: 15,
        marginRight: 15,
    },
    addSealContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    sealsList: {
        backgroundColor: '#FDF7FF',
        borderRadius: 15,
        padding: 10,
        minHeight: 100,
        borderWidth: 1,
        borderColor: '#F3E5F5',
        borderStyle: 'dashed',
    },
    sealItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderRadius: 10,
        marginBottom: 8,
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 1,
    },
    sealItemText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#444',
    },
    removeBtn: {
        padding: 2,
    },
    emptySeals: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyText: {
        color: '#9E9E9E',
        fontSize: 14,
        fontWeight: '600',
    },
    emptySubtext: {
        color: '#BDBDBD',
        fontSize: 12,
        marginTop: 4,
    },
    assignButton: {
        backgroundColor: '#6A0DAD',
        width: '100%',
        padding: 18,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        elevation: 4,
        shadowColor: '#6A0DAD',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    assignButtonDisabled: {
        backgroundColor: '#D1C4E9',
        elevation: 0,
        shadowOpacity: 0,
    },
    assignButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    addMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3E5F5',
        padding: 15,
        borderRadius: 15,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: '#E1BEE7',
    },
    addMoreText: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#6A0DAD',
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalContent: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 25,
        padding: 20,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    modalSearchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 15,
    },
    modalSearchInput: {
        flex: 1,
        paddingVertical: 12,
        marginLeft: 8,
        fontSize: 16,
    },
    modalItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    modalItemSelected: {
        backgroundColor: '#FDF7FF',
    },
    modalItemText: {
        fontSize: 16,
        color: '#444',
    },
    modalItemSelectedText: {
        color: '#6A0DAD',
        fontWeight: 'bold',
    },
    modalEmpty: {
        alignItems: 'center',
        padding: 40,
    },
    modalEmptyText: {
        marginTop: 10,
        color: '#BBB',
    },
    modalConfirmButton: {
        backgroundColor: '#6A0DAD',
        padding: 18,
        borderRadius: 15,
        alignItems: 'center',
        marginTop: 15,
    },
    modalConfirmButtonDisabled: {
        backgroundColor: '#CCC',
    },
    modalConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalBulkActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
        backgroundColor: '#FCFBFF',
    },
    modalBulkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
        backgroundColor: '#F3E5F5',
    },
    modalBulkButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6A0DAD',
        marginLeft: 6,
    },
    techSelectorButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderWidth: 1.5,
        borderColor: '#E9ECEF',
        borderRadius: 15,
        padding: 15,
    },
    techSelectorText: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
    placeholderText: {
        color: '#9E9E9E',
    },
    techCodeText: {
        fontSize: 13,
        color: '#757575',
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 5,
    },
    sectionTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clearAllButtonBottom: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    clearAllTextBottom: {
        fontSize: 14,
        color: '#F44336',
        fontWeight: '600',
    }
});

const pickerSelectStyles = StyleSheet.create({
    inputIOS: {
        fontSize: 16,
        paddingVertical: 15,
        paddingHorizontal: 15,
        color: '#333',
        paddingRight: 40,
    },
    inputAndroid: {
        fontSize: 16,
        paddingVertical: 12,
        paddingHorizontal: 15,
        color: '#333',
        paddingRight: 40,
    },
});
