import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { sealService } from '@/services/sealService';
import { userService } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';
import { SealStatus } from '../../constants/status';
import { generateCreationPDF } from '@/utils/generateCreationPDF';

type EntryMode = 'scan' | 'range';

interface StagedBatch {
    id: string;
    sealNumber: string;
    type: 'Single' | 'Batch';
    count: number;
    status: 'checking' | 'available' | 'unavailable';
    creationStatus: string;
    createRemarks: string;
}

export const CreateSealScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user } = useAuth();

    const canSelectPea = user?.role === 'admin';

    // Data & Loading
    const [loading, setLoading] = useState(false);

    // PEA Selection
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [selectedPea, setSelectedPea] = useState<any | null>(null);
    const [searchPeaQuery, setSearchPeaQuery] = useState('');
    const [showPeaDropdown, setShowPeaDropdown] = useState(false);

    // Seal Entry
    const [entryMode, setEntryMode] = useState<EntryMode>('scan');
    const [singleSealInput, setSingleSealInput] = useState('');
    const [rangeStartInput, setRangeStartInput] = useState('');
    const [rangeCountInput, setRangeCountInput] = useState('');

    // Staging
    const [stagedBatches, setStagedBatches] = useState<StagedBatch[]>([]);

    // Modal
    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    // ประวัติการเบิก
    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [creationHistory, setCreationHistory] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyUserMap, setHistoryUserMap] = useState<Record<number, any>>({});
    const [historySearchText, setHistorySearchText] = useState('');
    const [historyDateFilter, setHistoryDateFilter] = useState('');

    const CREATION_STATUSES = [SealStatus.READY, SealStatus.DAMAGED];

    // ---------- Helpers ----------
    const getPeaNameLocal = (code: string): string => {
        const found = masPeaList.find((p: any) =>
            (p.pea_code || p.PeaCode || p.code) === code
        );
        return found ? (found.name_th || found.NameTh || code) : code;
    };

    const parseCreationLog = (log: any) => {
        const countMatch = log.action?.match(/สร้างซีลใหม่\s+(\d+)\s+อัน/);
        const startSealMatch = log.action?.match(/จากเลขเริ่ม\s+(\S+)/);
        const peaMatch = log.action?.match(/PEA:\s*([^,)]+)/);
        const count = countMatch ? parseInt(countMatch[1], 10) : 1;
        const startSeal = startSealMatch ? startSealMatch[1] : '';
        const peaCode = peaMatch ? peaMatch[1].trim() : '';

        let endSeal = startSeal;
        if (count > 1 && startSeal) {
            const m = startSeal.match(/^([A-Za-z]*)(\d+)$/);
            if (m) {
                const endNum = (parseInt(m[2], 10) + count - 1).toString().padStart(m[2].length, '0');
                endSeal = `${m[1]}${endNum}`;
            }
        }
        return { count, startSeal, endSeal, peaCode };
    };

    const fetchCreationHistory = async () => {
        setHistoryLoading(true);
        try {
            const [logs, allUsers] = await Promise.all([
                sealService.getCreationLogs(),
                userService.getAllUsers().catch(() => []),
            ]);

            // build userMap
            const uMap: Record<number, any> = {};
            (allUsers || []).forEach((u: any) => { if (u.id) uMap[u.id] = u; });
            setHistoryUserMap(uMap);

            // filter by current user PEA (unless admin)
            const filtered = logs.filter((log: any) => {
                if (user?.role === 'admin') return true;
                const peaMatch = log.action?.match(/PEA:\s*([^,)]+)/);
                return peaMatch ? peaMatch[1].trim() === user?.pea_code : true;
            });

            const sorted = filtered.sort((a: any, b: any) =>
                new Date(b.timestamp || b.created_at).getTime() -
                new Date(a.timestamp || a.created_at).getTime()
            );
            setCreationHistory(sorted);
        } catch (error) {
            console.error('Error fetching creation history:', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleDownloadCreationPDF = (log: any) => {
        const { count, startSeal, peaCode } = parseCreationLog(log);
        const timestamp = new Date(log.timestamp || log.created_at);
        const u = historyUserMap[log.user_id];
        const issuerFirstName = u?.first_name || '';
        const issuerLastName = u?.last_name || '';
        const issuerUsername = u?.username || String(log.user_id || 'Admin');
        generateCreationPDF({
            startSeal,
            totalCount: count,
            peaName: getPeaNameLocal(peaCode),
            peaCode,
            issuer: {
                first_name: issuerFirstName,
                last_name: issuerLastName,
                username: issuerUsername,
                pea_code: peaCode,
            },
            timestamp,
            maxPerBox: 1000,
        });
    };

    const getFilteredHistory = () => {
        let result = creationHistory;
        if (historyDateFilter) {
            result = result.filter((log: any) => {
                const d = new Date(log.timestamp || log.created_at);
                const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                return iso === historyDateFilter;
            });
        }
        if (historySearchText.trim()) {
            const q = historySearchText.toLowerCase();
            result = result.filter((log: any) => {
                const { startSeal, endSeal, peaCode } = parseCreationLog(log);
                const u = historyUserMap[log.user_id];
                const name = `${u?.first_name || ''} ${u?.last_name || ''}`.toLowerCase();
                return startSeal.toLowerCase().includes(q) || endSeal.toLowerCase().includes(q) || peaCode.toLowerCase().includes(q) || name.includes(q);
            });
        }
        return result;
    };

    useEffect(() => {
        fetchMasPea();
    }, [user?.pea_code]);

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);

            if (user?.pea_code) {
                const defaultPea = data.find((p: any) =>
                    (p.pea_code || p.PeaCode || p.code) === user.pea_code
                );
                if (defaultPea) {
                    setSelectedPea(defaultPea);
                    const code = defaultPea.pea_code || defaultPea.PeaCode || defaultPea.code || '';
                    const name = defaultPea.name_th || defaultPea.NameTh || '';
                    setSearchPeaQuery(`${code} - ${name}`);
                }
            }
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const filterPeaList = () => {
        const query = (searchPeaQuery || '').trim().toLowerCase();

        return masPeaList.filter(p => {
            const level = p.level || p.Level || '';
            if (level !== '1') return false; // Filter only Level 1

            if (!query) return true;

            const code = (p.pea_code || p.PeaCode || p.code || '').toLowerCase();
            const nameTh = (p.name_th || p.NameTh || '').toLowerCase();
            const nameEng = (p.name_eng || p.NameEng || '').toLowerCase();

            return code.includes(query) ||
                nameTh.includes(query) ||
                nameEng.includes(query);
        });
    };

    const handleSelectPea = (item: any) => {
        setSelectedPea(item);
        const code = item.pea_code || item.PeaCode || item.code || '';
        const name = item.name_th || item.NameTh || '';
        setSearchPeaQuery(`${code} - ${name}`);
        setShowPeaDropdown(false);
    };

    const handleClearPea = () => {
        setSelectedPea(null);
        setSearchPeaQuery('');
    };

    const checkSealExistence = async (sealNum: string) => {
        try {
            const result = await sealService.checkSealExists(sealNum);
            // Returns message: "Seal number is available" or 409 Conflict
            return { status: 'available' };
        } catch (error: any) {
            if (error.response?.status === 409) {
                return { status: 'unavailable', reason: 'มีเลขซีลนี้ในระบบแล้ว' };
            }
            return { status: 'unavailable', reason: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
        }
    };

    // Helper to generate seal range (similar to AssignSealScreen)
    const generateSealRange = (start: string, count: number): string[] => {
        const seals: string[] = [];
        const match = start.match(/^([A-Za-z]+)(\d+)$/);

        if (!match) {
            if (count === 1) return [start];
            return [];
        }

        const prefix = match[1];
        const numberPart = match[2];
        const startNum = parseInt(numberPart, 10);
        const length = numberPart.length;

        for (let i = 0; i < count; i++) {
            const currentNum = startNum + i;
            const paddedNum = currentNum.toString().padStart(length, '0');
            seals.push(`${prefix}${paddedNum}`);
        }
        return seals;
    };

    const handleAddSingleSeal = async () => {
        if (!singleSealInput.trim()) return;

        const sealNum = singleSealInput.trim();

        // Check local duplicate
        if (stagedBatches.some(s => s.sealNumber === sealNum)) {
            setSingleSealInput('');
            return;
        }

        const checkResult = await checkSealExistence(sealNum);

        if (checkResult.status === 'unavailable') {
            setModalStatus('error');
            setModalMessage(`ไม่สามารถสร้างซีล ${sealNum} ได้\nเหตุผล: ${checkResult.reason || 'มีการสร้างไปแล้ว'}`);
            setModalVisible(true);
            setSingleSealInput('');
            return;
        }

        const newEntry: StagedBatch = {
            id: Date.now().toString(),
            sealNumber: sealNum,
            type: 'Single',
            count: 1,
            status: 'available',
            creationStatus: SealStatus.READY, // Default
            createRemarks: ''
        };

        setStagedBatches(prev => [newEntry, ...prev]);
        setSingleSealInput('');
    };

    const handleAddBatchSeals = async () => {
        if (!rangeStartInput.trim() || !rangeCountInput.trim()) return;

        const count = parseInt(rangeCountInput.trim(), 10);
        if (isNaN(count) || count <= 0) {
            setModalStatus('error');
            setModalMessage('กรุณาระบุจำนวนที่ถูกต้อง (มากกว่า 0)');
            setModalVisible(true);
            return;
        }

        const startSeal = rangeStartInput.trim();
        const generatedSeals = generateSealRange(startSeal, count);

        if (generatedSeals.length === 0) {
            setModalStatus('error');
            setModalMessage('รูปแบบซีลเริ่มต้นไม่ถูกต้อง (ต้องเป็น ตัวอักษร+ตัวเลข)');
            setModalVisible(true);
            return;
        }

        setLoading(true);

        try {
            // ✅ Check existence in chunks of 500 to avoid oversized requests
            let results: Awaited<ReturnType<typeof sealService.checkSeals>> = [];
            const CHUNK_SIZE = 500;
            for (let i = 0; i < generatedSeals.length; i += CHUNK_SIZE) {
                const chunk = generatedSeals.slice(i, i + CHUNK_SIZE);
                const chunkResults = await sealService.checkSeals(chunk);
                results = [...results, ...chunkResults];
            }

            // For creation, "Not Found" status means it DOES NOT EXIST (which is what we want)
            // Anything else means it EXISTS and cannot be created
            const canCreate = results.filter(r => r.status === 'Not Found' || r.reason === 'ไม่พบในระบบ');
            const cannotCreate = results.filter(r => r.status !== 'Not Found' && r.reason !== 'ไม่พบในระบบ');

            // Add valid ones to staging list
            if (canCreate.length > 0) {
                const timestamp = Date.now();
                const newEntries: StagedBatch[] = canCreate.map((result, index) => ({
                    id: `${timestamp}-${index}`,
                    sealNumber: result.seal_number,
                    type: 'Single',
                    count: 1,
                    status: 'available',
                    creationStatus: SealStatus.READY, // Default
                    createRemarks: ''
                }));

                // Filter out local duplicates before adding
                const uniqueNewEntries = newEntries.filter(
                    e => !stagedBatches.some(s => s.sealNumber === e.sealNumber)
                );

                if (uniqueNewEntries.length > 0) {
                    setStagedBatches(prev => [...uniqueNewEntries, ...prev]);
                }
            }

            // Show error if there are some that cannot be created
            if (cannotCreate.length > 0) {
                setModalStatus('error');
                const reasons = cannotCreate.slice(0, 5).map(r => `${r.seal_number} (มีในระบบแล้ว)`).join('\n');
                let message = `ไม่สามารถสร้างซีลได้ ${cannotCreate.length} รายการ เนื่องจากมีในระบบแล้ว:\n${reasons}${cannotCreate.length > 5 ? '\n...' : ''}`;

                if (canCreate.length > 0) {
                    message += `\n\n✅ เพิ่มซีลที่จะสร้าง ${canCreate.length} รายการลงในรายการเรียบร้อยแล้ว`;
                }

                setModalMessage(message);
                setModalVisible(true);
            }

            if (canCreate.length > 0) {
                setRangeStartInput('');
                setRangeCountInput('');
            }
        } catch (error) {
            console.error('Check batch error:', error);
            setModalStatus('error');
            setModalMessage('เกิดข้อผิดพลาดในการตรวจสอบรายการซีล');
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveBatch = (id: string) => {
        setStagedBatches(prev => prev.filter(s => s.id !== id));
    };

    const handleUpdateBatchStatus = (id: string, newStatus: string) => {
        setStagedBatches(prev => prev.map(s => s.id === id ? { ...s, creationStatus: newStatus } : s));
    };

    const handleUpdateRemarks = (id: string, remarks: string) => {
        setStagedBatches(prev => prev.map(s => s.id === id ? { ...s, createRemarks: remarks } : s));
    };

    const handleConfirmCreation = async () => {
        if (!selectedPea && !user?.pea_code) {
            setModalStatus('error');
            setModalMessage('กรุณาระบุสังกัดการไฟฟ้า (PEA Code)');
            setModalVisible(true);
            return;
        }

        const validBatches = stagedBatches.filter(s => s.status === 'available');
        if (validBatches.length === 0) {
            setModalStatus('error');
            setModalMessage('ไม่มีรายการซีลที่พร้อมสร้างในรายการ');
            setModalVisible(true);
            return;
        }

        const code = canSelectPea
            ? (selectedPea?.pea_code || selectedPea?.PeaCode || selectedPea?.code || '')
            : (user?.pea_code || '');

        setLoading(true);
        try {
            // ✅ Group consecutive seals with same status/remarks into batches
            // Instead of sending 10,000 items (count=1 each), sends ~1-3 grouped batches
            const sorted = [...validBatches].sort((a, b) => a.sealNumber.localeCompare(b.sealNumber));
            const grouped: { seal_number: string; count: number; pea_code: string; status?: string; create_remarks?: string }[] = [];
            let gi = 0;
            while (gi < sorted.length) {
                const start = sorted[gi];
                let count = 1;
                while (gi + count < sorted.length) {
                    const prev = sorted[gi + count - 1];
                    const next = sorted[gi + count];
                    if (next.creationStatus !== start.creationStatus || next.createRemarks !== start.createRemarks) break;
                    // Check if consecutive seal number
                    const mP = prev.sealNumber.match(/^([A-Za-z]*)(\d+)$/);
                    const mN = next.sealNumber.match(/^([A-Za-z]*)(\d+)$/);
                    if (!mP || !mN || mP[1] !== mN[1] || mP[2].length !== mN[2].length) break;
                    if (parseInt(mN[2]) !== parseInt(mP[2]) + 1) break;
                    count++;
                }
                grouped.push({
                    seal_number: start.sealNumber,
                    count,
                    pea_code: code,
                    status: start.creationStatus,
                    create_remarks: start.createRemarks
                });
                gi += count;
            }

            await sealService.generateBatches(grouped);

            setModalStatus('success');
            setModalMessage(`สร้างซีลจำนวน ${validBatches.length} ดวง เรียบร้อยแล้ว (${grouped.length} batch)`);
            setModalVisible(true);
            setStagedBatches([]); // Clear list

        } catch (error: any) {
            console.error('Creation error:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'เกิดข้อผิดพลาดในการสร้างซีล');
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setModalVisible(false);
        if (modalStatus === 'success') {
            if (user?.role === 'meter') {
                (navigation as any).navigate('TransferToAccounting');
                return;
            }
            navigation.goBack();
        }
    };

    return (
        <View style={styles.mainContainer}>
            <Header />
            <View style={styles.contentContainer}>

                {/* LEFT PANEL: Inputs */}
                <View style={styles.leftPanel}>
                    {/* 1. PEA Selection */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>1. ระบุสังกัดการไฟฟ้า (PEA Code)</Text>

                        <View style={styles.formGroup}>
                            <TouchableOpacity
                                style={[styles.peaSelector, !canSelectPea && { opacity: 0.8 }]}
                                onPress={() => {
                                    if (!canSelectPea) return;
                                    setSearchPeaQuery('');
                                    setShowPeaDropdown(true);
                                }}
                                activeOpacity={canSelectPea ? 0.7 : 1}
                            >
                                {canSelectPea ? (
                                    selectedPea ? (
                                        <View>
                                            <Text style={styles.peaCode}>{selectedPea.pea_code || selectedPea.PeaCode || selectedPea.code}</Text>
                                            <Text style={styles.peaName}>{selectedPea.name_th || selectedPea.NameTh}</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.peaPlaceholder}>เลือกการไฟฟ้า...</Text>
                                    )
                                ) : (
                                    <View>
                                        <Text style={styles.peaCode}>{user?.pea_code || '-'}</Text>
                                        <Text style={styles.peaName}>สร้างเข้าคลังของสังกัดผู้ใช้งาน</Text>
                                    </View>
                                )}
                                <Text style={styles.dropdownIcon}>{canSelectPea ? '▼' : ''}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 2. Add Seals */}
                    <View style={[styles.sectionCard, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>2. ระบุรายละเอียดการสร้าง (Create Seals)</Text>

                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tab, entryMode === 'scan' && styles.activeTab]}
                                onPress={() => setEntryMode('scan')}
                            >
                                <Text style={[styles.tabText, entryMode === 'scan' && styles.activeTabText]}>llll Scan / Single</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tab, entryMode === 'range' && styles.activeTab]}
                                onPress={() => setEntryMode('range')}
                            >
                                <Text style={[styles.tabText, entryMode === 'range' && styles.activeTabText]}>📚 Batch / Range</Text>
                            </TouchableOpacity>
                        </View>



                        {entryMode === 'scan' ? (
                            <View style={styles.inputArea}>
                                <TextInput
                                    style={styles.scanInput}
                                    placeholder="ยิงบาร์โค้ด หรือพิมพ์ Serial..."
                                    value={singleSealInput}
                                    onChangeText={(text) => setSingleSealInput(text.replace(/^PEA\s+/i, ''))}
                                    onSubmitEditing={handleAddSingleSeal}
                                    blurOnSubmit={false}
                                />
                                <Text style={styles.helperText}>กด Enter เพื่อเพิ่มรายการลงตะกร้าทันที</Text>
                            </View>
                        ) : (
                            <View style={styles.inputArea}>
                                <View style={styles.rangeRow}>
                                    <View style={{ flex: 1, marginRight: 10 }}>
                                        <Text style={styles.label}>เริ่มต้น (Start)</Text>
                                        <TextInput
                                            style={styles.rangeInput}
                                            placeholder="Ex. SL-001"
                                            value={rangeStartInput}
                                            onChangeText={(text) => setRangeStartInput(text.replace(/^PEA\s+/i, ''))}
                                        />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.label}>จำนวน (Count)</Text>
                                        <TextInput
                                            style={styles.rangeInput}
                                            placeholder="Ex. 10"
                                            value={rangeCountInput}
                                            onChangeText={setRangeCountInput}
                                            keyboardType="numeric"
                                        />
                                    </View>
                                </View>
                                <TouchableOpacity style={styles.addRangeBtn} onPress={handleAddBatchSeals}>
                                    <Text style={styles.addRangeBtnText}>เพิ่มรายการ (Add Range)</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.spacer} />
                        <Text style={styles.infoText}>ℹ ระบบจะเช็คไม่ให้เลขซีลซ้ำกับในฐานข้อมูล</Text>
                    </View>
                </View>

                {/* RIGHT PANEL: Staging List */}
                <View style={styles.rightPanel}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>รายการที่จะสร้าง (Staging List)</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <TouchableOpacity
                                style={styles.historyBtn}
                                onPress={() => { setHistoryModalVisible(true); fetchCreationHistory(); }}
                            >
                                <Text style={styles.historyBtnText}>📋 ประวัติการเบิก</Text>
                            </TouchableOpacity>
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>Total: {stagedBatches.length} รายการ (Groups)</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.tableHead}>
                        <Text style={[styles.th, { flex: 0.5 }]}>#</Text>
                        <Text style={[styles.th, { flex: 3 }]}>START SERIAL</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>หมายเหตุ</Text>
                        <Text style={[styles.th, { flex: 2 }]}>STATUS CHECK</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ACTION</Text>
                    </View>

                    <FlatList
                        style={styles.listContainer}
                        data={stagedBatches}
                        keyExtractor={(item) => item.id}
                        initialNumToRender={30}
                        maxToRenderPerBatch={20}
                        windowSize={5}
                        removeClippedSubviews={true}
                        renderItem={({ item, index }) => (
                            <View style={[
                                styles.tableRow,
                                item.status === 'unavailable' && styles.rowError
                            ]}>
                                <Text style={[styles.td, { flex: 0.5 }]}>{index + 1}</Text>
                                <View style={{ flex: 3 }}>
                                    {item.type === 'Batch' && <View style={styles.rangeTag}><Text style={styles.rangeTagText}>BATCH ({item.count})</Text></View>}
                                    <Text style={styles.serialText}>{item.sealNumber}</Text>
                                    <View style={styles.inlineStatusContainer}>
                                        {CREATION_STATUSES.map(s => (
                                            <TouchableOpacity
                                                key={s}
                                                style={[
                                                    styles.inlineStatusBtn,
                                                    item.creationStatus === s ? (s === SealStatus.READY ? styles.statusBtnReady : styles.statusBtnDamaged) : null
                                                ]}
                                                onPress={() => handleUpdateBatchStatus(item.id, s)}
                                            >
                                                <Text style={[
                                                    styles.inlineStatusText,
                                                    item.creationStatus === s && styles.inlineStatusTextActive,
                                                    item.creationStatus === s && s === SealStatus.DAMAGED && { color: '#d32f2f' }
                                                ]}>{s}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                                <View style={{ flex: 1.5 }}>
                                    <TextInput
                                        style={styles.remarkInput}
                                        placeholder="พิมพ์หมายเหตุ..."
                                        value={item.createRemarks}
                                        onChangeText={(text) => handleUpdateRemarks(item.id, text)}
                                    />
                                </View>
                                <View style={{ flex: 2 }}>
                                    {item.status === 'checking' && <Text style={styles.statusChecking}>⏳ Checking...</Text>}
                                    {item.status === 'available' && <Text style={styles.statusOk}>✅ Ready</Text>}
                                    {item.status === 'unavailable' && <Text style={styles.statusError}>⛔ Exists</Text>}
                                </View>
                                <TouchableOpacity
                                    style={{ flex: 1, alignItems: 'center' }}
                                    onPress={() => handleRemoveBatch(item.id)}
                                >
                                    <Text style={styles.deleteIcon}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>ยังไม่มีรายการ</Text>
                            </View>
                        }
                    />

                    <View style={styles.footer}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>รวมทั้งหมด:</Text>
                            <Text style={styles.totalValue}>{stagedBatches.reduce((sum, item) => sum + item.count, 0)} <Text style={{ fontSize: 16, fontWeight: 'normal' }}>ชิ้น/Seals</Text></Text>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStagedBatches([])}>
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                                onPress={handleConfirmCreation}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>💾 ยืนยันการสร้างซีล (Create)</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* History Modal */}
            <Modal visible={historyModalVisible} animationType="slide" transparent onRequestClose={() => setHistoryModalVisible(false)}>
                <View style={styles.historyOverlay}>
                    <View style={styles.historyModal}>
                        {/* Header */}
                        <View style={styles.historyModalHeader}>
                            <Text style={styles.historyModalTitle}>📋 ประวัติการเบิกซีล</Text>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                                <Text style={{ fontSize: 24, color: '#999' }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Filters */}
                        <View style={styles.historyFilters}>
                            <TextInput
                                style={[styles.historyFilterInput, { flex: 1 }]}
                                placeholder="ค้นหมายเลขซีล, PEA, ชื่อผู้สร้าง..."
                                value={historySearchText}
                                onChangeText={setHistorySearchText}
                            />
                            <TextInput
                                style={[styles.historyFilterInput, { width: 160 }]}
                                placeholder="วว/ดด/ปปปป"
                                value={historyDateFilter}
                                onChangeText={setHistoryDateFilter}
                                // date input on web
                                {...({ type: 'date' } as any)}
                            />
                        </View>

                        {/* Table Header */}
                        <View style={styles.historyTableHead}>
                            <Text style={[styles.historyTh, { flex: 2 }]}>วัน-เวลา</Text>
                            <Text style={[styles.historyTh, { flex: 4 }]}>รายละเอียด</Text>
                            <Text style={[styles.historyTh, { flex: 1.5, textAlign: 'center' }]}>จำนวน</Text>
                            <Text style={[styles.historyTh, { flex: 1.5, textAlign: 'center' }]}>PDF</Text>
                        </View>

                        {/* List */}
                        <ScrollView style={styles.historyList}>
                            {historyLoading ? (
                                <ActivityIndicator color={colors.primaryPurple} style={{ marginTop: 40 }} />
                            ) : getFilteredHistory().length === 0 ? (
                                <View style={{ padding: 40, alignItems: 'center' }}>
                                    <Text style={{ color: '#ccc', fontSize: 16 }}>ยังไม่มีประวัติ
                                    </Text>
                                </View>
                            ) : getFilteredHistory().map((log, index) => {
                                const { count, startSeal, endSeal, peaCode } = parseCreationLog(log);
                                const ts = new Date(log.timestamp || log.created_at);
                                const u = historyUserMap[log.user_id];
                                const creatorName = u ? `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username : `ID: ${log.user_id}`;
                                return (
                                    <View key={log.id || index} style={styles.historyRow}>
                                        <View style={{ flex: 2 }}>
                                            <Text style={styles.historyDate}>{ts.toLocaleDateString('th-TH')}</Text>
                                            <Text style={styles.historyTime}>{ts.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</Text>
                                        </View>
                                        <View style={{ flex: 4 }}>
                                            <Text style={styles.historyAction}>เบิกซีล: <Text style={{ fontWeight: 'bold', color: colors.primaryPurple }}>{startSeal}</Text></Text>
                                            {count > 1 && <Text style={styles.historyUser}>ถึง: {endSeal}</Text>}
                                            <Text style={styles.historyUser}>สังกัด: {getPeaNameLocal(peaCode)}</Text>
                                            <Text style={styles.historyUser}>ผู้สร้าง: {creatorName}</Text>
                                        </View>
                                        <View style={{ flex: 1.5, alignItems: 'center' }}>
                                            <View style={styles.historyCountBadge}>
                                                <Text style={styles.historyCountText}>{count}</Text>
                                            </View>
                                        </View>
                                        <View style={{ flex: 1.5, alignItems: 'center' }}>
                                            <TouchableOpacity onPress={() => handleDownloadCreationPDF(log)}>
                                                <Text style={{ fontSize: 22 }}>📥</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* PEA Selection Modal */}
            <Modal visible={showPeaDropdown} transparent animationType="slide" onRequestClose={() => setShowPeaDropdown(false)}>
                <View style={styles.peaModalOverlay}>
                    <View style={styles.peaModalContent}>
                        <View style={styles.peaModalHeader}>
                            <Text style={styles.peaModalTitle}>เลือกสังกัด</Text>
                            <TouchableOpacity onPress={() => setShowPeaDropdown(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.peaSearchInput}
                            placeholder="ค้นหา (รหัส, ชื่อไทย, ชื่ออังกฤษ)..."
                            value={searchPeaQuery}
                            onChangeText={setSearchPeaQuery}
                        />

                        <ScrollView style={styles.peaList}>
                            {filterPeaList().map((item, index) => {
                                const code = item.pea_code || item.PeaCode || item.code || '';
                                const nameTh = item.name_th || item.NameTh || '';
                                const nameEng = item.name_eng || item.NameEng || '';
                                return (
                                    <TouchableOpacity
                                        key={item.id || index}
                                        style={styles.peaItem}
                                        onPress={() => handleSelectPea(item)}
                                    >
                                        <Text style={styles.peaItemCode}>{code || 'No Code'}</Text>
                                        <View>
                                            <Text style={styles.peaItemName}>{nameTh}</Text>
                                            <Text style={styles.peaItemSub}>{nameEng}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Status Modal */}
            <Modal transparent={true} visible={modalVisible} animationType="fade" onRequestClose={handleModalClose}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={[styles.modalIconCircle, { backgroundColor: modalStatus === 'success' ? '#e8f5e9' : '#ffebee' }]}>
                            <Text style={[styles.modalIcon, { color: modalStatus === 'success' ? '#4caf50' : '#f44336' }]}>
                                {modalStatus === 'success' ? '✅' : '❌'}
                            </Text>
                        </View>
                        <Text style={styles.modalTitle}>{modalStatus === 'success' ? 'สำเร็จ' : 'เกิดข้อผิดพลาด'}</Text>
                        <Text style={styles.modalMessage}>{modalMessage}</Text>
                        <TouchableOpacity style={[styles.modalBtn, { backgroundColor: modalStatus === 'success' ? colors.primaryPurple : '#f44336' }]} onPress={handleModalClose}><Text style={styles.modalBtnText}>ตกลง</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#f4f6f8' },
    contentContainer: { flex: 1, flexDirection: 'row', padding: 20 },
    leftPanel: { flex: 1, marginRight: 20 },
    rightPanel: { flex: 2, backgroundColor: 'white', borderRadius: 12, padding: 20, elevation: 2, flexDirection: 'column', overflow: 'hidden' },

    sectionCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, elevation: 1 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primaryPurple, marginBottom: 15 },

    // PEA Selection Modal
    formGroup: { marginBottom: 15 },
    peaSelector: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#fafafa',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 50,
    },
    peaCode: { fontSize: 15, fontWeight: 'bold', color: colors.primaryPurple },
    peaName: { fontSize: 13, color: '#555', marginTop: 2 },
    peaPlaceholder: { fontSize: 14, color: '#aaa' },
    dropdownIcon: { color: '#999', fontSize: 14 },

    peaModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    peaModalContent: {
        width: '90%',
        height: '80%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 10,
    },
    peaModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    peaModalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryPurple },
    closeBtn: { fontSize: 24, color: '#999' },
    peaSearchInput: {
        height: 48,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 14,
        backgroundColor: '#fafafa',
        marginBottom: 10,
    },
    peaList: {
        flex: 1,
    },
    peaItem: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    peaItemCode: {
        fontSize: 14,
        fontWeight: 'bold',
        color: colors.primaryPurple,
        width: 80,
    },
    peaItemName: {
        fontSize: 14,
        color: '#333',
    },
    peaItemSub: {
        fontSize: 12,
        color: '#666',
    },

    // Tabs
    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 20 },
    tab: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 15 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: colors.primaryPurple },
    tabText: { fontSize: 14, color: '#666' },
    activeTabText: { color: colors.primaryPurple, fontWeight: 'bold' },

    // Inputs
    inputArea: { minHeight: 100 },
    scanInput: { borderWidth: 2, borderColor: colors.primaryPurple, borderRadius: 8, padding: 15, fontSize: 16, textAlign: 'center', backgroundColor: '#fdfbff', borderStyle: 'dashed' },
    helperText: { textAlign: 'center', color: '#999', fontSize: 12, marginTop: 10 },

    rangeRow: { flexDirection: 'row' },
    label: { fontSize: 12, color: '#666', marginBottom: 5 },
    rangeInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14 },
    addRangeBtn: { backgroundColor: '#f0f0f0', borderRadius: 8, padding: 12, alignItems: 'center', marginTop: 15 },
    addRangeBtnText: { color: '#333', fontWeight: 'bold' },
    spacer: { flex: 1 },
    infoText: { fontSize: 12, color: '#999', marginTop: 10 },

    inlineStatusContainer: { flexDirection: 'row', marginTop: 8 },
    inlineStatusBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#eee', marginRight: 6, backgroundColor: '#f9f9f9' },
    statusBtnReady: { backgroundColor: '#e8f5e9', borderColor: '#4caf50' },
    statusBtnDamaged: { backgroundColor: '#ffebee', borderColor: '#f44336' },
    inlineStatusText: { fontSize: 11, color: '#777' },
    inlineStatusTextActive: { color: '#2e7d32', fontWeight: 'bold' },

    // Right Panel
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    countBadge: { backgroundColor: '#f3e5f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    countText: { color: colors.primaryPurple, fontWeight: 'bold', fontSize: 13 },

    tableHead: { flexDirection: 'row', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 10 },
    th: { fontSize: 12, fontWeight: 'bold', color: '#999' },

    listContainer: { flexGrow: 1, flexShrink: 1, flexBasis: 0, minHeight: 0 },
    tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    rowError: { backgroundColor: '#fff0f0' },
    rowWarning: { backgroundColor: '#fff8e1' },
    td: { fontSize: 14, color: '#333' },
    serialText: { fontWeight: 'bold', fontSize: 14, color: colors.primaryPurple },
    rangeTag: { backgroundColor: '#eabc29', paddingHorizontal: 5, borderRadius: 4, marginRight: 8, alignSelf: 'flex-start' },
    rangeTagText: { fontSize: 10, color: 'white', fontWeight: 'bold' },

    statusChecking: { color: '#f57c00', fontSize: 13 },
    statusOk: { color: '#4caf50', fontWeight: 'bold', fontSize: 13 },
    statusError: { color: '#f44336', fontWeight: 'bold', fontSize: 13 },
    deleteIcon: { fontSize: 16, color: '#ccc' },
    remarkInput: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, fontSize: 12, backgroundColor: '#fafafa', minHeight: 32 },
    emptyState: { padding: 40, alignItems: 'center' },
    emptyText: { color: '#ccc', fontSize: 16 },

    footer: { marginTop: 20, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 20 },
    totalRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', marginBottom: 15 },
    totalLabel: { fontSize: 16, color: '#666', marginRight: 10 },
    totalValue: { fontSize: 24, fontWeight: 'bold', color: '#333' },

    actionButtons: { flexDirection: 'row', justifyContent: 'flex-end' },
    cancelBtn: { paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 10 },
    cancelBtnText: { color: '#666' },
    confirmBtn: { backgroundColor: colors.primaryPurple, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 8 },
    confirmBtnText: { color: 'white', fontWeight: 'bold' },

    // Modal
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: 350, backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10 },
    modalIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalIcon: { fontSize: 40 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    modalMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    modalBtn: { width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    // History Button
    historyBtn: { backgroundColor: '#f3e5f5', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: colors.primaryPurple },
    historyBtnText: { color: colors.primaryPurple, fontWeight: 'bold', fontSize: 13 },

    // History Modal
    historyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    historyModal: { width: '85%', height: '82%', backgroundColor: 'white', borderRadius: 16, padding: 20, flexDirection: 'column' },
    historyModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    historyModalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryPurple },
    historyFilters: { flexDirection: 'row', gap: 10, marginBottom: 12 },
    historyFilterInput: { height: 40, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, paddingHorizontal: 12, fontSize: 13, backgroundColor: '#fafafa' },
    historyTableHead: { flexDirection: 'row', backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, marginBottom: 8 },
    historyTh: { fontSize: 12, fontWeight: 'bold', color: '#999' },
    historyList: { flex: 1 },
    historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f5f5f5' },
    historyDate: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    historyTime: { fontSize: 12, color: '#888', marginTop: 2 },
    historyAction: { fontSize: 14, color: '#333' },
    historyUser: { fontSize: 12, color: '#666', marginTop: 2 },
    historyCountBadge: { backgroundColor: colors.primaryPurple, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, minWidth: 36, alignItems: 'center' },
    historyCountText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
});
