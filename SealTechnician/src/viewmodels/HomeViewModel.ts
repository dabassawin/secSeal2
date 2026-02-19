import { useState, useEffect } from 'react';
import { TechnicianService, Seal } from '../services/TechnicianService';
import { AuthService } from '../services/AuthService';
import { parseJwt } from '../utils/jwt';

export const useHomeViewModel = () => {
    const [seals, setSeals] = useState<Seal[]>([]);
    const [activeSeals, setActiveSeals] = useState<Seal[]>([]);
    const [historySeals, setHistorySeals] = useState<Seal[]>([]);

    const [userInfo, setUserInfo] = useState<{ username: string, role: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSeals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await TechnicianService.getAssignedSeals();
            setSeals(data);

            // Filter seals
            const active = data.filter(s => s.status === 'จ่าย' || s.status === 'พร้อมใช้งาน');
            const history = data.filter(s => s.status === 'ติดตั้งแล้ว' || s.status === 'ใช้งานแล้ว');

            setActiveSeals(active);
            setHistorySeals(history);

        } catch (err: any) {
            setError(err.message || 'Failed to load seals');
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserInfo = async () => {
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
    };

    useEffect(() => {
        loadUserInfo();
        fetchSeals();
    }, []);

    const refresh = () => {
        fetchSeals();
        loadUserInfo();
    };

    return {
        seals,
        activeSeals,
        historySeals,
        userInfo,
        isLoading,
        error,
        fetchSeals: refresh
    };
};
