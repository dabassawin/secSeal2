import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { TechnicianService, Seal } from '../services/TechnicianService';
import { AuthService } from '../services/AuthService';
import { parseJwt } from '../utils/jwt';
import { SealStatus } from '../constants/status';

export const useHomeViewModel = () => {
    const [seals, setSeals] = useState<Seal[]>([]);
    const [activeSeals, setActiveSeals] = useState<Seal[]>([]);
    const [historySeals, setHistorySeals] = useState<Seal[]>([]);
    const [notifications, setNotifications] = useState<any[]>([]);

    const [userInfo, setUserInfo] = useState<{ username: string, role: string, first_name?: string, last_name?: string, is_center?: boolean, pea_code?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSeals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Fetch seals and notifications in parallel
            const [sealsData, notificationsData] = await Promise.all([
                TechnicianService.getAssignedSeals(),
                TechnicianService.getNotifications().catch(() => []) // Fallback to empty array if fails
            ]);

            setSeals(sealsData);
            setNotifications(notificationsData);

            // Filter seals
            const active = sealsData.filter(s =>
                s.status === SealStatus.ISSUED ||
                (s.status === SealStatus.READY && s.return_remarks !== 'ไม่ได้ใช้งาน (คืนคลัง)')
            );
            const history = sealsData.filter(s =>
                s.status === SealStatus.INSTALLED ||
                s.status === SealStatus.USED ||
                s.status === SealStatus.DAMAGED ||
                s.status === SealStatus.PENDING_RETURN ||
                (s.status === SealStatus.READY && s.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)')
            );

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
    }, []);

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
