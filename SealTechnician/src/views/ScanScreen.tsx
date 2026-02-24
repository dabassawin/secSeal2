import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scannedSealNumber, setScannedSealNumber] = useState<string | null>(null);
    const [isTakingPhoto, setIsTakingPhoto] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [result, setResult] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        if (result) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [result]);

    if (!permission) {
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Ionicons name="camera-outline" size={80} color="#888" />
                <Text style={styles.permissionTitle}>ต้องการเข้าถึงกล้อง</Text>
                <Text style={styles.permissionMessage}>กรุณาอนุญาตให้แอปพลิเคชันเข้าถึงกล้องของคุณ เพื่อใช้ในการสแกนซีล</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>อนุญาตการเข้าถึงกล้อง</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        setScanned(true);

        let sealNumber = data;
        if (sealNumber.toLowerCase().startsWith("pea ")) {
            sealNumber = sealNumber.slice(4);
        }

        setScannedSealNumber(sealNumber);
    };

    const resetScan = () => {
        setScanned(false);
        setScannedSealNumber(null);
        setPhotoUri(null);
        setResult(null);
    };

    const takePhoto = async () => {
        if (!cameraRef.current) return;
        setIsTakingPhoto(true);
        try {
            const photo = await cameraRef.current.takePictureAsync();
            if (photo) {
                setPhotoUri(photo.uri);
                Alert.alert(
                    "ยืนยันการติดตั้งซีล",
                    `ยืนยันการติดตั้งซีล ${scannedSealNumber}`,
                    [
                        {
                            text: "ยกเลิก",
                            style: "cancel",
                            onPress: resetScan
                        },
                        {
                            text: "ยืนยัน",
                            onPress: () => processScan(scannedSealNumber!, photo.uri)
                        }
                    ],
                    { cancelable: false }
                );
            }
        } catch (error) {
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถถ่ายรูปได้");
            resetScan();
        } finally {
            setIsTakingPhoto(false);
        }
    };

    const processScan = async (sealNumber: string, passedPhotoUri?: string) => {
        setResult({ message: "กำลังตรวจสอบ...", type: 'info' });

        try {
            const formData = new FormData();
            formData.append('seal_number', sealNumber);

            const activePhotoUri = passedPhotoUri || photoUri;

            console.log("📸 [ScanScreen] Starting check for photoUri:", activePhotoUri);

            if (activePhotoUri) {
                const filename = activePhotoUri.split('/').pop() || 'photo.jpg';
                const match = /\.(\w+)$/.exec(filename);
                // Important for react native: fallback to jpeg if type cannot be guessed
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                const imageObj = { uri: activePhotoUri, name: filename, type };
                console.log("📸 [ScanScreen] Appending image to formData:", imageObj);

                formData.append('image', imageObj as any);
            }

            console.log("🚀 [ScanScreen] Sending POST request to:", getApiUrl(API_CONFIG.endpoints.SCAN_SEAL));

            // Retrieve the token from AsyncStorage (assuming it's stored there, though ScanAndUse allows userID=0 for now)
            // But we must NOT set Content-Type so fetch appends the multipart boundary automatically.
            const response = await fetch(getApiUrl(API_CONFIG.endpoints.SCAN_SEAL), {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    // DO NOT SET Content-Type manually, let fetch set it with the boundary
                },
            });

            const responseData = await response.json();

            if (response.status === 200) {
                setResult({ message: `${responseData.message}`, type: 'success' });
            } else if (response.status === 409) {
                setResult({ message: `${responseData.error}`, type: 'warning' });
            } else if (response.status === 404) {
                setResult({ message: 'ไม่พบข้อมูล Seal นี้ในระบบ', type: 'error' });
            } else {
                setResult({ message: `${responseData.error || 'Unknown error'}`, type: 'error' });
            }
        } catch (error) {
            setResult({ message: `เครือข่ายขัดข้อง: ${(error as Error).message}`, type: 'error' });
        }
    };



    const getResultColor = (type?: string) => {
        switch (type) {
            case 'success': return '#4CAF50';
            case 'warning': return '#FF9800';
            case 'error': return '#F44336';
            case 'info': return '#2196F3';
            default: return '#333';
        }
    };

    const getResultIcon = (type?: string) => {
        switch (type) {
            case 'success': return 'checkmark-circle';
            case 'warning': return 'warning';
            case 'error': return 'close-circle';
            case 'info': return 'sync-circle';
            default: return 'help-circle';
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "aztec", "codabar", "code39", "code93", "code128", "datamatrix", "ean13", "ean8", "itf14", "pdf417", "upc_a", "upc_e"],
                }}
            />

            {scannedSealNumber && !photoUri && !result && (
                <View style={styles.photoCaptureOverlay}>
                    <View style={styles.photoCaptureHeader}>
                        <Text style={styles.photoCaptureTitle}>สแกนซีล {scannedSealNumber} สำเร็จ</Text>
                        <Text style={styles.photoCaptureSubtitle}>กรุณาถ่ายรูปเพื่อยืนยันการติดตั้ง</Text>
                    </View>
                    <View style={styles.photoCaptureControls}>
                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={takePhoto}
                            disabled={isTakingPhoto}
                        >
                            {isTakingPhoto ? (
                                <ActivityIndicator color="#000" size="large" />
                            ) : (
                                <View style={styles.captureButtonInner} />
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.cancelCaptureButton} onPress={resetScan}>
                            <Text style={styles.cancelCaptureText}>ยกเลิก</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {result && (
                <Animated.View style={[styles.resultContainer, { opacity: fadeAnim, paddingBottom: insets.bottom + 20 }]}>
                    <View style={styles.resultCard}>
                        <View style={[styles.iconContainer, { backgroundColor: getResultColor(result.type) + '15' }]}>
                            <Ionicons name={getResultIcon(result.type) as any} size={36} color={getResultColor(result.type)} />
                        </View>
                        <View style={styles.resultTextContainer}>
                            <Text style={[styles.resultTitle, { color: getResultColor(result.type) }]}>
                                {result.type === 'success' ? 'สำเร็จ' : result.type === 'error' ? 'ไม่สำเร็จ' : result.type === 'warning' ? 'แจ้งเตือน' : 'กำลังประมวลผล...'}
                            </Text>
                            <Text style={styles.resultMessage}>{result.message}</Text>
                        </View>
                    </View>

                    {scanned && result.type !== 'info' && (
                        <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan} activeOpacity={0.85}>
                            <Ionicons name="scan-outline" size={22} color="#fff" />
                            <Text style={styles.scanAgainText}>สแกนอีกครั้ง</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
        ...StyleSheet.absoluteFillObject,
    },
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa',
        padding: 30,
    },
    permissionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        color: '#1a1a1a',
    },
    permissionMessage: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        marginTop: 12,
        marginBottom: 40,
        lineHeight: 24,
    },
    permissionButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        elevation: 3,
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    resultContainer: {
        position: 'absolute',
        bottom: 0,
        left: 20,
        right: 20,
        alignItems: 'center',
    },
    resultCard: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        width: '100%',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        marginBottom: 20,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    resultTextContainer: {
        flex: 1,
    },
    resultTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 6,
    },
    resultMessage: {
        fontSize: 15,
        color: '#555',
        lineHeight: 22,
    },
    scanAgainButton: {
        flexDirection: 'row',
        backgroundColor: '#000',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
    },
    scanAgainText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    photoCaptureOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'space-between',
        paddingVertical: 50,
    },
    photoCaptureHeader: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        padding: 20,
        alignItems: 'center',
        marginHorizontal: 20,
        borderRadius: 15,
        marginTop: 40,
    },
    photoCaptureTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    photoCaptureSubtitle: {
        color: '#ddd',
        fontSize: 16,
    },
    photoCaptureControls: {
        alignItems: 'center',
        marginBottom: 30,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 4,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    captureButtonInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#000',
    },
    cancelCaptureButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    cancelCaptureText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
