import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { TechnicianService, Seal } from '../services/TechnicianService';
import { AuthService } from '../services/AuthService';
import { parseJwt } from '../utils/jwt';

export const useHomeViewModel = () => {
    const [seals, setSeals] = useState<Seal[]>([]);
    const [activeSeals, setActiveSeals] = useState<Seal[]>([]);
    const [historySeals, setHistorySeals] = useState<Seal[]>([]);

    const [userInfo, setUserInfo] = useState<{ username: string, role: string, first_name?: string, last_name?: string } | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchSeals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await TechnicianService.getAssignedSeals();
            setSeals(data);

            // Filter seals
            const active = data.filter(s =>
                s.status === 'จ่าย' ||
                (s.status === 'พร้อมใช้งาน' && s.return_remarks !== 'ไม่ได้ใช้งาน (คืนคลัง)')
            );
            const history = data.filter(s =>
                s.status === 'ติดตั้งแล้ว' ||
                s.status === 'ใช้งานแล้ว' ||
                s.status === 'เสียหาย' ||
                s.status === 'รอตรวจสอบคืน' ||
                (s.status === 'พร้อมใช้งาน' && s.return_remarks === 'ไม่ได้ใช้งาน (คืนคลัง)')
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
                last_name: data.last_name
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

    useFocusEffect(
        useCallback(() => {
            loadUserInfo();
            fetchSeals();
        }, [])
    );

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
