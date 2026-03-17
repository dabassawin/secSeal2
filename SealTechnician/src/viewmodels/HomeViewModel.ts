import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { TechnicianService, Seal } from '../services/TechnicianService';
import { AuthService } from '../services/AuthService';
import { parseJwt } from '../utils/jwt';
import { SealStatus } from '../constants/status';

export const useHomeViewModel = (specificTechId?: number) => {
    const [seals, setSeals] = useState<Seal[]>([]);
    const [activeSeals, setActiveSeals] = useState<Seal[]>([]);
    const [waitConfirmationSeals, setWaitConfirmationSeals] = useState<Seal[]>([]);
    const [historySeals, setHistorySeals] = useState<Seal[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);

    const [userInfo, setUserInfo] = useState<{ id?: number, username: string, role: string, first_name?: string, last_name?: string, is_center?: boolean, pea_code?: string, com_code?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSeals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // ✅ ALWAYS fetch fresh user info — never rely on stale React state
            // This ensures is_center and pea_code are correct when filtering
            let currentUser: typeof userInfo = null;
            const me = await TechnicianService.getMe().catch(() => null);
            if (me) {
                currentUser = {
                    id: me.id,
                    username: me.username || 'Technician',
                    role: 'technician',
                    first_name: me.first_name,
                    last_name: me.last_name,
                    is_center: me.is_center,
                    pea_code: me.pea_code
                };
                setUserInfo(currentUser);
            }

            let sealsData: Seal[] = [];
            let notificationsData: any[] = [];

            if (specificTechId) {
                sealsData = await TechnicianService.getSealsByTechnicianId(specificTechId);
            } else {
                const [sData, nData] = await Promise.all([
                    TechnicianService.getAssignedSeals(),
                    TechnicianService.getNotifications().catch(() => [])
                ]);
                sealsData = sData;
                notificationsData = nData;
            }

            setSeals(sealsData);
            setNotifications(notificationsData);

            // Filter seals using local currentUser (not stale state)
            const currentUserId = currentUser?.id;

            const active = sealsData.filter(s => {
                if (currentUser?.is_center) {
                    // Company inventory: show seals that are either:
                    // 1. READY with no assignment (from inter-company transfer)
                    // 2. ISSUED and assigned to this specific admin (from direct transfer from upper center)
                    const userPea = (currentUser.pea_code || '').trim();
                    const sealPea = (s.pea_code || '').trim();
                    const isReadyInventory = s.status === SealStatus.READY && !s.assigned_to_technician;
                    const isDirectlyAssigned = s.status === SealStatus.ISSUED && s.assigned_to_technician === currentUserId;
                    
                    return sealPea === userPea &&
                        (isReadyInventory || isDirectlyAssigned) &&
                        s.return_remarks !== 'ไม่ได้ใช้งาน (คืนคลัง)';
                }
                const isMySeal = !currentUserId || s.assigned_to_technician === currentUserId;
                const isActiveStatus = s.status === SealStatus.ISSUED ||
                    (s.status === SealStatus.READY && s.return_remarks !== 'ไม่ได้ใช้งาน (คืนคลัง)');
                return isMySeal && isActiveStatus;
            });

            const waitConfirmation = sealsData.filter(s => {
                if (currentUser?.is_center) {
                    const userPea = (currentUser.pea_code || '').trim();
                    const sealPendingPea = (s.pending_pea_code || '').trim();
                    const sealPea = (s.pea_code || '').trim();

                    // Case 1: inter-company transfer via BulkTransferPeaCode (pending_pea_code set)
                    if (sealPendingPea !== '') {
                        return s.status === SealStatus.WAIT_CONFIRMATION && sealPendingPea === userPea;
                    }
                    // Case 2: direct transfer to company admin (pending_pea_code is empty)
                    // Must also be assigned to this admin specifically, not a regular technician in the same company
                    return s.status === SealStatus.WAIT_CONFIRMATION && sealPea === userPea && s.assigned_to_technician === currentUserId;
                }
                // สำหรับช่าง: ดูซีลที่ถูกจ่ายให้เรา
                const isMySeal = !currentUserId || s.assigned_to_technician === currentUserId;
                return isMySeal && s.status === SealStatus.WAIT_CONFIRMATION && !s.pending_pea_code;
            });

            const history = sealsData.filter(s => {
                // Exclude seals waiting for confirmation from history
                if (s.status === SealStatus.WAIT_CONFIRMATION) return false;

                const isNotMyActiveSeal = currentUserId && s.assigned_to_technician !== currentUserId;
                const isHistoryStatus = s.status === SealStatus.INSTALLED ||
                    s.status === SealStatus.USED ||
                    s.status === SealStatus.DAMAGED ||
                    s.status === SealStatus.PENDING_RETURN ||
                    (s.status === SealStatus.READY && s.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)');
                return isNotMyActiveSeal || isHistoryStatus;
            });

            setWaitConfirmationSeals(waitConfirmation);
            setActiveSeals(active);
            setHistorySeals(history);

        } catch (err: any) {
            setError(err.message || 'Failed to load seals');
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserInfo = async () => {
        try {
            const data = await TechnicianService.getMe();
            setUserInfo({
                id: data.id,
                username: data.username || 'Technician',
                role: 'technician',
                first_name: data.first_name,
                last_name: data.last_name,
                is_center: data.is_center,
                pea_code: data.pea_code,
                com_code: data.com_code
            });
        } catch (error) {
            const token = await AuthService.getToken();
            if (token) {
                const decoded = parseJwt(token);
                if (decoded) {
                    setUserInfo({
                        id: decoded.tech_id,
                        username: decoded.username || 'Technician',
                        role: decoded.role || '',
                        is_center: decoded.is_center,
                        pea_code: decoded.pea_code
                    });
                }
            }
        }
    };

    const confirmSeal = async (sealNumber: string) => {
        setIsLoading(true);
        setError(null);
        try {
            await TechnicianService.confirmSealsReceipt([sealNumber]);
            await fetchSeals();
        } catch (err: any) {
            setError(err.message || 'Failed to confirm seal');
        } finally {
            setIsLoading(false);
        }
    };

    const confirmMultipleSeals = async (sealNumbers: string[]) => {
        setIsLoading(true);
        setError(null);
        try {
            await TechnicianService.confirmSealsReceipt(sealNumbers);
            await fetchSeals();
        } catch (err: any) {
            setError(err.message || 'Failed to confirm seals');
        } finally {
            setIsLoading(false);
        }
    };

    const refresh = useCallback(() => {
        fetchSeals();
        loadUserInfo();
    }, [userInfo?.id]);

    // Remove useFocusEffect from here to prevent loops when multiple hooks are used
    // or when combined with other effects. 
    // useEffect(() => { fetchSeals(); loadUserInfo(); }, []); // Instead of useFocusEffect

    return {
        seals,
        activeSeals,
        waitConfirmationSeals,
        historySeals,
        notifications,
        userInfo,
        isLoading,
        error,
        confirmSeal,
        confirmMultipleSeals,
        fetchSeals: refresh
    };
};
