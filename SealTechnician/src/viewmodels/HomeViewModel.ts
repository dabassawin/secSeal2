import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { TechnicianService, Seal } from '../services/TechnicianService';
import { AuthService } from '../services/AuthService';
import { parseJwt } from '../utils/jwt';
import { SealStatus } from '../constants/status';

export const useHomeViewModel = (specificTechId?: number) => {
    const [seals, setSeals] = useState<Seal[]>([]);
    const [activeSeals, setActiveSeals] = useState<Seal[]>([]);
    const [historySeals, setHistorySeals] = useState<Seal[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);

    const [userInfo, setUserInfo] = useState<{ id?: number, username: string, role: string, first_name?: string, last_name?: string, is_center?: boolean, pea_code?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSeals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch seals and notifications in parallel
            let sealsData: Seal[] = [];
            let notificationsData: any[] = [];

            // Get current user info for filtering
            let currentUserId: number | undefined = userInfo?.id;
            if (!currentUserId) {
                const me = await TechnicianService.getMe().catch(() => null);
                if (me) currentUserId = me.id;
            }

            if (specificTechId) {
                sealsData = await TechnicianService.getSealsByTechnicianId(specificTechId);
            } else {
                const [sData, nData] = await Promise.all([
                    TechnicianService.getAssignedSeals(),
                    TechnicianService.getNotifications().catch(() => []) // Fallback to empty array if fails
                ]);
                sealsData = sData;
                notificationsData = nData;
            }

            setSeals(sealsData);
            setNotifications(notificationsData);

            // Filter seals
            // For "Active" seals, we only want those actually assigned to the current user
            // and in ISSUED or READY status. 
            // If they are ISSUED but assigned to someone else, they are effectively "History".
            const active = sealsData.filter(s => {
                const isMySeal = !currentUserId || s.assigned_to_technician === currentUserId;
                const isActiveStatus = s.status === SealStatus.ISSUED ||
                    (s.status === SealStatus.READY && s.return_remarks !== 'ไม่ได้ใช้งาน (คืนคลัง)');
                return isMySeal && isActiveStatus;
            });

            const history = sealsData.filter(s => {
                const isNotMyActiveSeal = currentUserId && s.assigned_to_technician !== currentUserId;
                const isHistoryStatus = s.status === SealStatus.INSTALLED ||
                    s.status === SealStatus.USED ||
                    s.status === SealStatus.DAMAGED ||
                    s.status === SealStatus.PENDING_RETURN ||
                    (s.status === SealStatus.READY && s.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)');
                return isNotMyActiveSeal || isHistoryStatus;
            });

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
                pea_code: data.pea_code
            });
        } catch (error) {
            console.log('Failed to fetch full profile, falling back to JWT:', error);
            const token = await AuthService.getToken();
            if (token) {
                const decoded = parseJwt(token);
                if (decoded) {
                    setUserInfo({
                        id: decoded.tech_id,
                        username: decoded.username || 'Technician',
                        role: decoded.role || ''
                    });
                }
            }
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
        historySeals,
        notifications,
        userInfo,
        isLoading,
        error,
        fetchSeals: refresh
    };
};
