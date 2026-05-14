import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Modal, FlatList, Platform } from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors, sizes } from '@/constants';
import { Header } from '@/components/dashboard';
import { technicianService } from '@/services/technicianService';
import { sealService } from '@/services/sealService';
import { userService, UserResponse } from '@/services/userService';
import { useAuth } from '@/context/AuthContext';
import { Technician } from '@/types';
import { SealStatus } from '../../constants/status';
import { generateAssignPDF } from '@/utils/generateAssignPDF';
import { generateTransferPDF } from '@/utils/generateTransferPDF';

type EntryMode = 'scan' | 'range';

interface StagedSeal {
    id: string;
    sealNumber: string;
    type: 'Single' | 'Range';
    status: 'checking' | 'available' | 'unavailable' | 'duplicate';
    rangeCount?: number;
    startSeal?: string;
    issueRemark: string;
}

export const AssignSealScreen: React.FC = () => {
    const navigation = useNavigation();
    const { user, refreshUser } = useAuth();

    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [masPeaList, setMasPeaList] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [searchTechQuery, setSearchTechQuery] = useState('');
    const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
    const [showTechDropdown, setShowTechDropdown] = useState(false);

    const [recipientType, setRecipientType] = useState<'technician' | 'user'>('technician');
    const [accountingUsers, setAccountingUsers] = useState<UserResponse[]>([]);
    const [selectedReceiverUsername, setSelectedReceiverUsername] = useState('');
    const [showReceiverDropdown, setShowReceiverDropdown] = useState(false);
    const [receiverSearchQuery, setReceiverSearchQuery] = useState('');
    const [loadingAccountingUsers, setLoadingAccountingUsers] = useState(false);

    const [entryMode, setEntryMode] = useState<EntryMode>('scan');
    const [singleSealInput, setSingleSealInput] = useState('');
    const [rangeStartInput, setRangeStartInput] = useState('');
    const [rangeCountInput, setRangeCountInput] = useState('');

    const [stagedSeals, setStagedSeals] = useState<StagedSeal[]>([]);

    const [modalVisible, setModalVisible] = useState(false);
    const [modalStatus, setModalStatus] = useState<'success' | 'error'>('success');
    const [modalMessage, setModalMessage] = useState('');

    const [historyModalVisible, setHistoryModalVisible] = useState(false);
    const [historyTab, setHistoryTab] = useState<'technician' | 'user'>('technician');
    const [historyGroups, setHistoryGroups] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [detailModalVisible, setDetailModalVisible] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    const [historyDateFilter, setHistoryDateFilter] = useState('');
    const [historySearchQuery, setHistorySearchQuery] = useState('');


    useFocusEffect(
        React.useCallback(() => {
            refreshUser();
        }, [])
    );

    useEffect(() => {
        if (user?.pea_code) {
            fetchTechnicians();
            fetchMasPea();
            if ((user.role || '').toLowerCase() === 'meter') {
                fetchAccountingUsers();
            }
        }
    }, [user?.pea_code, user?.role]);

    const fetchAccountingUsers = async () => {
        try {
            setLoadingAccountingUsers(true);
            const allUsers = await userService.getAllUsers();
            const candidates = allUsers
                .filter((u) =>
                    u.is_active !== false &&
                    (u.role || '').toLowerCase() === 'user' &&
                    u.username !== user?.username &&
                    (!user?.pea_code || u.pea_code.substring(0, 4) === user.pea_code.substring(0, 4))
                )
                .sort((a, b) => {
                    const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.username;
                    const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.username;
                    return aName.localeCompare(bName);
                });
            setAccountingUsers(candidates);
            if (candidates.length > 0 && !selectedReceiverUsername) {
                setSelectedReceiverUsername(candidates[0].username);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setLoadingAccountingUsers(false);
        }
    };

    const selectedReceiver = React.useMemo(
        () => accountingUsers.find((u) => u.username === selectedReceiverUsername),
        [accountingUsers, selectedReceiverUsername]
    );

    const filteredReceiverUsers = React.useMemo(() => {
        const q = receiverSearchQuery.trim().toLowerCase();
        if (!q) return accountingUsers;
        return accountingUsers.filter((u) => {
            const fullName = `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase();
            return fullName.includes(q) || (u.username || '').toLowerCase().includes(q);
        });
    }, [accountingUsers, receiverSearchQuery]);

    const fetchMasPea = async () => {
        try {
            const data = await userService.getMasPea();
            setMasPeaList(data);
        } catch (error) {
            console.error('Failed to fetch MasPea:', error);
        }
    };

    const getPeaName = (code?: string) => {
        if (!code) return '-';
        const pea = masPeaList.find(p => p.pea_code === code || p.PeaCode === code || p.code === code);
        const nameTh = pea ? (pea.name_th || pea.NameTh) : null;
        return nameTh ? `${nameTh} (${code})` : code;
    };

    const fetchTechnicians = async () => {
        try {
            const peaPrefix = user?.pea_code ? user.pea_code.substring(0, 4) : undefined;
            const data = await technicianService.getTechnicians(peaPrefix, true);
            setTechnicians(data);
        } catch (error) {
            console.error('Failed to fetch technicians', error);
        } finally {
            setInitialLoading(false);
        }
    };

    const filterTechnicians = () => {
        if (!searchTechQuery) return technicians;
        return technicians.filter(t =>
            (t.first_name + ' ' + t.last_name).toLowerCase().includes(searchTechQuery.toLowerCase()) ||
            t.technician_code.toLowerCase().includes(searchTechQuery.toLowerCase())
        );
    };

    const handleSelectTechnician = (tech: Technician) => {
        setSelectedTech(tech);
        setSearchTechQuery(`${tech.first_name} ${tech.last_name}`);
        setShowTechDropdown(false);
    };

    const handleClearTechnician = () => {
        setSelectedTech(null);
        setSearchTechQuery('');
    };

    const handleClearRecipient = () => {
        setSelectedTech(null);
        setSearchTechQuery('');
    };

    const checkSealAvailability = async (sealNum: string): Promise<{ status: 'available' | 'unavailable'; reason?: string }> => {
        try {
            const results = await sealService.checkSeals([sealNum], user?.pea_code);
            if (results.length > 0) {
                const result = results[0];
                return {
                    status: result.is_available ? 'available' : 'unavailable',
                    reason: result.reason
                };
            }
            return { status: 'unavailable', reason: 'ไม่พบข้อมูล' };
        } catch (error) {
            return { status: 'unavailable', reason: 'เกิดข้อผิดพลาดในการตรวจสอบ' };
        }
    };

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

        if (stagedSeals.some(s => s.sealNumber === sealNum)) {
            setSingleSealInput('');
            return;
        }

        const checkResult = await checkSealAvailability(sealNum);

        if (checkResult.status === 'unavailable') {
            setModalStatus('error');
            setModalMessage(`ไม่สามารถเพิ่มซีล ${sealNum} ได้\nเหตุผล: ${checkResult.reason || 'ไม่พร้อมใช้งาน'}`);
            setModalVisible(true);
            setSingleSealInput('');
            return;
        }

        const newEntry: StagedSeal = {
            id: Date.now().toString(),
            sealNumber: sealNum,
            type: 'Single',
            status: 'available',
            issueRemark: ''
        };

        setStagedSeals(prev => [newEntry, ...prev]);
        setSingleSealInput('');
    };

    const handleAddRangeSeals = async () => {
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

        try {
            const results = await sealService.checkSeals(generatedSeals, user?.pea_code);
            const available = results.filter(r => r.is_available);
            const unavailable = results.filter(r => !r.is_available);

            if (available.length > 0) {
                const newEntries: StagedSeal[] = available.map((result, index) => ({
                    id: Date.now().toString() + '-' + index,
                    sealNumber: result.seal_number,
                    type: 'Single',
                    status: 'available',
                    issueRemark: ''
                }));
                setStagedSeals(prev => [...newEntries, ...prev]);
            }

            if (unavailable.length > 0) {
                const reasons = unavailable.slice(0, 5).map(r => `${r.seal_number}: ${r.reason}`).join('\n');
                setModalStatus('error');

                let message = `พบซีลที่ไม่พร้อมใช้งาน ${unavailable.length} รายการ:\n${reasons}${unavailable.length > 5 ? '\n...' : ''}`;

                if (available.length > 0) {
                    message += `\n\n✅ เพิ่มซีลที่พร้อมใช้งาน ${available.length} รายการเรียบร้อยแล้ว`;
                }

                setModalMessage(message);
                setModalVisible(true);
            }

            if (available.length > 0) {
                setRangeStartInput('');
                setRangeCountInput('');
            }

        } catch (error) {
            setModalStatus('error');
            setModalMessage('เกิดข้อผิดพลาดในการตรวจสอบสถานะซีล');
            setModalVisible(true);
            return;
        }
    };

    const handleRemoveSeal = (id: string) => {
        setStagedSeals(prev => prev.filter(s => s.id !== id));
    };

    const handleUpdateIssueRemark = (id: string, remark: string) => {
        setStagedSeals(prev => prev.map(s => s.id === id ? { ...s, issueRemark: remark } : s));
    };

    const handleConfirmAssignment = async () => {
        if (recipientType === 'user') {
            const validSeals = stagedSeals.filter(s => s.status === 'available');
            if (validSeals.length === 0) {
                setModalStatus('error');
                setModalMessage('ไม่มีรายการซีลที่พร้อมโอนในรายการ');
                setModalVisible(true);
                return;
            }
            if (!selectedReceiverUsername) {
                setModalStatus('error');
                setModalMessage('กรุณาเลือกผู้รับบัญชีก่อนยืนยันโอน');
                setModalVisible(true);
                return;
            }
            setLoading(true);
            try {
                const sealList = validSeals.map(s => s.sealNumber);
                await sealService.transferToUser(selectedReceiverUsername, sealList);
                const receiverDisplay = selectedReceiver
                    ? `${selectedReceiver.first_name || ''} ${selectedReceiver.last_name || ''}`.trim() || selectedReceiver.username
                    : selectedReceiverUsername;

                try {
                    let issuerData = {
                        first_name: user?.first_name,
                        last_name: user?.last_name,
                        username: user?.username || '',
                        pea_code: user?.pea_code,
                    };
                    if (user?.username) {
                        try {
                            const fullUser = await userService.getUser(user.username);
                            issuerData = {
                                first_name: fullUser.first_name,
                                last_name: fullUser.last_name,
                                username: fullUser.username,
                                pea_code: fullUser.pea_code,
                            };
                        } catch (err) {}
                    }
                    generateTransferPDF({
                        sealNumbers: sealList,
                        receiverName: receiverDisplay,
                        receiverAffiliation: getPeaName(selectedReceiver?.pea_code || user?.pea_code),
                        issuer: issuerData,
                        peaName: getPeaName(user?.pea_code),
                        timestamp: new Date(),
                    });
                } catch (pdfErr) {
                    console.warn('PDF generation failed:', pdfErr);
                }

                setModalStatus('success');
                setModalMessage(`โอนซีลจำนวน ${sealList.length} รายการ เข้าคลังแผนกบัญชีเรียบร้อยแล้ว\nผู้รับ: ${receiverDisplay}`);
                setModalVisible(true);
                setStagedSeals([]);
            } catch (e: any) {
                setModalStatus('error');
                setModalMessage(e?.response?.data?.error || 'เกิดข้อผิดพลาดในการโอนซีล');
                setModalVisible(true);
            } finally {
                setLoading(false);
            }
            return;
        }

        if (!selectedTech) {
            setModalStatus('error');
            setModalMessage('กรุณาระบุตัวผู้รับ (Technician)');
            setModalVisible(true);
            return;
        }

        const validSeals = stagedSeals.filter(s => s.status === 'available');
        if (validSeals.length === 0) {
            setModalStatus('error');
            setModalMessage('ไม่มีรายการซีลที่พร้อมจ่ายในรายการ');
            setModalVisible(true);
            return;
        }

        setLoading(true);
        try {
            let sealList = validSeals.map(s => s.sealNumber);

            if (sealList.length === 0) {
                setModalStatus('error');
                setModalMessage('ไม่พบรายการซีลที่ถูกต้อง');
                setModalVisible(true);
                setLoading(false);
                return;
            }

            sealList = [...new Set(sealList)];

            const sealRemarksMap: Record<string, string> = {};
            validSeals.forEach(s => {
                if (s.issueRemark) {
                    sealRemarksMap[s.sealNumber] = s.issueRemark;
                }
            });

            let response;
            if (selectedTech) {
                response = await sealService.assignSealsByTechCode(
                    selectedTech.technician_code,
                    sealList,
                    undefined,
                    Object.keys(sealRemarksMap).length > 0 ? sealRemarksMap : undefined
                );
            }

            // เปิด PDF ใบจ่ายซีลอัตโนมัติ (web only)
            try {
                const recipientData = {
                    first_name: selectedTech!.first_name,
                    last_name: selectedTech!.last_name,
                    technician_code: selectedTech!.technician_code,
                    pea_code: selectedTech!.pea_code,
                    company_name: selectedTech!.company_name,
                    is_center: selectedTech!.is_center,
                };
                // Fetch current user details to ensure we have first_name and last_name
                let issuerData = {
                    first_name: user?.first_name,
                    last_name: user?.last_name,
                    username: user?.username || '',
                    pea_code: user?.pea_code,
                };

                if (user?.username) {
                    try {
                        const fullUser = await userService.getUser(user.username);
                        issuerData = {
                            first_name: fullUser.first_name,
                            last_name: fullUser.last_name,
                            username: fullUser.username,
                            pea_code: fullUser.pea_code,
                        };
                    } catch (err) {
                        console.warn('Failed to fetch full user details for PDF, using cached data:', err);
                    }
                }

                // ใช้ timestamp จาก backend response ถ้ามี ไม่งั้นใช้เวลาปัจจุบัน
                const assignmentTimestamp = response?.data?.timestamp ? new Date(response.data.timestamp) : new Date();

                generateAssignPDF({
                    sealNumbers: sealList,
                    technician: recipientData as any,
                    issuer: issuerData,
                    peaName: getPeaName(user?.pea_code),
                    timestamp: assignmentTimestamp, // ใช้ timestamp จาก backend
                    isToUser: recipientType === 'user',
                });
            } catch (pdfErr) {
                console.warn('PDF generation failed:', pdfErr);
            }

            setModalStatus('success');
            setModalMessage(`มอบหมายซีลจำนวน ${sealList.length} รายการ เรียบร้อยแล้ว`);
            setModalVisible(true);
            setStagedSeals([]); // Clear list

        } catch (error: any) {
            console.error('Assignment error:', error);
            setModalStatus('error');
            setModalMessage(error.response?.data?.error || 'เกิดข้อผิดพลาดในการมอบหมายงาน');
            setModalVisible(true);
        } finally {
            setLoading(false);
        }
    };

    const handleModalClose = () => {
        setModalVisible(false);
    };

    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const logs = await (sealService as any).getIssuedLogs();

            const sortedLogs = logs.sort((a: any, b: any) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );

            const uniqueUserIds = [...new Set(sortedLogs.map((log: any) => log.user_id))];
            const userMap: Record<number, any> = {};

            try {
                const allUsers = await userService.getAllUsers();
                for (const userId of uniqueUserIds) {
                    const u = allUsers.find((user: any) => user.id === userId || user.emp_id === userId);
                    if (u) {
                        userMap[userId as number] = u;
                    }
                }
            } catch (err) {
                console.warn('Failed to fetch users for history mapping:', err);
            }

            const groups: any[] = [];
            sortedLogs.forEach((log: any) => {
                const logTime = new Date(log.timestamp).getTime();
                const group = groups.find(g =>
                    g.user_id === log.user_id &&
                    Math.abs(new Date(g.timestamp).getTime() - logTime) < 5000
                );

                const isTransfer = log.action.includes('โอนซีล');
                const receiverMatch = log.action.match(/ผู้รับ:\s*([^@)]+)/);
                const receiverName = receiverMatch ? receiverMatch[1].trim() : 'Unknown';

                const sealMatch = log.action.match(/จ่ายซีล\s+(\S+)\s+ให้ช่าง/) || log.action.match(/โอนซีล\s+(\S+)\s+เข้าคลังแผนกบัญชี/);
                const sealNum = sealMatch ? sealMatch[1] : null;

                const issuerMatch = log.action.match(/ผู้จ่าย:\s*([^)]+)/);
                const issuerName = issuerMatch ? issuerMatch[1].trim() : '';

                let firstName = '';
                let lastName = '';
                if (issuerName) {
                    const nameParts = issuerName.split(' ');
                    firstName = nameParts[0] || '';
                    lastName = nameParts.slice(1).join(' ') || '';
                }

                if (!firstName) {
                    const userDetails = userMap[log.user_id] || {};
                    firstName = userDetails.first_name || log.first_name || '';
                    lastName = userDetails.last_name || log.last_name || '';
                }

                if (group) {
                    if (sealNum) group.seals.push(sealNum);
                } else {
                    const techMatch = log.action.match(/ให้ช่าง\s+(\S+)/);
                    const userMatch = log.action.match(/ให้ฝ่ายผู้ใช้\s+\(([^)]+)\)/);
                    
                    groups.push({
                        id: log.id,
                        timestamp: log.timestamp,
                        user_id: log.user_id,
                        first_name: firstName,
                        last_name: lastName,
                        username: log.username,
                        techCode: techMatch ? techMatch[1] : (isTransfer ? receiverName : 'Unknown'),
                        isTransfer: isTransfer,
                        seals: sealNum ? [sealNum] : [],
                        originalLogs: [log]
                    });
                }
            });

            let filteredGroups = groups;
            if (user?.pea_code) {
                filteredGroups = groups.filter(g => {
                    // 1. เช็คว่าช่างผู้รับอยู่ในสังกัดเราหรือไม่ (เทียบล็อกรหัสช่างใน state ที่โหลดเฉพาะช่างสังกัดเรามาแล้ว)
                    const isTechInPea = technicians.some(t => t.technician_code === g.techCode);
                    // 2. เช็คว่าผู้จ่ายอยู่ในสังกัดเราหรือไม่ (ต้องตรงเป๊ะ ไม่ใช่แค่ขึ้นต้นเหมือนกัน)
                    const groupPea = userMap[g.user_id]?.pea_code;
                    const isIssuerInPea = groupPea === user.pea_code;
                    
                    return isTechInPea || isIssuerInPea;
                });
            }

            setHistoryGroups(filteredGroups);
            setHistoryModalVisible(true);
        } catch (error) {
            console.error('Failed to fetch history:', error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const filteredHistoryGroups = historyGroups.filter(group => {
        if ((user?.role || '').toLowerCase() === 'meter') {
            if (historyTab === 'technician' && group.isTransfer) return false;
            if (historyTab === 'user' && !group.isTransfer) return false;
        } else {
            if (group.isTransfer) return false;
        }

        let match = true;
        if (historyDateFilter) {
            // Check if user is using YYYY-MM-DD or other formats
            try {
                // For timezone safety, just take YYYY-MM-DD from locale string or create a Date
                const groupDate = new Date(group.timestamp);
                const year = groupDate.getFullYear();
                const month = String(groupDate.getMonth() + 1).padStart(2, '0');
                const day = String(groupDate.getDate()).padStart(2, '0');
                const groupDateStr = `${year}-${month}-${day}`;
                if (groupDateStr !== historyDateFilter) {
                    match = false;
                }
            } catch (e) {
                // ignore
            }
        }
        if (historySearchQuery && match) {
            const query = historySearchQuery.toLowerCase();
            const techCode = (group.techCode || '').toLowerCase();
            const tech = technicians.find(t => t.technician_code === group.techCode);
            const techName = tech ? `${tech.first_name} ${tech.last_name}`.toLowerCase() : '';
            const issuerName = `${group.first_name || ''} ${group.last_name || ''}`.toLowerCase();
            
            if (!techCode.includes(query) && !techName.includes(query) && !issuerName.includes(query)) {
                match = false;
            }
        }

        return match;
    });

    const handleShowDetails = (group: any) => {
        setSelectedGroup(group);
        setDetailModalVisible(true);
    };

    const handleReDownloadPDFFromGroup = (group: any) => {
        if (!group.seals || group.seals.length === 0) return;

        if (group.isTransfer) {
            generateTransferPDF({
                sealNumbers: group.seals,
                receiverName: group.techCode,
                receiverAffiliation: getPeaName(user?.pea_code),
                issuer: {
                    first_name: group.first_name,
                    last_name: group.last_name,
                    username: group.username || '',
                    pea_code: user?.pea_code,
                },
                peaName: getPeaName(user?.pea_code),
                timestamp: new Date(group.timestamp),
            });
            return;
        }

        const tech = technicians.find(t => t.technician_code === group.techCode);
        const issuerData = {
            first_name: group.first_name,
            last_name: group.last_name,
            username: '',
            pea_code: user?.pea_code,
        };

        if (group.isToUser) {
            // กรณีเป็นฝ่าย User
            generateAssignPDF({
                sealNumbers: group.seals,
                technician: {
                    first_name: group.first_name_recipient || group.techCode, // ถ้ามีชื่อผู้รับใน group ให้ใช้ (ถ้าไม่มีใช้ username)
                    last_name: group.last_name_recipient || '',
                    technician_code: group.techCode,
                    pea_code: user?.pea_code,
                    company_name: 'ฝ่ายผู้ใช้ (User)',
                    is_center: false,
                },
                issuer: issuerData,
                peaName: getPeaName(user?.pea_code),
                timestamp: new Date(group.timestamp),
                isToUser: true,
            });
        } else if (tech) {
            // กรณีเป็นช่าง
            generateAssignPDF({
                sealNumbers: group.seals,
                technician: {
                    first_name: tech.first_name,
                    last_name: tech.last_name,
                    technician_code: tech.technician_code,
                    pea_code: tech.pea_code,
                    company_name: tech.company_name,
                    is_center: tech.is_center,
                },
                issuer: issuerData,
                peaName: getPeaName(user?.pea_code),
                timestamp: new Date(group.timestamp),
            });
        } else {
            // กรณีหาช่างไม่เจอ แต่มี techCode (อาจเป็นช่างที่ถูกลบ)
            generateAssignPDF({
                sealNumbers: group.seals,
                technician: {
                    first_name: group.techCode,
                    last_name: '',
                    technician_code: group.techCode,
                    pea_code: user?.pea_code,
                    company_name: '-',
                    is_center: false,
                },
                issuer: issuerData,
                peaName: getPeaName(user?.pea_code),
                timestamp: new Date(group.timestamp),
                isToUser: false,
            });
        }
    };

    return (
        <View style={styles.mainContainer}>
            <Header />
            <View style={styles.contentContainer}>

                {/* LEFT PANEL: Inputs */}
                <View style={styles.leftPanel}>
                    {/* 1. Recipient Selection */}
                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>1. ระบุตัวผู้รับ (Recipient)</Text>
                        
                        {(user?.role || '').toLowerCase() === 'meter' && (
                            <View style={styles.recipientTypeContainer}>
                                <TouchableOpacity 
                                    style={[styles.recipientTypeBtn, recipientType === 'technician' && styles.recipientTypeBtnActive]}
                                    onPress={() => setRecipientType('technician')}
                                >
                                    <Text style={[styles.recipientTypeText, recipientType === 'technician' && styles.recipientTypeTextActive]}>จ่ายให้ช่าง</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.recipientTypeBtn, recipientType === 'user' && styles.recipientTypeBtnActive]}
                                    onPress={() => setRecipientType('user')}
                                >
                                    <Text style={[styles.recipientTypeText, recipientType === 'user' && styles.recipientTypeTextActive]}>โอนให้ฝ่ายบัญชี (User)</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {recipientType === 'technician' ? (
                            !selectedTech ? (
                                <View style={styles.formGroup}>
                                    <TouchableOpacity style={styles.techSelector} onPress={() => {
                                        setSearchTechQuery('');
                                        setShowTechDropdown(true);
                                    }}>
                                        <Text style={styles.techPlaceholder}>เลือกช่างรับซีล...</Text>
                                        <Text style={styles.dropdownIcon}>▼</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.selectedTechCard}>
                                    <View style={styles.techAvatar}>
                                        <Text style={styles.techAvatarText}>{selectedTech.is_center ? '🏢' : selectedTech.first_name.charAt(0)}</Text>
                                    </View>
                                    <View style={styles.techInfo}>
                                        <Text style={styles.techName}>{selectedTech.first_name} {selectedTech.is_center ? '' : selectedTech.last_name}</Text>
                                        <Text style={styles.techDetail}>รหัส: {selectedTech.technician_code} • สังกัด: {getPeaName(selectedTech.pea_code)}</Text>
                                        <View style={[styles.techBadge, selectedTech.is_center && { backgroundColor: '#e3f2fd' }]}>
                                            <Text style={[styles.techBadgeText, selectedTech.is_center && { color: '#1976d2' }]}>
                                                {selectedTech.is_center ? 'Center Account' : 'Active'}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={handleClearTechnician} style={styles.removeTechBtn}>
                                        <Text style={styles.removeTechText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        ) : (
                            !selectedReceiverUsername ? (
                                <View style={styles.formGroup}>
                                    <TouchableOpacity style={styles.techSelector} onPress={() => {
                                        setReceiverSearchQuery('');
                                        setShowReceiverDropdown(true);
                                    }}>
                                        <Text style={styles.techPlaceholder}>เลือกผู้รับบัญชี...</Text>
                                        <Text style={styles.dropdownIcon}>▼</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.selectedTechCard}>
                                    <View style={styles.techAvatar}>
                                        <Text style={styles.techAvatarText}>
                                            {selectedReceiver?.first_name ? selectedReceiver.first_name.charAt(0).toUpperCase() : (selectedReceiverUsername.charAt(0).toUpperCase() || 'U')}
                                        </Text>
                                    </View>
                                    <View style={styles.techInfo}>
                                        <Text style={styles.techName}>
                                            {selectedReceiver ? (`${selectedReceiver.first_name || ''} ${selectedReceiver.last_name || ''}`.trim() || selectedReceiver.username) : selectedReceiverUsername}
                                        </Text>
                                        <Text style={styles.techDetail}>Username: {selectedReceiverUsername} • สังกัด: {getPeaName(selectedReceiver?.pea_code)}</Text>
                                        <View style={styles.techBadge}>
                                            <Text style={styles.techBadgeText}>Active</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setSelectedReceiverUsername('')} style={styles.removeTechBtn}>
                                        <Text style={styles.removeTechText}>✕</Text>
                                    </TouchableOpacity>
                                </View>
                            )
                        )}
                    </View>

                    {/* 2. Add Seals */}
                    <View style={[styles.sectionCard, { flex: 1 }]}>
                        <Text style={styles.sectionTitle}>2. เลือกรายการซีล (Add Seals)</Text>

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
                                <TouchableOpacity style={styles.addRangeBtn} onPress={handleAddRangeSeals}>
                                    <Text style={styles.addRangeBtnText}>เพิ่มรายการ (Add Range)</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.spacer} />
                        <Text style={styles.infoText}>ℹ ระบบจะเช็คสถานะ SealStatus.READY อัตโนมัติ</Text>
                    </View>
                </View>

                {/* RIGHT PANEL: Staging List */}
                <View style={styles.rightPanel}>
                    <View style={styles.listHeader}>
                        <Text style={styles.listTitle}>รายการที่จะจ่าย (Staging List)</Text>
                        <View style={styles.countBadge}>
                            <Text style={styles.countText}>Total: {stagedSeals.length} รายการ (Groups)</Text>
                        </View>
                    </View>

                    <View style={styles.tableHead}>
                        <Text style={[styles.th, { flex: 0.5 }]}>#</Text>
                        <Text style={[styles.th, { flex: 3 }]}>SERIAL NUMBER</Text>
                        <Text style={[styles.th, { flex: 1.5 }]}>หมายเหตุ</Text>
                        <Text style={[styles.th, { flex: 2 }]}>STATUS CHECK</Text>
                        <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>ACTION</Text>
                    </View>

                    <ScrollView style={styles.listContainer}>
                        {stagedSeals.map((item, index) => (
                            <View key={item.id} style={[
                                styles.tableRow,
                                item.status === 'unavailable' && styles.rowError,
                                item.status === 'duplicate' && styles.rowWarning
                            ]}>
                                <Text style={[styles.td, { flex: 0.5 }]}>{index + 1}</Text>
                                <View style={{ flex: 3 }}>
                                    {item.type === 'Range' && <View style={styles.rangeTag}><Text style={styles.rangeTagText}>RANGE ({item.rangeCount})</Text></View>}
                                    <Text style={styles.serialText}>{item.sealNumber}</Text>
                                </View>
                                <View style={{ flex: 1.5 }}>
                                    <TextInput
                                        style={styles.remarkInput}
                                        placeholder="พิมพ์หมายเหตุ..."
                                        value={item.issueRemark}
                                        onChangeText={(text) => handleUpdateIssueRemark(item.id, text)}
                                    />
                                </View>
                                <View style={{ flex: 2 }}>
                                    {item.status === 'checking' && <Text style={styles.statusChecking}>⏳ Checking...</Text>}
                                    {item.status === 'available' && <Text style={styles.statusOk}>✅ Available</Text>}
                                    {item.status === 'unavailable' && <Text style={styles.statusError}>⛔ Unavailable</Text>}
                                </View>
                                <TouchableOpacity
                                    style={{ flex: 1, alignItems: 'center' }}
                                    onPress={() => handleRemoveSeal(item.id)}
                                >
                                    <Text style={styles.deleteIcon}>🗑</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                        {stagedSeals.length === 0 && (
                            <View style={styles.emptyState}>
                                <Text style={styles.emptyText}>ยังไม่มีรายการ</Text>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.footer}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>รวมทั้งหมด:</Text>
                            <Text style={styles.totalValue}>{stagedSeals.reduce((sum, item) => sum + (item.type === 'Range' ? (item.rangeCount || 0) : 1), 0)} <Text style={{ fontSize: 16, fontWeight: 'normal' }}>ชิ้น/Seals</Text></Text>

                            <TouchableOpacity
                                style={styles.historyBtn}
                                onPress={fetchHistory}
                                disabled={loadingHistory}
                            >
                                {loadingHistory ? <ActivityIndicator size="small" color={colors.primaryPurple} /> : <Text style={styles.historyBtnText}>📜 ประวัติการจ่าย</Text>}
                            </TouchableOpacity>
                        </View>
                        <View style={styles.actionButtons}>
                            <TouchableOpacity style={styles.cancelBtn} onPress={() => setStagedSeals([])}>
                                <Text style={styles.cancelBtnText}>ยกเลิก</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.confirmBtn, loading && { opacity: 0.7 }]}
                                onPress={handleConfirmAssignment}
                                disabled={loading}
                            >
                                {loading ? <ActivityIndicator color="white" /> : <Text style={styles.confirmBtnText}>💾 ยืนยันการจ่ายงาน (Confirm)</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>

            {/* Technician Selection Modal */}
            <Modal visible={showTechDropdown} transparent animationType="slide" onRequestClose={() => setShowTechDropdown(false)}>
                <View style={styles.techModalOverlay}>
                    <View style={styles.techModalContent}>
                        <View style={styles.techModalHeader}>
                            <Text style={styles.techModalTitle}>เลือกตัวผู้รับ</Text>
                            <TouchableOpacity onPress={() => setShowTechDropdown(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.techSearchInput}
                            placeholder="🔍 พิมพ์ชื่อ หรือรหัส..."
                            value={searchTechQuery}
                            onChangeText={setSearchTechQuery}
                        />

                        <ScrollView style={styles.techList}>
                            {filterTechnicians().map(tech => (
                                <TouchableOpacity
                                    key={tech.id}
                                    style={styles.techItem}
                                    onPress={() => handleSelectTechnician(tech)}
                                >
                                    <View style={styles.techAvatarSmall}>
                                        <Text style={styles.techAvatarTextSmall}>{tech.is_center ? '🏢' : tech.first_name.charAt(0)}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.techItemName}>
                                            {tech.first_name} {tech.is_center ? '' : tech.last_name} {tech.is_center ? '(ศูนย์งาน)' : ''}
                                        </Text>
                                        <Text style={styles.techItemSub}>รหัส: {tech.technician_code} • สังกัด: {getPeaName(tech.pea_code)}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))}
                            {filterTechnicians().length === 0 && (
                                <View style={styles.emptyTechList}>
                                    <Text style={styles.emptyTechText}>ไม่พบข้อมูลช่าง</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Receiver Selection Modal */}
            <Modal visible={showReceiverDropdown} transparent animationType="slide" onRequestClose={() => setShowReceiverDropdown(false)}>
                <View style={styles.techModalOverlay}>
                    <View style={styles.techModalContent}>
                        <View style={styles.techModalHeader}>
                            <Text style={styles.techModalTitle}>เลือกผู้รับบัญชี</Text>
                            <TouchableOpacity onPress={() => setShowReceiverDropdown(false)}>
                                <Text style={styles.closeBtn}>✕</Text>
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={styles.techSearchInput}
                            placeholder="🔍 พิมพ์ชื่อ หรือ username..."
                            value={receiverSearchQuery}
                            onChangeText={setReceiverSearchQuery}
                        />

                        <ScrollView style={styles.techList}>
                            {filteredReceiverUsers.map(item => {
                                const fullName = `${item.first_name || ''} ${item.last_name || ''}`.trim() || item.username;
                                const selected = item.username === selectedReceiverUsername;
                                const initial = item.first_name ? item.first_name.charAt(0) : item.username.charAt(0);
                                return (
                                    <TouchableOpacity
                                        key={item.username}
                                        style={[styles.techItem, selected && { backgroundColor: '#f3e5f5' }]}
                                        onPress={() => {
                                            setSelectedReceiverUsername(item.username);
                                            setShowReceiverDropdown(false);
                                        }}
                                    >
                                        <View style={styles.techAvatarSmall}>
                                            <Text style={styles.techAvatarTextSmall}>{initial.toUpperCase()}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.techItemName}>{fullName}</Text>
                                            <Text style={styles.techItemSub}>Username: {item.username} • สังกัด: {getPeaName(item.pea_code)}</Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                            {filteredReceiverUsers.length === 0 && (
                                <View style={styles.emptyTechList}>
                                    <Text style={styles.emptyTechText}>
                                        {accountingUsers.length === 0 ? 'ไม่พบผู้รับบัญชีที่ใช้งานได้' : 'ไม่พบผู้รับตามคำค้นหา'}
                                    </Text>
                                </View>
                            )}
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

            {/* History Modal */}
            <Modal visible={historyModalVisible} transparent animationType="fade" onRequestClose={() => setHistoryModalVisible(false)}>
                <View style={styles.historyModalOverlay}>
                    <View style={styles.historyModalContent}>
                        <View style={styles.historyModalHeader}>
                            <View>
                                <Text style={styles.historyModalTitle}>ประวัติการจ่ายซีล</Text>
                                <Text style={styles.historyModalSub}>แสดงเป็นกลุ่มตามรอบการจ่าย (คลิกที่รายการเพื่อดูรายละเอียด)</Text>
                            </View>
                            <TouchableOpacity onPress={() => setHistoryModalVisible(false)} style={styles.historyCloseBtn}>
                                <Text style={styles.historyCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {(user?.role || '').toLowerCase() === 'meter' && (
                            <View style={[styles.recipientTypeContainer, { marginBottom: 15 }]}>
                                <TouchableOpacity 
                                    style={[styles.recipientTypeBtn, historyTab === 'technician' && styles.recipientTypeBtnActive]}
                                    onPress={() => setHistoryTab('technician')}
                                >
                                    <Text style={[styles.recipientTypeText, historyTab === 'technician' && styles.recipientTypeTextActive]}>ประวัติการจ่ายช่าง</Text>
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={[styles.recipientTypeBtn, historyTab === 'user' && styles.recipientTypeBtnActive]}
                                    onPress={() => setHistoryTab('user')}
                                >
                                    <Text style={[styles.recipientTypeText, historyTab === 'user' && styles.recipientTypeTextActive]}>ประวัติโอนบัญชี</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        <View style={styles.historyFilterContainer}>
                            <View style={styles.historyFilterItem}>
                                <Text style={styles.historyFilterLabel}>ค้นหาวันที่</Text>
                                {Platform.OS === 'web' ? (
                                    <input
                                        type="date"
                                        value={historyDateFilter}
                                        onChange={(e: any) => setHistoryDateFilter(e.target.value)}
                                        onClick={(e: any) => { try { e.target.showPicker && e.target.showPicker(); } catch (err) {} }}
                                        style={{
                                            height: 40,
                                            borderRadius: 8,
                                            border: '1px solid #ddd',
                                            backgroundColor: '#f9f9f9',
                                            paddingLeft: 12,
                                            paddingRight: 12,
                                            fontSize: 14,
                                            color: '#333',
                                            outline: 'none',
                                            width: '100%',
                                            boxSizing: 'border-box' as any,
                                            cursor: 'pointer',
                                        }}
                                    />
                                ) : (
                                    <TextInput
                                        style={styles.historyFilterInput}
                                        placeholder="YYYY-MM-DD"
                                        value={historyDateFilter}
                                        onChangeText={setHistoryDateFilter}
                                    />
                                )}
                            </View>
                            <View style={[styles.historyFilterItem, { flex: 1 }]}>
                                <Text style={styles.historyFilterLabel}>ค้นหาชื่อช่าง, รหัสช่าง หรือ ชื่อผู้จ่าย</Text>
                                <TextInput
                                    style={styles.historyFilterInput}
                                    placeholder="พิมพ์เพื่อค้นหา..."
                                    value={historySearchQuery}
                                    onChangeText={setHistorySearchQuery}
                                />
                            </View>
                            {(historyDateFilter || historySearchQuery) ? (
                                <TouchableOpacity 
                                    style={styles.historyClearFilterBtn}
                                    onPress={() => {
                                        setHistoryDateFilter('');
                                        setHistorySearchQuery('');
                                    }}
                                >
                                    <Text style={styles.historyClearFilterText}>ล้างตัวกรอง</Text>
                                </TouchableOpacity>
                            ) : null}
                        </View>

                        <View style={styles.historyTableHead}>
                            <Text style={[styles.historyTh, { flex: 2 }]}>วัน-เวลา</Text>
                            <Text style={[styles.historyTh, { flex: 4 }]}>รายละเอียด (ผู้จ่าย/ช่างผู้รับ)</Text>
                            <Text style={[styles.historyTh, { flex: 1.5, textAlign: 'center' }]}>จำนวน</Text>
                            <Text style={[styles.historyTh, { flex: 1.5, textAlign: 'center' }]}>PDF</Text>
                        </View>

                        <ScrollView style={styles.historyList}>
                            {filteredHistoryGroups.map((group, index) => (
                                <TouchableOpacity key={group.id || index} style={styles.historyRow} onPress={() => handleShowDetails(group)}>
                                    <View style={{ flex: 2 }}>
                                        <Text style={styles.historyDate}>{new Date(group.timestamp).toLocaleDateString('th-TH')}</Text>
                                        <Text style={styles.historyTime}>{new Date(group.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</Text>
                                    </View>
                                    <View style={{ flex: 4 }}>
                                        <Text style={styles.historyAction}>
                                            {group.isTransfer ? 'โอนให้บัญชี: ' : 'จ่ายให้ช่าง: '} 
                                            <Text style={{ fontWeight: 'bold', color: colors.primaryPurple }}>{group.techCode}</Text>
                                        </Text>
                                        <Text style={styles.historyUser}>ผู้ออกใบ: {group.first_name || 'Admin'} {group.last_name || ''}</Text>
                                    </View>
                                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                                        <View style={styles.countBadgeSmall}>
                                            <Text style={styles.countTextSmall}>{group.seals.length}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.reDownloadBtn}
                                        onPress={() => handleReDownloadPDFFromGroup(group)}
                                    >
                                        <Text style={styles.reDownloadText}>📥</Text>
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            ))}
                            {filteredHistoryGroups.length === 0 && (
                                <View style={styles.emptyHistory}>
                                    <Text style={styles.emptyHistoryText}>ไม่พบประวัติการจ่ายตามเงื่อนไขที่ค้นหา</Text>
                                </View>
                            )}
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* History Detail Modal */}
            <Modal visible={detailModalVisible} transparent animationType="fade" onRequestClose={() => setDetailModalVisible(false)}>
                <View style={styles.detailModalOverlay}>
                    <View style={styles.detailModalContent}>
                        <View style={styles.detailHeader}>
                            <View>
                                <Text style={styles.detailTitle}>รายละเอียดรอบการจ่าย</Text>
                                {selectedGroup && (
                                    <View>
                                        <Text style={styles.detailSub}>
                                            {selectedGroup.isTransfer ? 'ผู้รับบัญชี: ' : 'ช่างผู้รับ: '} {selectedGroup.techCode}
                                        </Text>
                                        <Text style={styles.detailSub}>
                                            ผู้จ่าย: {selectedGroup.first_name || 'Admin'} {selectedGroup.last_name || ''}
                                        </Text>
                                        <Text style={styles.detailSub}>
                                            เวลา: {new Date(selectedGroup.timestamp).toLocaleString('th-TH')}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={styles.detailCloseBtn}>
                                <Text style={styles.detailCloseText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.detailStats}>
                            <View style={styles.statBox}>
                                <Text style={styles.statLabel}>จำนวนทั้งหมด</Text>
                                <Text style={styles.statValue}>{selectedGroup?.seals.length || 0} ตัว</Text>
                            </View>
                        </View>

                        <View style={styles.detailTableHead}>
                            <Text style={styles.detailTh}>#</Text>
                            <Text style={styles.detailTh}>หมายเลขซีล (Seal Number)</Text>
                        </View>

                        <ScrollView style={styles.detailList}>
                            {selectedGroup?.seals.map((seal: string, idx: number) => (
                                <View key={idx} style={styles.detailRow}>
                                    <Text style={[styles.detailTd, { width: 40 }]}>{idx + 1}</Text>
                                    <Text style={[styles.detailTd, { fontWeight: 'bold', color: colors.primaryPurple }]}>{seal}</Text>
                                </View>
                            ))}
                        </ScrollView>

                        <View style={styles.detailFooter}>
                            <TouchableOpacity
                                style={styles.detailPrintBtn}
                                onPress={() => {
                                    handleReDownloadPDFFromGroup(selectedGroup);
                                    setDetailModalVisible(false);
                                }}
                            >
                                <Text style={styles.detailPrintBtnText}>📥 โหลดใบจ่ายซีล (PDF)</Text>
                            </TouchableOpacity>
                        </View>
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
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: colors.primaryPurple },
    sectionHeaderRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 15 
    },

    formGroup: { marginBottom: 15 },
    techSelector: {
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
    techPlaceholder: { fontSize: 14, color: '#aaa' },
    dropdownIcon: { color: '#999', fontSize: 14 },

    recipientTypeContainer: { flexDirection: 'row', marginBottom: 15, backgroundColor: '#f5f5f5', borderRadius: 8, padding: 4 },
    recipientTypeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    recipientTypeBtnActive: { backgroundColor: 'white', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    recipientTypeText: { color: '#666', fontWeight: '500' },
    recipientTypeTextActive: { color: colors.primaryPurple, fontWeight: 'bold' },

    techModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    techModalContent: {
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
    techModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    techModalTitle: { fontSize: 20, fontWeight: 'bold', color: colors.primaryPurple },
    closeBtn: { fontSize: 24, color: '#999' },
    techSearchInput: {
        height: 48,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 8,
        paddingHorizontal: 15,
        fontSize: 14,
        backgroundColor: '#fafafa',
        marginBottom: 10,
    },
    techList: { flex: 1 },
    techItem: {
        paddingVertical: 12,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        alignItems: 'center',
    },
    techAvatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primaryPurple,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    techAvatarTextSmall: { color: 'white', fontSize: 14, fontWeight: 'bold' },
    techItemName: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    techItemSub: { fontSize: 12, color: '#666', marginTop: 2 },
    emptyTechList: { padding: 20, alignItems: 'center' },
    emptyTechText: { color: '#999', fontSize: 14 },

    selectedTechCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
    techAvatar: { width: 45, height: 45, borderRadius: 25, backgroundColor: colors.primaryPurple, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    techAvatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    techInfo: { flex: 1 },
    techName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    techDetail: { fontSize: 12, color: '#666' },
    techBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, alignSelf: 'flex-start', marginTop: 4 },
    techBadgeText: { fontSize: 10, color: '#4caf50', fontWeight: 'bold' },
    removeTechBtn: { padding: 8 },
    removeTechText: { fontSize: 16, color: '#999' },

    tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', marginBottom: 20 },
    tab: { paddingVertical: 10, paddingHorizontal: 15, marginRight: 15 },
    activeTab: { borderBottomWidth: 2, borderBottomColor: colors.primaryPurple },
    tabText: { fontSize: 14, color: '#666' },
    activeTabText: { color: colors.primaryPurple, fontWeight: 'bold' },

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

    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    countBadge: { backgroundColor: '#f3e5f5', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
    countText: { color: colors.primaryPurple, fontWeight: 'bold', fontSize: 13 },

    tableHead: { flexDirection: 'row', backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 10 },
    th: { fontSize: 12, fontWeight: 'bold', color: '#999' },

    listContainer: { flex: 1, minHeight: 0 },
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

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: 350, backgroundColor: 'white', borderRadius: 20, padding: 30, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10 },
    modalIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    modalIcon: { fontSize: 40 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 10 },
    modalMessage: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 25, lineHeight: 22 },
    modalBtn: { width: '100%', height: 50, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    modalBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

    historyBtn: {
        marginLeft: 15,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.primaryPurple,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fdfbff',
    },
    historyBtnText: { color: colors.primaryPurple, fontSize: 14, fontWeight: 'bold' },
    historyModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyModalContent: {
        width: '60%',
        maxHeight: '80%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    historyModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    historyModalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    historyModalSub: { fontSize: 14, color: '#888', marginTop: 4 },
    historyCloseBtn: { padding: 4 },
    historyCloseText: { fontSize: 24, color: '#bbb' },
    
    historyFilterContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginBottom: 15,
        gap: 12,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    historyFilterItem: {
        flexDirection: 'column',
    },
    historyFilterLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 6,
        fontWeight: 'bold',
    },
    historyFilterInput: {
        height: 40,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        backgroundColor: '#f9f9f9',
        fontSize: 14,
        minWidth: 140,
    },
    historyClearFilterBtn: {
        height: 40,
        paddingHorizontal: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffebee',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ffcdd2',
    },
    historyClearFilterText: {
        color: '#c62828',
        fontSize: 13,
        fontWeight: 'bold',
    },

    historyTableHead: {
        flexDirection: 'row',
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    historyTh: { fontSize: 13, fontWeight: 'bold', color: '#666' },
    historyList: { flex: 1 },
    historyRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    historyDate: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    historyTime: { fontSize: 12, color: '#999', marginTop: 2 },
    historyAction: { fontSize: 14, color: '#444', fontWeight: '500' },
    historyUser: { fontSize: 12, color: '#888', marginTop: 4 },
    reDownloadBtn: {
        flex: 1.5,
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
    },
    reDownloadText: { fontSize: 20 },
    emptyHistory: { padding: 40, alignItems: 'center' },
    emptyHistoryText: { color: '#bbb', fontSize: 15 },
    countBadgeSmall: {
        backgroundColor: '#f3e5f5',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        minWidth: 30,
        alignItems: 'center',
    },
    countTextSmall: { color: colors.primaryPurple, fontWeight: 'bold', fontSize: 12 },

    detailModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailModalContent: {
        width: '40%',
        maxHeight: '75%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
    },
    detailHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    detailTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    detailSub: { fontSize: 13, color: '#666', marginTop: 4 },
    detailCloseBtn: { padding: 4 },
    detailCloseText: { fontSize: 20, color: '#bbb' },
    detailStats: { flexDirection: 'row', marginBottom: 20 },
    statBox: {
        backgroundColor: '#f8f9fa',
        padding: 15,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    statLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
    statValue: { fontSize: 18, fontWeight: 'bold', color: colors.primaryPurple },
    detailTableHead: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    detailTh: { fontSize: 13, fontWeight: 'bold', color: '#999' },
    detailList: { flex: 1 },
    detailRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9',
    },
    detailTd: { fontSize: 14, color: '#444' },
    detailFooter: {
        marginTop: 20,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    detailPrintBtn: {
        backgroundColor: colors.primaryPurple,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    detailPrintBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },
});
