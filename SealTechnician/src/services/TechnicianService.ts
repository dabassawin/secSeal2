import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.1.38:3000/api';

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

            console.log('Sending Token:', token);

            const response = await fetch(`${API_URL}/technician/my-seals`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || data.error || 'Failed to fetch seals');
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
