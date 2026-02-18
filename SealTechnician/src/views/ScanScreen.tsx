import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { CameraView } from 'expo-camera';
import { useScanViewModel } from '../viewmodels/useScanViewModel';

export default function ScanScreen() {
    const {
        permission,
        requestPermission,
        scanned,
        scanResult,
        handleBarcodeScanned,
        resetScan
    } = useScanViewModel();

    if (!permission) {
        // Camera permissions are still loading.
        return <View />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.container}>
                <Text style={styles.message}>We need your permission to show the camera</Text>
                <Button onPress={requestPermission} title="grant permission" />
            </View>
        );
    }

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
                <Text style={styles.result} numberOfLines={2}>{scanResult?.data ?? 'No Data'}</Text>
                {scanned && (
                    <Button title="Scan Again" onPress={resetScan} />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
    },
    message: {
        textAlign: 'center',
        paddingBottom: 10,
    },
    camera: {
        flex: 1,
    },
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    footer: { position: 'absolute', left: 0, right: 0, bottom: 20, padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
    label: { color: '#fff', fontSize: 14, marginBottom: 6 },
    result: { color: '#0f0', fontSize: 16, marginBottom: 8 }
});
