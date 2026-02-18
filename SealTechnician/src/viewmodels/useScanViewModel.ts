import { useState } from 'react';
import { useCameraPermissions } from 'expo-camera';
import { ScanModel } from '../models/ScanModel';

export const useScanViewModel = () => {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanResult, setScanResult] = useState<ScanModel | null>(null);

    const handleBarcodeScanned = ({ data }: { data: string }) => {
        setScanned(true);
        setScanResult({
            data,
            timestamp: Date.now(),
        });
    };

    const resetScan = () => {
        setScanned(false);
        setScanResult(null);
    };

    return {
        permission,
        requestPermission,
        scanned,
        scanResult,
        handleBarcodeScanned,
        resetScan,
    };
};
