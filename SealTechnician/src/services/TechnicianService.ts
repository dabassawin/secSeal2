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
    issued_at?: string;
    used_at?: string;
    created_at?: string;
    updated_at?: string;
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
    },

    async getMe(): Promise<any> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.TECHNICIAN_ME), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || data.error || 'Failed to fetch user profile');
            }

            return await response.json();
        } catch (error) {
            console.error('Fetch Me Error:', error);
            throw error;
        }
    },

    async uploadAvatar(imageUri: string): Promise<string> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            // Construct form data
            const formData = new FormData();

            // Extract filename from URI
            const uriParts = imageUri.split('/');
            const fileName = uriParts[uriParts.length - 1] || 'avatar.jpg';

            // Infer type
            const match = /\.(\w+)$/.exec(fileName);
            const type = match ? `image/${match[1]}` : `image/jpeg`;

            formData.append('avatar', {
                uri: imageUri,
                name: fileName,
                type
            } as any);

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.TECHNICIAN_AVATAR), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Do not set Content-Type header manually for FormData, fetch handles it with boundary
                },
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to upload image');
            }

            const data = await response.json();
            return data.profile_picture;
        } catch (error) {
            console.error('Upload Avatar Error:', error);
            throw error;
        }
    },

    async returnSeal(sealId: number, sealNumber: string, reason: string, imageUri?: string): Promise<any> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            const formData = new FormData();
            formData.append('seal_id', sealId.toString());
            formData.append('seal_number', sealNumber);
            formData.append('reason', reason);

            if (imageUri) {
                const uriParts = imageUri.split('/');
                const fileName = uriParts[uriParts.length - 1] || 'return_proof.jpg';
                const match = /\.(\w+)$/.exec(fileName);
                const type = match ? `image/${match[1]}` : `image/jpeg`;

                formData.append('image', {
                    uri: imageUri,
                    name: fileName,
                    type
                } as any);
            }

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.TECHNICIAN_RETURN_SEAL), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to return seal');
            }

            return await response.json();
        } catch (error) {
            console.error('Return Seal Error:', error);
            throw error;
        }
    }
};
