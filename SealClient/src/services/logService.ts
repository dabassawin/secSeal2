
import { Log, LogResponse } from '@/types';

// Use localhost for Android emulator (10.0.2.2) or local IP for device
// For web, localhost is fine
const API_URL = 'http://localhost:3000/api';

export const logService = {
    getAllLogs: async (): Promise<LogResponse | null> => {
        try {
            // Note: In a real app, you'd attach the Bearer token here
            // const token = await AsyncStorage.getItem('userToken');
            const response = await fetch(`${API_URL}/logs`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                console.error('Error fetching logs:', response.statusText);
                return null;
            }

            const data: LogResponse = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching logs:', error);
            return null;
        }
    },

    getLogsByType: async (type: 'created' | 'issued' | 'used' | 'returned'): Promise<Log[]> => {
        try {
            const response = await fetch(`${API_URL}/logs/type/${type}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            return data.logs || [];
        } catch (error) {
            console.error(`Error fetching logs type ${type}:`, error);
            return [];
        }
    }
};
