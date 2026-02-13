import api from './api';
import { Log, LogResponse } from '@/types';

export const logService = {
    getAllLogs: async (): Promise<LogResponse | null> => {
        try {
            const response = await api.get('/api/logs');
            return response.data;
        } catch (error) {
            console.error('Error fetching logs:', error);
            return null;
        }
    },

    getLogsByType: async (type: 'created' | 'issued' | 'used' | 'returned'): Promise<Log[]> => {
        try {
            const response = await api.get(`/api/logs/type/${type}`);
            return response.data.logs || [];
        } catch (error) {
            console.error(`Error fetching logs type ${type}:`, error);
            return [];
        }
    }
};
