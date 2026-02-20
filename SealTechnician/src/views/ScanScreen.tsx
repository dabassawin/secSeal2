import React, { useState } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { API_CONFIG, getApiUrl } from '../config/api.config';

export default function ScanScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [result, setResult] = useState<string | null>(null);

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        setScanned(true);
        // Show a loading/processing message temporarily
        setResult("Processing...");

        let sealNumber = data;
        if (sealNumber.startsWith("PEA ")) {
            sealNumber = sealNumber.slice(4);
        }

        try {
            const response = await fetch(getApiUrl(API_CONFIG.endpoints.SCAN_SEAL), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ seal_number: sealNumber }),
            });

            const responseData = await response.json();

            if (response.status === 200) {
                setResult(`Success: ${responseData.message}`);
            } else if (response.status === 409) {
                setResult(`Warning: ${responseData.error}`);
            } else if (response.status === 404) {
                setResult(`Error: ไม่พบข้อมูล Seal นี้ในระบบ`);
            } else {
                setResult(`Error: ${responseData.error || 'Unknown error'}`);
            }
        } catch (error) {
            setResult(`Network Error: ${(error as Error).message}`);
        }
    };

    return (
        <View style={styles.container}>
            <CameraView
                style={styles.camera}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
                barcodeScannerSettings={{
                    barcodeTypes: [
                        "qr",
                        "aztec",
                        "codabar",
                        "code39",
                        "code93",
                        "code128",
                        "datamatrix",
                        "ean13",
                        "ean8",
                        "itf14",
                        "pdf417",
                        "upc_a",
                        "upc_e"
                    ],
                }}
            />
            <View style={styles.overlay} pointerEvents="none" />
            <View style={styles.footer}>
                <Text style={styles.label}>Scan Result:</Text>
                <Text style={styles.result}>{result ?? 'No Data'}</Text>
                {scanned && (
                    <Button title="Scan Again" onPress={() => { setScanned(false); setResult(null); }} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: '#000',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
        color: '#fff',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    footer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        padding: 26,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    label: {
        color: '#fff',
        fontSize: 14,
        marginBottom: 6,
    },
    result: {
        color: '#0f0',
        fontSize: 16,
        marginBottom: 8,
    }
});
