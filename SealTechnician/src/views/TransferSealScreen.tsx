import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Modal, TextInput } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TechnicianService, Seal } from '../services/TechnicianService';
import { SealStatus } from '../constants/status';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    History: undefined;
    Notification: undefined;
    ReturnSeal: undefined;
    TransferSeal: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TransferSeal'>;

export default function TransferSealScreen() {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();

    const [seals, setSeals] = useState<Seal[]>([]);
    const [selectedSeals, setSelectedSeals] = useState<string[]>([]);
    const [technicians, setTechnicians] = useState<any[]>([]);
    const [selectedTechnician, setSelectedTechnician] = useState<any | null>(null);
    const [isTechModalVisible, setIsTechModalVisible] = useState(false);

    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchText, setSearchText] = useState('');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            // Get user's active seals
            const assignedSeals = await TechnicianService.getAssignedSeals();
            const transferrable = assignedSeals.filter(s =>
                s.status === SealStatus.ISSUED ||
                (s.status === SealStatus.READY && s.return_remarks !== 'ไม่ได้ใช้งาน (คืนคลัง)')
            );
            setSeals(transferrable);

            // Get user me info to get pea_code
            const meInfo = await TechnicianService.getMe();
            if (meInfo.pea_code) {
                const techList = await TechnicianService.getTechniciansByPeaCode(meInfo.pea_code);
                // Filter out self
                const others = techList.filter(t => t.id !== meInfo.id);
                setTechnicians(others);
            }
        } catch (error: any) {
            Alert.alert('ข้อผิดพลาด', error.message || 'ไม่สามารถโหลดข้อมูลได้');
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
            setSelectedSeals([]);
            setSelectedTechnician(null);
        }, [])
    );

    const toggleSealSelection = (sealNumber: string) => {
        setSelectedSeals(prev =>
            prev.includes(sealNumber)
                ? prev.filter(s => s !== sealNumber)
                : [...prev, sealNumber]
        );
    };

    const handleTransfer = async () => {
        if (selectedSeals.length === 0) {
            Alert.alert('แจ้งเตือน', 'กรุณาเลือกซีลที่ต้องการโอน');
            return;
        }
        if (!selectedTechnician) {
            Alert.alert('แจ้งเตือน', 'กรุณาเลือกช่างปลายทาง');
            return;
        }

        Alert.alert(
            'ยืนยันการโอนซีล',
            `คุณต้องการโอนซีลจำนวน ${selectedSeals.length} ดวง ให้ช่าง ${selectedTechnician.first_name} ${selectedTechnician.last_name || ''} ใช่หรือไม่?`,
            [
                { text: 'ยกเลิก', style: 'cancel' },
                {
                    text: 'ยืนยัน',
                    onPress: async () => {
                        setIsSubmitting(true);
                        try {
                            await TechnicianService.transferSeals(selectedTechnician.id, selectedSeals);
                            Alert.alert('สำเร็จ', 'โอนซีลเรียบร้อยแล้ว');
                            navigation.goBack();
                        } catch (error: any) {
                            Alert.alert('ข้อผิดพลาด', error.message || 'การโอนซีลล้มเหลว');
                        } finally {
                            setIsSubmitting(false);
                        }
                    }
                }
            ]
        );
    };

    const displayedSeals = seals.filter(
        seal => seal.seal_number.toLowerCase().includes(searchText.toLowerCase())
    );

    const renderSealItem = ({ item }: { item: Seal }) => {
        const isSelected = selectedSeals.includes(item.seal_number);
        return (
            <TouchableOpacity
                style={[styles.sealCard, isSelected && styles.sealCardSelected]}
                onPress={() => toggleSealSelection(item.seal_number)}
            >
                <View style={styles.sealInfo}>
                    <Ionicons name={isSelected ? "checkbox" : "square-outline"} size={24} color={isSelected ? "#6A0DAD" : "#BDBDBD"} />
                    <View style={styles.sealDetails}>
                        <Text style={styles.sealNumber}>{item.seal_number}</Text>
                        <Text style={styles.sealStatus}>สถานะปัจจุบัน: {item.status}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                 <SafeAreaView edges={[]} style={styles.headerContent}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View style={styles.headerTitleContainer}>
                        <Text style={styles.headerTitle}>โอนซีลให้ช่างในศูนย์</Text>
                        <Text style={styles.headerSubtitle}>เลือกซีลและช่างที่ต้องการโอน</Text>
                    </View>
                    <View style={{ width: 24 }} />
                 </SafeAreaView>
            </View>

            {/* Body */}
            <View style={[styles.body, { paddingBottom: insets.bottom + 20 }]}>
                {/* Target Technician Selection */}
                <TouchableOpacity
                    style={styles.techSelectBox}
                    onPress={() => setIsTechModalVisible(true)}
                >
                    <View>
                        <Text style={styles.techSelectLabel}>ช่างผู้รับโอน:</Text>
                        <Text style={styles.techSelectValue}>
                            {selectedTechnician
                                ? `${selectedTechnician.first_name} ${selectedTechnician.last_name || ''} (ID: ${selectedTechnician.username})`
                                : 'แตะเพื่อเลือกช่าง'
                            }
                        </Text>
                    </View>
                    <Ionicons name="chevron-down" size={24} color="#666" />
                </TouchableOpacity>

                {/* Search */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search-outline" size={20} color="#9E9E9E" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="ค้นหาเบอร์ซีล..."
                        value={searchText}
                        onChangeText={setSearchText}
                    />
                </View>

                {/* Seal List */}
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>เลือกซีลที่ต้องการโอน ({selectedSeals.length}/{seals.length})</Text>
                    <TouchableOpacity
                        onPress={() => {
                            if (selectedSeals.length === displayedSeals.length) {
                                setSelectedSeals([]);
                            } else {
                                setSelectedSeals(displayedSeals.map(s => s.seal_number));
                            }
                        }}
                    >
                        <Text style={styles.selectAllText}>
                            {selectedSeals.length === displayedSeals.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {isLoading ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color="#6A0DAD" />
                        <Text style={styles.loadingText}>กำลังโหลดข้อมูล...</Text>
                    </View>
                ) : seals.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="cube-outline" size={60} color="#ccc" />
                        <Text style={styles.emptyText}>ไม่มีซีลในมือที่สามารถโอนได้</Text>
                    </View>
                ) : (
                    <FlatList
                        data={displayedSeals}
                        renderItem={renderSealItem}
                        keyExtractor={item => item.id.toString()}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </View>

            {/* Submit Button */}
            <SafeAreaView edges={['bottom']} style={styles.footerSubmit}>
                <TouchableOpacity
                    style={[
                        styles.submitButton,
                        (selectedSeals.length === 0 || !selectedTechnician || isSubmitting) && styles.submitButtonDisabled
                    ]}
                    onPress={handleTransfer}
                    disabled={selectedSeals.length === 0 || !selectedTechnician || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>ยืนยันการโอน {selectedSeals.length} ซีล</Text>
                    )}
                </TouchableOpacity>
            </SafeAreaView>

            {/* Technician Selection Modal */}
            <Modal visible={isTechModalVisible} animationType="slide" transparent={true}>
                <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>เลือกช่างผู้รับโอน</Text>
                            <TouchableOpacity onPress={() => setIsTechModalVisible(false)}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>
                        
                        {technicians.length === 0 ? (
                            <Text style={styles.emptyText}>ไม่พบช่างคนอื่นในศูนย์งานนี้</Text>
                        ) : (
                            <FlatList
                                data={technicians}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.techItem}
                                        onPress={() => {
                                            setSelectedTechnician(item);
                                            setIsTechModalVisible(false);
                                        }}
                                    >
                                        <View style={styles.techAvatar}>
                                            <Ionicons name="person" size={20} color="#fff" />
                                        </View>
                                        <View>
                                            <Text style={styles.techName}>{item.first_name} {item.last_name || ''}</Text>
                                            <Text style={styles.techCode}>ID: {item.username}</Text>
                                        </View>
                                    </TouchableOpacity>
                                )}
                            />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        backgroundColor: '#6A0DAD',
        paddingBottom: 20,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    headerContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
    backButton: { padding: 8, marginRight: 8 },
    headerTitleContainer: { flex: 1, alignItems: 'center' },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
    headerSubtitle: { color: '#E0B0FF', fontSize: 14 },
    body: { flex: 1, marginTop: 16, paddingHorizontal: 16 },
    techSelectBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    techSelectLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
    techSelectValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        elevation: 2,
        height: 50,
    },
    searchIcon: { marginRight: 10 },
    searchInput: { flex: 1, fontSize: 16, color: '#333' },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        paddingHorizontal: 4,
    },
    listTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    selectAllText: { color: '#6A0DAD', fontWeight: 'bold', fontSize: 14 },
    listContainer: { paddingBottom: 80 },
    sealCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 1,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    sealCardSelected: {
        borderColor: '#6A0DAD',
        backgroundColor: '#F3E5F5',
    },
    sealInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    sealDetails: { marginLeft: 16 },
    sealNumber: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    sealStatus: { fontSize: 12, color: '#666' },
    footerSubmit: {
        backgroundColor: '#fff',
        padding: 16,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    submitButton: {
        backgroundColor: '#6A0DAD',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: '#ccc',
    },
    submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#666', fontSize: 16 },
    emptyText: { marginTop: 16, color: '#999', fontSize: 16, textAlign: 'center' },
    
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    techItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    techAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#6A0DAD',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    techName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    techCode: { fontSize: 12, color: '#666', marginTop: 4 },
});
