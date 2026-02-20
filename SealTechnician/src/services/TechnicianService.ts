import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, getApiUrl } from '../config/api.config';

export interface Seal {
    id: number;
    seal_number: string;
    status: string;
    assigned_to_technician?: number;
    image1?: string;
    image2?: string;
    installed_serial?: string;
}

export const TechnicianService = {
    async getAssignedSeals(): Promise<Seal[]> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.TECHNICIAN_MY_SEALS), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to fetch seals');
            }

            const data = await response.json();
            if (Array.isArray(data)) {
                return data;
            }
            return data.seals || [];
        } catch (error) {
            console.error('Fetch Seals Error:', error);
            throw error;
        }
    }
};
