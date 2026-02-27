import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Image, Modal } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { TechnicianService, Seal } from '../services/TechnicianService';

type RootStackParamList = {
    Home: undefined;
    Scan: undefined;
    History: undefined;
    Notification: undefined;
    ReturnSeal: undefined;
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'ReturnSeal'>;

interface ReturnSealScreenProps {
    onLogout: () => void;
}

export default function ReturnSealScreen({ onLogout }: ReturnSealScreenProps) {
    const navigation = useNavigation<NavigationProp>();
    const insets = useSafeAreaInsets();

    const [permission, requestPermission] = useCameraPermissions();
    const [scannedSeals, setScannedSeals] = useState<Seal[]>([]);
    const [isScanning, setIsScanning] = useState(false);

    const [seals, setSeals] = useState<Seal[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedSeal, setSelectedSeal] = useState<Seal | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    // Form state
    const [reason, setReason] = useState<string>('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const RETURN_REASONS = [
        'ชำรุดก่อนใช้งาน',
        'ซีลเก่าที่ถูกตัดออก',
        'ไม่ได้ใช้งาน (คืนคลัง)'
    ];

    const fetchSeals = async () => {
        setIsLoading(true);
        try {
            const data = await TechnicianService.getAssignedSeals();
            // Filter only seals that can be returned (Assigned or active)
            const returnable = data.filter(s =>
                s.status === 'จ่าย' ||
                s.status === 'พร้อมใช้งาน' ||
                s.status === 'ติดตั้งแล้ว'
            );
            setSeals(returnable);
        } catch (error) {
            console.error('Error fetching seals:', error);
            Alert.alert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลซีลได้');
        } finally {
            setIsLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchSeals();
        }, [])
    );

    const openReturnModal = (seal: Seal) => {
        setSelectedSeal(seal);
        // Default reason based on status
        if (seal.status === 'ติดตั้งแล้ว') {
            setReason('ซีลเก่าที่ถูกตัดออก');
        } else {
            setReason('ชำรุดก่อนใช้งาน');
        }
        setPhotoUri(null);
        setIsModalVisible(true);
    };

    const closeReturnModal = () => {
        setIsModalVisible(false);
        setSelectedSeal(null);
        setReason('');
        setPhotoUri(null);
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('สิทธิ์การเข้าถึง', 'จำเป็นต้องได้รับอนุญาตให้ใช้กล้องเพื่อถ่ายรูปหลักฐาน');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 0.7,
        });

        if (!result.canceled && result.assets && result.assets.length > 0) {
            setPhotoUri(result.assets[0].uri);
        }
    };

    const handleSubmitReturn = async () => {
        if (!selectedSeal) return;
        if (!reason) {
            Alert.alert('แจ้งเตือน', 'กรุณาเลือกระบุเหตุผลการคืน');
            return;
        }
        if (!photoUri) {
            Alert.alert('แจ้งเตือน', 'กรุณาถ่ายรูปหลักฐานประกอบการคืนซีล');
            return;
        }

        setIsSubmitting(true);
        try {
            await TechnicianService.returnSeal(selectedSeal.id, selectedSeal.seal_number, reason, photoUri || undefined);
            Alert.alert('สำเร็จ', 'ส่งคำขอคืนซีลเรียบร้อยแล้ว แอดมินจะดำเนินการตรวจสอบต่อไป', [
                {
                    text: 'ตกลง', onPress: () => {
                        closeReturnModal();
                        setScannedSeals(prev => prev.filter(s => s.id !== selectedSeal!.id));
                        fetchSeals();
                    }
                }
            ]);
        } catch (error: any) {
            Alert.alert('ข้อผิดพลาด', error.message || 'ไม่สามารถคืนซีลได้');
        } finally {
            setIsSubmitting(false);
        }
    };

    const startScan = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert('สิทธิ์การเข้าถึง', 'กรุณาอนุญาตให้แอปเข้าถึงกล้องเพื่อใช้สแกนซีล');
                return;
            }
        }
        setIsScanning(true);
    };

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (!isScanning) return;

        let sealNumber = data;
        if (sealNumber.toLowerCase().startsWith("pea ")) {
            sealNumber = sealNumber.slice(4);
        }

        setIsScanning(false);

        if (scannedSeals.find(s => s.seal_number === sealNumber)) {
            Alert.alert('แจ้งเตือน', `ซีล ${sealNumber} อยู่ในรายการแล้ว`);
            return;
        }

        try {
            const response = await TechnicianService.checkReturnableSeal(sealNumber);
            setScannedSeals(prev => [response.seal, ...prev]);
        } catch (error: any) {
            Alert.alert('ไม่สามารถคืนได้', error.message || `ไม่พบซีล ${sealNumber} หรือซีลนี้ไม่อยู่ในเงื่อนไขการคืน`);
        }
    };

    const renderSealItem = ({ item }: { item: Seal }) => (
        <TouchableOpacity style={styles.sealCard} onPress={() => openReturnModal(item)}>
            <View style={styles.sealInfo}>
                <Ionicons name="cube-outline" size={24} color="#6A0DAD" />
                <View style={styles.sealDetails}>
                    <Text style={styles.sealNumber}>{item.seal_number}</Text>
                    <Text style={styles.sealStatus}>สถานะปัจจุบัน: {item.status}</Text>
                </View>
            </View>
            <View style={styles.returnButton}>
                <Text style={styles.returnButtonText}>คืนซีล</Text>
                <Ionicons name="chevron-forward" size={16} color="#fff" />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header Section */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <SafeAreaView edges={[]} style={styles.headerContent}>
                    <Text style={styles.headerTitle}>คืนซีล</Text>
                    <Text style={styles.headerSubtitle}>เลือกซีลที่ต้องการส่งคืนคลังหรือชำรุด</Text>
                </SafeAreaView>
            </View>

            {/* Content Section */}
            {isScanning ? (
                <View style={styles.scannerContainer}>
                    <CameraView
                        style={StyleSheet.absoluteFillObject}
                        facing="back"
                        onBarcodeScanned={handleBarcodeScanned}
                        barcodeScannerSettings={{
                            barcodeTypes: ["qr", "aztec", "codabar", "code39", "code93", "code128", "datamatrix", "ean13", "ean8", "itf14", "pdf417", "upc_a", "upc_e"],
                        }}
                    />
                    <View style={[styles.scannerOverlay, { bottom: 80 + insets.bottom }]}>
                        <Text style={styles.scannerText}>จัดบาร์โค้ดให้อยู่ในกรอบ</Text>
                        <TouchableOpacity style={styles.cancelScanBtn} onPress={() => setIsScanning(false)}>
                            <Text style={styles.cancelScanBtnText}>ยกเลิกการสแกน</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={[styles.body, { paddingBottom: 80 + insets.bottom }]}>
                    <TouchableOpacity style={styles.scanNewSealBtn} onPress={startScan}>
                        <Ionicons name="scan-outline" size={24} color="#fff" />
                        <Text style={styles.scanNewSealBtnText}>สแกนซีลที่ต้องการคืน</Text>
                    </TouchableOpacity>

                    {isLoading ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#6A0DAD" />
                            <Text style={styles.loadingText}>กำลังโหลดข้อมูลอ้างอิง...</Text>
                        </View>
                    ) : scannedSeals.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Ionicons name="qr-code-outline" size={60} color="#ccc" />
                            <Text style={styles.emptyText}>กรุณาสแกนซีลเพื่อทำรายการคืน</Text>
                        </View>
                    ) : (
                        <FlatList
                            data={scannedSeals}
                            renderItem={renderSealItem}
                            keyExtractor={item => item.id.toString()}
                            contentContainerStyle={styles.listContainer}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            )}

            {/* Return Modal */}
            <Modal visible={isModalVisible} animationType="slide" transparent={true}>
                <View style={[styles.modalOverlay, { paddingTop: insets.top }]}>
                    <View style={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>ยืนยันการคืนซีล</Text>
                            <TouchableOpacity onPress={closeReturnModal}>
                                <Ionicons name="close" size={28} color="#333" />
                            </TouchableOpacity>
                        </View>

                        {selectedSeal && (
                            <View style={styles.selectedSealInfo}>
                                <Text style={styles.selectedSealLabel}>หมายเลขซีล:</Text>
                                <Text style={styles.selectedSealNumber}>{selectedSeal.seal_number}</Text>
                            </View>
                        )}

                        <Text style={styles.inputLabel}>เหตุผลการคืน <Text style={styles.required}>*</Text></Text>
                        <View style={styles.reasonContainer}>
                            {RETURN_REASONS.map((r, index) => {
                                const isInstalled = selectedSeal?.status === 'ติดตั้งแล้ว';
                                const isOldSealReason = r === 'ซีลเก่าที่ถูกตัดออก';

                                // Disable logic
                                let isDisabled = false;
                                if (isInstalled && !isOldSealReason) {
                                    isDisabled = true; // Installed seals must use 'ซีลเก่าที่ถูกตัดออก'
                                } else if (!isInstalled && isOldSealReason) {
                                    isDisabled = true; // Non-installed seals cannot use 'ซีลเก่าที่ถูกตัดออก'
                                }

                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.reasonChip,
                                            reason === r && styles.reasonChipActive,
                                            isDisabled && styles.reasonChipDisabled
                                        ]}
                                        onPress={() => !isDisabled && setReason(r)}
                                        disabled={isDisabled}
                                    >
                                        <Text style={[
                                            styles.reasonChipText,
                                            reason === r && styles.reasonChipTextActive,
                                            isDisabled && styles.reasonChipTextDisabled
                                        ]}>{r}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        <Text style={styles.inputLabel}>รูปภาพหลักฐาน (ถ้ามี)</Text>
                        {photoUri ? (
                            <View style={styles.photoContainer}>
                                <Image source={{ uri: photoUri }} style={styles.previewPhoto} />
                                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => setPhotoUri(null)}>
                                    <Ionicons name="trash" size={20} color="#fff" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                                <Ionicons name="camera-outline" size={32} color="#6A0DAD" />
                                <Text style={styles.addPhotoText}>ถ่ายรูปหลักฐาน</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                            onPress={handleSubmitReturn}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.submitButtonText}>ยืนยันการคืนซีล</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Custom Footer */}
            <View style={[styles.footerContainer, { paddingBottom: insets.bottom, height: 70 + insets.bottom }]}>
                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Home')}>
                    <Ionicons name="home-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>หน้าหลัก</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('History')}>
                    <Ionicons name="time-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>ประวัติ</Text>
                </TouchableOpacity>

                <View style={styles.footerSpace} />

                <TouchableOpacity style={styles.footerItem}>
                    <Ionicons name="arrow-undo" size={24} color="#6A0DAD" />
                    <Text style={[styles.footerText, styles.activeFooterText]}>คืนซีล</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.footerItem} onPress={() => navigation.navigate('Notification')}>
                    <Ionicons name="notifications-outline" size={24} color="#BDBDBD" />
                    <Text style={styles.footerText}>แจ้งเตือน</Text>
                </TouchableOpacity>
            </View>

            {/* Floating Scan Button */}
            <TouchableOpacity
                style={[styles.scanButton, { bottom: 25 + insets.bottom }]}
                onPress={() => navigation.navigate('Scan')}
                activeOpacity={0.9}
            >
                <View style={styles.scanIconContainer}>
                    <Ionicons name="qr-code-outline" size={28} color="#fff" />
                    <Text style={styles.scanButtonText}>สแกนเริ่มงาน</Text>
                </View>
            </TouchableOpacity>
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
    headerContent: { alignItems: 'center', paddingHorizontal: 20 },
    headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
    headerSubtitle: { color: '#E0B0FF', fontSize: 14 },
    body: { flex: 1, marginTop: 10, paddingHorizontal: 16 },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#666',
        fontSize: 16,
    },
    emptyText: {
        marginTop: 16,
        color: '#999',
        fontSize: 16,
    },
    scanNewSealBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#6A0DAD',
        paddingVertical: 14,
        borderRadius: 16,
        marginBottom: 16,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    scanNewSealBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    scannerContainer: {
        flex: 1,
        backgroundColor: '#000',
    },
    scannerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 80,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 40,
    },
    scannerText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
        marginTop: 40,
    },
    cancelScanBtn: {
        backgroundColor: '#F44336',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
    },
    cancelScanBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    listContainer: {
        paddingBottom: 20,
        paddingTop: 10,
    },
    sealCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    sealInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    sealDetails: {
        marginLeft: 16,
    },
    sealNumber: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    sealStatus: {
        fontSize: 14,
        color: '#666',
    },
    returnButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F44336',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },
    returnButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 12,
        marginRight: 4,
    },
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
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
    },
    selectedSealInfo: {
        backgroundColor: '#F3E5F5',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    selectedSealLabel: {
        fontSize: 16,
        color: '#666',
        marginRight: 8,
    },
    selectedSealNumber: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#6A0DAD',
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 12,
    },
    required: {
        color: '#F44336',
    },
    reasonContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 24,
    },
    reasonChip: {
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    reasonChipActive: {
        backgroundColor: '#6A0DAD',
        borderColor: '#6A0DAD',
    },
    reasonChipDisabled: {
        backgroundColor: '#f5f5f5',
        borderColor: '#eeeeee',
        opacity: 0.5,
    },
    reasonChipText: {
        color: '#666',
        fontSize: 14,
    },
    reasonChipTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    reasonChipTextDisabled: {
        color: '#ccc',
    },
    addPhotoBtn: {
        borderWidth: 2,
        borderColor: '#E0B0FF',
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        backgroundColor: '#fafafa',
    },
    addPhotoText: {
        marginTop: 12,
        color: '#6A0DAD',
        fontWeight: 'bold',
        fontSize: 16,
    },
    photoContainer: {
        width: '100%',
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 30,
        position: 'relative',
    },
    previewPhoto: {
        width: '100%',
        height: '100%',
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'rgba(244, 67, 54, 0.9)',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButton: {
        backgroundColor: '#4CAF50',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    submitButtonDisabled: {
        backgroundColor: '#9E9E9E',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    footerContainer: {
        position: 'absolute', bottom: 0, left: 0, right: 0, height: 70,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20, borderTopRightRadius: 20,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 20,
        elevation: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 8,
    },
    footerItem: { alignItems: 'center', justifyContent: 'center', width: 60 },
    footerText: { fontSize: 10, color: '#BDBDBD', marginTop: 4 },
    activeFooterText: { color: '#6A0DAD', fontWeight: 'bold' },
    footerSpace: { width: 60 },
    scanButton: {
        position: 'absolute', bottom: 25, alignSelf: 'center',
        width: 75, height: 80, borderRadius: 35,
        backgroundColor: '#FBC02D', justifyContent: 'center', alignItems: 'center',
        elevation: 10, shadowColor: '#FBC02D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 5,
        borderWidth: 4, borderColor: '#f5f5f5',
    },
    scanIconContainer: { alignItems: 'center', justifyContent: 'center' },
    scanButtonText: { color: '#fff', fontSize: 8, fontWeight: 'bold', marginTop: 2 }
});
