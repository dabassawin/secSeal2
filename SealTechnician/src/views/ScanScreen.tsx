import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Alert, ActivityIndicator, Image, TextInput, Platform, KeyboardAvoidingView, ScrollView } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import * as SecureStore from 'expo-secure-store';

import { parseJwt } from '../utils/jwt';

// ─── ขั้นตอนการทำงาน ──────────────────────────────────────────────────────────
// 1. 'scan'   → สแกน / ถ่ายรูป / กรอกเลขซีล
// 2. 'photo'  → ถ่ายรูปซีล (หลักฐานการติดตั้งซีล)
// 3. 'meter'  → กรอกเลขมิเตอร์ + ถ่ายรูปมิเตอร์ (optional)
// 4. 'result' → แสดงผลลัพธ์
// ─────────────────────────────────────────────────────────────────────────────

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scannedSealNumber, setScannedSealNumber] = useState<string | null>(null);
    const [scanMode, setScanMode] = useState<'barcode' | 'ocr'>('barcode');
    const [manualInput, setManualInput] = useState('');
    const [isTakingPhoto, setIsTakingPhoto] = useState(false);
    const [photoUri, setPhotoUri] = useState<string | null>(null);      // รูปซีล (image1)
    const [result, setResult] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);
    const cameraRef = useRef<CameraView>(null);
    const [fadeAnim] = useState(new Animated.Value(0));
    const insets = useSafeAreaInsets();

    // ─── ขั้นตอนมิเตอร์ ──────────────────────────────────────────────────────
    const [step, setStep] = useState<'scan' | 'photo' | 'meter' | 'result'>('scan');
    const [meterSerial, setMeterSerial] = useState('');          // เลขมิเตอร์
    const [meterPhotoUri, setMeterPhotoUri] = useState<string | null>(null);  // รูปมิเตอร์ (image1)
    const [isTakingMeterPhoto, setIsTakingMeterPhoto] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    // ─────────────────────────────────────────────────────────────────────────

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

            const response = await fetch(getApiUrl(`/check-seal/${sealNumber}`), {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const checkResult = await response.json();

            if (!response.ok) {
                Alert.alert("ไม่สามารถใช้งานได้", checkResult.error || "เกิดข้อผิดพลาดในการตรวจสอบ", [
                    { text: "ตกลง", onPress: resetScan }
                ], { cancelable: false });
                return;
            }

            setScannedSealNumber(sealNumber);
            setStep('photo');

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
        setMeterPhotoUri(null);
        setMeterSerial('');
        setResult(null);
        setScanMode('barcode');
        setManualInput('');
        setStep('scan');
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
                headers: { 'Authorization': `Bearer ${token}` }
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
            setStep('photo');

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

            formData.append('file', {
                uri: manipulatedImage.uri,
                name: filename,
                type: type,
            } as any);

            const response = await fetch('https://api.ocr.space/parse/image', {
                method: 'POST',
                headers: {
                    'apikey': 'helloworld',
                },
                body: formData,
            });

            const responseText = await response.text();
            console.log("OCR Response Text:", responseText);

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

            const matches = parsedText.match(/(?:PEA[\s-]*)?([A-Za-z]?\d{4,15})/i);

            if (matches && matches[1]) {
                let detectedSeal = matches[1].toUpperCase().trim();

                if (detectedSeal.startsWith("PEA")) {
                    detectedSeal = detectedSeal.replace(/^PEA\s*/i, "");
                }

                setResult({ message: `พบหมายเลขซีล: ${detectedSeal}\nกำลังตรวจสอบ...`, type: 'info' });

                const token = await SecureStore.getItemAsync('userToken');
                const checkResponse = await fetch(getApiUrl(`/check-seal/${detectedSeal}`), {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                const checkResult = await checkResponse.json();
                if (!checkResponse.ok) {
                    Alert.alert("ไม่สามารถใช้งานได้", checkResult.error || "เกิดข้อผิดพลาดในการตรวจสอบ", [
                        { text: "ตกลง", onPress: resetScan }
                    ], { cancelable: false });
                    return;
                }

                setScannedSealNumber(detectedSeal);
                setResult(null);
                setStep('photo');
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
                setScanned(true);
                setPhotoUri(photo.uri);
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

    // ถ่ายรูปซีล (image1 = หลักฐานซีล)
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

    // ถ่ายรูปมิเตอร์
    const takeMeterPhoto = async () => {
        if (!cameraRef.current) return;
        setIsTakingMeterPhoto(true);
        try {
            const photo = await cameraRef.current.takePictureAsync();
            if (photo) {
                setMeterPhotoUri(photo.uri);
            }
        } catch (error) {
            Alert.alert("ข้อผิดพลาด", "ไม่สามารถถ่ายรูปได้");
        } finally {
            setIsTakingMeterPhoto(false);
        }
    };

    const retakePhoto = () => {
        setPhotoUri(null);
    };

    const retakeMeterPhoto = () => {
        setMeterPhotoUri(null);
    };

    // กดยืนยันรูปซีล → ไปขั้นตอนมิเตอร์
    const confirmSealPhoto = () => {
        setStep('meter');
    };

    // ยืนยันส่งข้อมูลทั้งหมด
    const confirmInstall = () => {
        if (!meterSerial.trim()) {
            Alert.alert('แจ้งเตือน', 'กรุณากรอกเลขมิเตอร์');
            return;
        }
        if (scannedSealNumber) {
            processScan(scannedSealNumber, photoUri || undefined, meterSerial.trim(), meterPhotoUri || undefined);
        }
    };

    const processScan = async (
        sealNumber: string,
        sealPhotoUri?: string,
        serialNumber?: string,
        meterPhoto?: string
    ) => {
        setIsSubmitting(true);
        setResult({ message: "กำลังบันทึกข้อมูล...", type: 'info' });
        setStep('result');

        try {
            const formData = new FormData();
            formData.append('seal_number', sealNumber);

            // รูปซีล → image (บันทึกใน image1)
            if (sealPhotoUri) {
                const filename = sealPhotoUri.split('/').pop() || 'seal_photo.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('image', { uri: sealPhotoUri, name: filename, type } as any);
            }

            // เลขมิเตอร์ → serial_number (บันทึกใน installed_serial)
            if (serialNumber) {
                formData.append('serial_number', serialNumber);
            }

            // รูปมิเตอร์ → meter_image (บันทึกใน image2)
            if (meterPhoto) {
                const filename = meterPhoto.split('/').pop() || 'meter_photo.jpg';
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image/jpeg`;
                formData.append('meter_image', { uri: meterPhoto, name: filename, type } as any);
            }

            const token = await SecureStore.getItemAsync('userToken');

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.SCAN_SEAL), {
                method: 'POST',
                body: formData,
                headers: {
                    'Accept': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
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
        } finally {
            setIsSubmitting(false);
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

    // ─── ขั้นตอนที่ 3: กรอกข้อมูลมิเตอร์ ─────────────────────────────────────
    const renderMeterStep = () => (
        // ถ้ายังไม่ได้ถ่ายรูปมิเตอร์ → ใช้ transparent เพื่อให้กล้องด้านหลังโชว์ผ่านได้
        <View style={[styles.meterOverlay, { backgroundColor: meterPhotoUri ? '#f5f5f5' : 'transparent' }]}>
            {/* ─── กล้องสำหรับถ่ายรูปมิเตอร์ ─── */}
            {!meterPhotoUri ? (
                <>
                    <View style={[styles.meterHeader, { paddingTop: insets.top + 16 }]}>
                        <Text style={styles.meterHeaderTitle}>ถ่ายรูปมิเตอร์ที่ติดซีลนี้</Text>
                        <Text style={styles.meterHeaderSeal}>ซีล: {scannedSealNumber}</Text>
                    </View>

                    <View style={[styles.meterCaptureControls, { paddingBottom: 40 + insets.bottom }]}>
                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={takeMeterPhoto}
                            disabled={isTakingMeterPhoto}
                        >
                            {isTakingMeterPhoto ? (
                                <ActivityIndicator color="#000" size="large" />
                            ) : (
                                <View style={styles.captureButtonInner} />
                            )}
                        </TouchableOpacity>
                        <Text style={styles.ocrInstructionText}>ถ่ายรูปมิเตอร์ให้ชัดเจน</Text>
                        <TouchableOpacity
                            style={styles.skipMeterPhotoButton}
                            onPress={() => setMeterPhotoUri('skip')}
                        >
                            <Text style={styles.skipMeterPhotoText}>ข้ามการถ่ายรูป</Text>
                        </TouchableOpacity>
                    </View>
                </>
            ) : (
                // ─── ดูรูปมิเตอร์ + กรอกเลขมิเตอร์ ───
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={0}
                >
                    <ScrollView contentContainerStyle={styles.meterFormScroll} keyboardShouldPersistTaps="handled">
                        {/* Header */}
                        <View style={[styles.meterFormHeader, { paddingTop: insets.top + 16 }]}>
                            <View style={styles.meterHeaderBadge}>
                                <Ionicons name="speedometer-outline" size={20} color="#fff" />
                                <Text style={styles.meterHeaderTitle}>ยืนยันข้อมูลมิเตอร์</Text>
                            </View>
                            <Text style={styles.meterHeaderSeal}>ซีล: {scannedSealNumber}</Text>
                        </View>

                        {/* รูปมิเตอร์ */}
                        {meterPhotoUri !== 'skip' && (
                            <View style={styles.meterPhotoPreviewBox}>
                                <Image source={{ uri: meterPhotoUri }} style={styles.meterPhotoPreview} resizeMode="cover" />
                                <TouchableOpacity style={styles.retakeMeterBtn} onPress={retakeMeterPhoto}>
                                    <Ionicons name="camera-reverse-outline" size={16} color="#fff" />
                                    <Text style={styles.retakeMeterText}>ถ่ายใหม่</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* รูปซีลที่ถ่ายไว้ */}
                        {photoUri && (
                            <View style={styles.sealPhotoSmallBox}>
                                <Text style={styles.sealPhotoSmallLabel}>📷 รูปซีล</Text>
                                <Image source={{ uri: photoUri }} style={styles.sealPhotoSmall} resizeMode="cover" />
                            </View>
                        )}

                        {/* กรอกเลขมิเตอร์ */}
                        <View style={styles.meterInputSection}>
                            <View style={styles.meterInputLabelRow}>
                                <Ionicons name="create-outline" size={20} color="#6A0DAD" />
                                <Text style={styles.meterInputLabel}>หมายเลขมิเตอร์ *</Text>
                            </View>
                            <TextInput
                                style={styles.meterSerialInput}
                                placeholder="กรอกหมายเลขมิเตอร์..."
                                placeholderTextColor="#aaa"
                                value={meterSerial}
                                onChangeText={setMeterSerial}
                                autoCapitalize="characters"
                                autoCorrect={false}
                                returnKeyType="done"
                            />
                            <Text style={styles.meterInputHint}>หมายเลขนี้จะถูกบันทึกเป็น Serial ของมิเตอร์ที่ติดตั้ง</Text>
                        </View>

                        {/* ปุ่มยืนยัน */}
                        <View style={[styles.meterActions, { paddingBottom: 30 + insets.bottom }]}>
                            <TouchableOpacity style={styles.meterCancelBtn} onPress={resetScan}>
                                <Ionicons name="close-outline" size={20} color="#666" />
                                <Text style={styles.meterCancelText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.meterConfirmBtn, !meterSerial.trim() && styles.meterConfirmBtnDisabled]}
                                onPress={confirmInstall}
                                disabled={!meterSerial.trim() || isSubmitting}
                            >
                                {isSubmitting ? (
                                    <ActivityIndicator color="#fff" size="small" />
                                ) : (
                                    <>
                                        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
                                        <Text style={styles.meterConfirmText}>ยืนยันติดตั้ง</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}
        </View>
    );

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
                onBarcodeScanned={(scanned || scanMode === 'ocr' || step !== 'scan') ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: ["qr", "aztec", "codabar", "code39", "code93", "code128", "datamatrix", "ean13", "ean8", "itf14", "pdf417", "upc_a", "upc_e"],
                }}
            />

            {/* Mode selector แสดงเฉพาะขั้น scan */}
            {step === 'scan' && !scanned && renderModeSelector()}

            {/* ช่องกรอกเลขเอง */}
            {scanMode === 'barcode' && step === 'scan' && !scanned && !result && (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
                    style={styles.manualInputFloatingWrapper}
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
                </KeyboardAvoidingView>
            )}

            {/* ขั้นที่ 2: ถ่ายรูปซีล */}
            {step === 'photo' && scannedSealNumber && !photoUri && !result && (
                <View style={[styles.photoCaptureOverlay, { paddingBottom: 50 + insets.bottom }]}>
                    <View style={styles.photoCaptureHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap' }}>
                            <Text style={styles.photoCaptureTitle} numberOfLines={1} adjustsFontSizeToFit>สแกนซีล {scannedSealNumber}</Text>
                            <Text style={[styles.photoCaptureTitle, { marginLeft: 6 }]}>✅</Text>
                        </View>
                        <Text style={styles.photoCaptureSubtitle}>ถ่ายรูปซีลที่ติดตั้ง (ขั้น 1/2)</Text>
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

            {/* ปุ่มถ่ายรูปโหมด OCR */}
            {scanMode === 'ocr' && step === 'scan' && !scanned && !result && (
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

            {/* Preview รูปซีล → ยืนยันไปขั้นมิเตอร์ */}
            {step === 'photo' && photoUri && !result && (
                <View style={styles.previewOverlay}>
                    <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                    <View style={styles.previewHeader}>
                        <Text style={styles.previewTitle}>ตรวจสอบรูปซีล</Text>
                        <Text style={styles.previewSubtitle}>ขั้นที่ 1/2 — ซีลเบอร์: {scannedSealNumber}</Text>
                    </View>
                    <View style={[styles.previewControls, { paddingBottom: insets.bottom }]}>
                        <TouchableOpacity style={styles.retakeButton} onPress={retakePhoto}>
                            <Ionicons name="camera-reverse-outline" size={22} color="#fff" />
                            <Text style={styles.retakeText}>ถ่ายใหม่</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmButton} onPress={confirmSealPhoto}>
                            <Ionicons name="arrow-forward-circle-outline" size={22} color="#fff" />
                            <Text style={styles.confirmText}>ถัดไป: มิเตอร์</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* ขั้นที่ 3: ข้อมูลมิเตอร์ */}
            {step === 'meter' && renderMeterStep()}

            {/* ผลลัพธ์ */}
            {result && step === 'result' && (
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

                    {result.type !== 'info' && (
                        <TouchableOpacity style={styles.scanAgainButton} onPress={resetScan} activeOpacity={0.85}>
                            <Ionicons name="scan-outline" size={22} color="#fff" />
                            <Text style={styles.scanAgainText}>สแกนอีกครั้ง</Text>
                        </TouchableOpacity>
                    )}
                </Animated.View>
            )}

            {/* OCR processing result (ขณะอยู่ขั้น scan) */}
            {result && step === 'scan' && (
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
        backgroundColor: '#6A0DAD',
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

    // ─── Meter Step Styles ───────────────────────────────────────────────────
    meterOverlay: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 20,
        // backgroundColor จะถูก set เป็น dynamic ตาม state meterPhotoUri
    },
    meterHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 21,
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 12,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    meterHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    meterHeaderTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    meterHeaderSeal: {
        color: '#E0B0FF',
        fontSize: 13,
        fontWeight: '500',
    },
    meterCameraGuide: {
        position: 'absolute',
        top: '40%',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 21,
    },
    meterGuideBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        borderRadius: 16,
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 8,
    },
    meterGuideText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    meterCaptureControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        alignItems: 'center',
        paddingTop: 30,
        zIndex: 21,
    },
    skipMeterPhotoButton: {
        marginTop: 14,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 20,
    },
    skipMeterPhotoText: {
        color: '#ccc',
        fontSize: 14,
    },
    meterFormScroll: {
        flexGrow: 1,
        backgroundColor: '#f5f5f5',
    },
    meterFormHeader: {
        backgroundColor: '#6A0DAD',
        alignItems: 'center',
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
    },
    meterPhotoPreviewBox: {
        margin: 20,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    meterPhotoPreview: {
        width: '100%',
        height: 200,
    },
    retakeMeterBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.55)',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 4,
    },
    retakeMeterText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: 'bold',
    },
    sealPhotoSmallBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 8,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 10,
        elevation: 2,
        gap: 12,
    },
    sealPhotoSmallLabel: {
        fontSize: 13,
        color: '#555',
        fontWeight: '500',
    },
    sealPhotoSmall: {
        width: 60,
        height: 60,
        borderRadius: 8,
    },
    meterInputSection: {
        marginHorizontal: 20,
        marginBottom: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
    },
    meterInputLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    meterInputLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
    },
    meterSerialInput: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#e0e0e0',
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 18,
        color: '#222',
        fontWeight: '600',
        letterSpacing: 1,
        marginBottom: 8,
    },
    meterInputHint: {
        fontSize: 12,
        color: '#999',
    },
    meterActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 20,
        gap: 12,
        marginTop: 8,
    },
    meterCancelBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: '#ddd',
        gap: 6,
    },
    meterCancelText: {
        color: '#666',
        fontSize: 15,
        fontWeight: '600',
    },
    meterConfirmBtn: {
        flex: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#4CAF50',
        borderRadius: 16,
        paddingVertical: 16,
        gap: 8,
        elevation: 3,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
    },
    meterConfirmBtnDisabled: {
        backgroundColor: '#a5d6a7',
        elevation: 0,
        shadowOpacity: 0,
    },
    meterConfirmText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
