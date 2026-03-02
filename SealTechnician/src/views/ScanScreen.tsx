import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ActivityIndicator, Image, TextInput, Keyboard, Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as SecureStore from 'expo-secure-store';

import { parseJwt } from '../utils/jwt';

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scannedSealNumber, setScannedSealNumber] = useState<string | null>(null);
    const [scanMode, setScanMode] = useState<'barcode' | 'ocr'>('barcode');
    const [manualInput, setManualInput] = useState('');
    const [isTakingPhoto, setIsTakingPhoto] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [result, setResult] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const [keyboardHeightAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    useEffect(() => {
        const keyboardWillShowListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                // On Android, sometimes the first keyboard event includes the system navigation bar height in `endCoordinates.height`.
                // If we also use `insets.bottom` on our container, we're double-counting that space.
                // We subtract the inset on Android so it only pushes the *actual* keyboard difference.
                const adjustHeight = Platform.OS === 'android' ? e.endCoordinates.height - insets.bottom : e.endCoordinates.height;

                Animated.timing(keyboardHeightAnim, {
                    toValue: Math.max(0, adjustHeight), // Ensure it doesn't go negative
                    duration: 200,
                    useNativeDriver: false,
                }).start();
            }
        );
        const keyboardWillHideListener = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                Animated.timing(keyboardHeightAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                }).start();
            }
        );

        return () => {
            keyboardWillHideListener.remove();
            keyboardWillShowListener.remove();
        };
    }, [insets.bottom]);

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

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);

        let sealNumber = data;
        if (sealNumber.toLowerCase().startsWith("pea ")) {
            sealNumber = sealNumber.slice(4);
        }

        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) {
                Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลประจำตัว กรุณาเข้าสู่ระบบใหม่", [
                    { text: "ตกลง", onPress: resetScan }
                ], { cancelable: false });
                return;
            }

            // ✅ เช็คซีลกับ backend ทันที (ตรวจสอบสถานะ + ความเป็นเจ้าของ)
            const response = await fetch(getApiUrl(`/check-seal/${sealNumber}`), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const checkResult = await response.json();

            if (!response.ok) {
                // Backend จะส่ง error message ภาษาไทยมาให้ (เช่น ซีลนี้ได้ถูกใช้งานไปแล้ว)
                Alert.alert("ไม่สามารถใช้งานได้", checkResult.error || "เกิดข้อผิดพลาดในการตรวจสอบ", [
                    { text: "ตกลง", onPress: resetScan }
                ], { cancelable: false });
                return;
            }

            // ✅ ซีลผ่านการตรวจสอบ → ไปหน้าถ่ายรูป
            setScannedSealNumber(sealNumber);

        } catch (error) {
            console.error("Error validating seal:", error);
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", [
                { text: "ตกลง", onPress: resetScan }
            ], { cancelable: false });
            return;
        }
    };

    const resetScan = () => {
        setScanned(false);
        setScannedSealNumber(null);
        setPhotoUri(null);
        setResult(null);
        setScanMode('barcode');
        setManualInput('');
    };

    const handleManualSubmit = async () => {
        if (!manualInput.trim()) {
            Alert.alert('แจ้งเตือน', 'กรุณากรอกหมายเลขซีล');
            return;
        }

        let sealNumber = manualInput.trim().toUpperCase();
        if (sealNumber.startsWith("PEA ")) {
            sealNumber = sealNumber.slice(4);
        } else if (sealNumber.startsWith("PEA")) {
            sealNumber = sealNumber.replace(/^PEA\s*/i, "");
        }

        setScanned(true);

        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) {
                Alert.alert("ข้อผิดพลาด", "ไม่พบข้อมูลประจำตัว กรุณาเข้าสู่ระบบใหม่", [
                    { text: "ตกลง", onPress: resetScan }
                ], { cancelable: false });
                return;
            }

            const response = await fetch(getApiUrl(`/check-seal/${sealNumber}`), {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const checkResult = await response.json();

            if (!response.ok) {
                Alert.alert("ไม่สามารถใช้งานได้", checkResult.error || "เกิดข้อผิดพลาดในการตรวจสอบ", [
                    { text: "ตกลง", onPress: resetScan }
                ], { cancelable: false });
                return;
            }

            setScannedSealNumber(sealNumber);
            setManualInput('');

        } catch (error) {
            console.error("Error validating seal:", error);
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้", [
                { text: "ตกลง", onPress: resetScan }
            ], { cancelable: false });
            return;
        }
    };

    const processOcrImage = async (uri: string) => {
        setResult({ message: "กำลังอ่านข้อความจากรูปภาพ...", type: 'info' });

        try {
            // ย่อขนาดรูปภาพก่อนส่งไป OCR (เพื่อไม่ให้หนักเกิน Free Tier API)
            const manipulatedImage = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 800 } }],
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );

            const formData = new FormData();
            formData.append('language', 'eng');
            formData.append('isOverlayRequired', 'false');
            formData.append('scale', 'true');
            formData.append('detectOrientation', 'true');

            const filename = manipulatedImage.uri.split('/').pop() || 'ocr_image.jpg';
            const match = /\.(\w+)$/.exec(filename);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            // ส่งเป็น File แทน Base64 เพื่อป้องกันปัญหา Timeout และทำงานได้เร็วขึ้น
            formData.append('file', {
                uri: manipulatedImage.uri,
                name: filename,
                type: type,
            } as any);

            // ส่งรูปไปที่ OCR.space API ฟรี (จำกัดที่ 25000 requests / เดือน)
            const response = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: {
                    'apikey': 'helloworld', // ใส่รหัส API Key ของ OCR.space ที่นี่
                    // ไม่ต้องใส่ Content-Type เดี๋ยว fetch จะจัดการ boundary ให้เอง
                },
                body: formData,
            });

            const responseText = await response.text();
            console.log("OCR Response Text:", responseText); // Debug: ดูค่าที่ตอบกลับมา

            const jsonResponse = JSON.parse(responseText);

            if (jsonResponse.IsErroredOnProcessing) {
                setResult({ message: "อ่านรูปภาพไม่สำเร็จ กรุณาลองใหม่", type: 'error' });
                return;
            }

            const parsedText = jsonResponse.ParsedResults?.[0]?.ParsedText || "";
            if (!parsedText.trim()) {
                setResult({ message: "ไม่พบข้อความในรูปภาพ กรุณาถ่ายให้ชัดเจนขึ้น", type: 'warning' });
                return;
            }

            // ค้นหาตัวอักษรภาษาอังกฤษนำหน้า (ถ้ามี) ตามด้วยตัวเลข (เช่น T256901000049 หรือแค่ตัวเลข 7256901000049) 
            // โดยให้ครอบคลุมกรณีที่มีคำว่า PEA นำหน้าด้วย
            const matches = parsedText.match(/(?:PEA[\s-]*)?([A-Za-z]?\d{4,15})/i);

            if (matches && matches[1]) {
                let detectedSeal = matches[1].toUpperCase().trim();

                // ตัดคำว่า PEA หรือ pea ออกถ้าหากติดมาด้วย (เช่นในกรณีที่ OCR อ่านติดกันเป็น PEAT2569...)
                if (detectedSeal.startsWith("PEA")) {
                    detectedSeal = detectedSeal.replace(/^PEA\s*/i, "");
                }

                setResult({ message: `พบหมายเลขซีล: ${detectedSeal}\nกำลังตรวจสอบ...`, type: 'info' });

                // ตรวจสอบกับ Backend ด้วยหมายเลขซีลที่หาเจอ
                const token = await SecureStore.getItemAsync('userToken');
                const checkResponse = await fetch(getApiUrl(`/check-seal/${detectedSeal}`), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const checkResult = await checkResponse.json();
                if (!checkResponse.ok) {
                    // Explicitly handle 409 if needed, otherwise the generic error message from backend will be used.
                    // The backend is expected to send a specific error message for 409 (e.g., "ซีลนี้ได้ถูกใช้งานไปแล้ว")
                    Alert.alert("ไม่สามารถใช้งานได้", checkResult.error || "เกิดข้อผิดพลาดในการตรวจสอบ", [
                        { text: "ตกลง", onPress: resetScan }
                    ], { cancelable: false });
                    return;
                }

                setScannedSealNumber(detectedSeal);
                setResult(null); // ล้างแจ้งเตือน info
            } else {
                setResult({ message: "ไม่พบหมายเลขซีลในรูปภาพ หรือถ่ายไม่ชัด", type: 'warning' });
            }

        } catch (error) {
            console.error("OCR Error:", error);
            setResult({ message: "เกิดข้อผิดพลาดในการประมวลผลรูปภาพ", type: 'error' });
        }
    };

    const takePhotoOCR = async () => {
        if (!cameraRef.current) return;
        setIsTakingPhoto(true);
        try {
            const photo = await cameraRef.current.takePictureAsync();
            if (photo) {
                setScanned(true); // ปิดการแสกนชั่วคราว
                setPhotoUri(photo.uri); // เก็บรูปไว้เป็นหลักฐานเพื่อติดตั้ง
                await processOcrImage(photo.uri);
            }
        } catch (error) {
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถถ่ายรูปได้", [
                { text: "ตกลง", onPress: resetScan }
            ], { cancelable: false });
        } finally {
            setIsTakingPhoto(false);
        }
    };

    const takePhoto = async () => {
        if (!cameraRef.current) return;
        setIsTakingPhoto(true);
        try {
            const photo = await cameraRef.current.takePictureAsync();
            if (photo) {
                setPhotoUri(photo.uri);
            }
        } catch (error) {
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถถ่ายรูปได้", [
                { text: "ตกลง", onPress: resetScan }
            ], { cancelable: false });
        } finally {
            setIsTakingPhoto(false);
        }
    };

    const retakePhoto = () => {
        setPhotoUri(null);
    };

    const confirmInstall = () => {
        if (scannedSealNumber && photoUri) {
            processScan(scannedSealNumber, photoUri);
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

            // Retrieve the token from SecureStore to send to the secure backend route
            const token = await SecureStore.getItemAsync('userToken');

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.SCAN_SEAL), {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
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

    const renderModeSelector = () => (
        <View style={[styles.modeSelectorContainer, { top: insets.top + 20 }]}>
            <View style={styles.modeSelector}>
                <TouchableOpacity
                    style={[styles.modeButton, scanMode === 'barcode' && styles.modeButtonActive]}
                    onPress={() => setScanMode('barcode')}
                >
                    <Ionicons name="barcode-outline" size={20} color={scanMode === 'barcode' ? '#000' : '#fff'} />
                    <Text style={[styles.modeText, scanMode === 'barcode' && styles.modeTextActive]}>สแกนโค้ด</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.modeButton, scanMode === 'ocr' && styles.modeButtonActive]}
                    onPress={() => setScanMode('ocr')}
                >
                    <Ionicons name="camera-outline" size={20} color={scanMode === 'ocr' ? '#000' : '#fff'} />
                    <Text style={[styles.modeText, scanMode === 'ocr' && styles.modeTextActive]}>ถ่ายรูป (อ่านเลข)</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                onBarcodeScanned={(scanned || scanMode === 'ocr') ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "aztec", "codabar", "code39", "code93", "code128", "datamatrix", "ean13", "ean8", "itf14", "pdf417", "upc_a", "upc_e"],
                }}
            />

            {!scanned && renderModeSelector()}

            {/* ช่องกรอกเลขเอง แสดงเฉพาะโหมด barcode และยังไม่ได้สแกน */}
            {scanMode === 'barcode' && !scanned && !result && (
                <Animated.View
                    style={[
                        styles.manualInputFloatingWrapper,
                        { transform: [{ translateY: Animated.multiply(keyboardHeightAnim, -1) }] }
                    ]}
                >
                    <View style={[styles.manualInputFloatingContainer, { paddingBottom: 20 + insets.bottom }]}>
                        <View style={styles.manualInputRow}>
                            <TextInput
                                style={styles.manualInputFloatingField}
                                placeholder="หรือกรอกเลขซีลเองที่นี่..."
                                placeholderTextColor="#666"
                                value={manualInput}
                                onChangeText={setManualInput}
                                autoCapitalize="characters"
                                autoCorrect={false}
                            />
                            <TouchableOpacity style={styles.manualSubmitSmallButton} onPress={handleManualSubmit}>
                                <Ionicons name="send" size={20} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            )}

            {scannedSealNumber && !photoUri && !result && (
                <View style={[styles.photoCaptureOverlay, { paddingBottom: 50 + insets.bottom }]}>
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

            {/* ปุ่มถ่ายรูปโหมด OCR ถ้าเลือก OCR Mode และยังไม่ได้สแกน */}
            {scanMode === 'ocr' && !scanned && !result && (
                <View style={[styles.ocrCaptureControls, { paddingBottom: 50 + insets.bottom }]}>
                    <TouchableOpacity
                        style={styles.captureButton}
                        onPress={takePhotoOCR}
                        disabled={isTakingPhoto}
                    >
                        {isTakingPhoto ? (
                            <ActivityIndicator color="#000" size="large" />
                        ) : (
                            <View style={styles.captureButtonInner} />
                        )}
                    </TouchableOpacity>
                    <Text style={styles.ocrInstructionText}>ถ่ายรูปหมายเลขซีลให้ชัดเจน</Text>
                </View>
            )}

            {/* ✅ Photo Preview ก่อนยืนยัน */}
            {photoUri && !result && (
                <View style={styles.previewOverlay}>
                    <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                    <View style={styles.previewHeader}>
                        <Text style={styles.previewTitle}>ตรวจสอบรูปภาพ</Text>
                        <Text style={styles.previewSubtitle}>ซีลเบอร์: {scannedSealNumber}</Text>
                    </View>
                    <View style={[styles.previewControls, { paddingBottom: insets.bottom }]}>
                        <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
                            <Text style={styles.retakeText}>ถ่ายใหม่</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmButton} onPress={confirmInstall}>
                            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                            <Text style={styles.confirmText}>ยืนยันติดตั้ง</Text>
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
    modeSelectorContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 5,
    },
    modeSelector: {
        flexDirection: 'row',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderRadius: 30,
        padding: 4,
    },
    modeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 26,
        gap: 6,
    },
    modeButtonActive: {
        backgroundColor: '#fff',
    },
    modeText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    modeTextActive: {
        color: '#000',
    },
    ocrCaptureControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingTop: 30,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    ocrInstructionText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 15,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
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
    previewOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#000',
        justifyContent: 'space-between',
        zIndex: 10,
    },
    previewImage: {
        flex: 1,
        width: '100%',
    },
    previewHeader: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 11,
    },
    previewTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: 'bold',
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    previewSubtitle: {
        color: '#eee',
        fontSize: 16,
        marginTop: 4,
        textShadowColor: 'rgba(0,0,0,0.7)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 4,
    },
    previewControls: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        paddingHorizontal: 20,
        zIndex: 11,
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 8,
    },
    retakeText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    confirmButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#4CAF50',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 30,
        gap: 8,
    },
    confirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    manualInputFloatingWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 4,
    },
    manualInputFloatingContainer: {
        paddingHorizontal: 20,
    },
    manualInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 30,
        paddingHorizontal: 15,
        paddingVertical: 10,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    manualInputFloatingField: {
        flex: 1,
        fontSize: 16,
        color: '#000',
        paddingVertical: 8,
    },
    manualSubmitSmallButton: {
        backgroundColor: '#007AFF',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
});
