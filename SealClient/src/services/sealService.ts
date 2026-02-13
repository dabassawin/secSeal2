
import { SealReport } from '@/types';

const API_URL = 'http://localhost:3000/api';

export const sealService = {
    getReport: async (): Promise<SealReport | null> => {
        try {
            const response = await fetch(`${API_URL}/seals/report`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    // 'Authorization': `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                console.error('Error fetching seal report:', response.statusText);
                return null;
            }

            const data: SealReport = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching seal report:', error);
            return null;
        }
    }
};
