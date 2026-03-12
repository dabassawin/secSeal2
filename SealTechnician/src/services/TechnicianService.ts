import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, getApiUrl } from '../config/api.config';
import { AuthService } from './AuthService';

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
    returned_at?: string;
    return_remarks?: string;
    employee_code?: string;
    issue_remark?: string;
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
    },

    async checkReturnableSeal(sealNumber: string): Promise<{ message: string, seal: Seal }> {
        try {
            const token = await AuthService.getToken();
            // console.log("Token sent:", token?.substring(0, 10) + "...");

            if (!token) {
                throw new Error('Not authenticated');
            }

            const url = getApiUrl(`${API_CONFIG.endpoints.TECHNICIAN_CHECK_RETURN_SEAL}/${sealNumber}`);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to check seal status');
            }

            return await response.json();
        } catch (error) {
            // console.error('Check Returnable Seal Error:', error);
            throw error;
        }
    },

    async getTechniciansByPeaCode(peaCode: string): Promise<any[]> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            const response = await fetch(`${getApiUrl(API_CONFIG.endpoints.TECHNICIANS_LIST)}?pea_code=${peaCode}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to fetch technicians');
            }

            return await response.json();
        } catch (error) {
            console.error('Get Technicians Error:', error);
            throw error;
        }
    },

    async getSealsByTechnicianId(techId: number): Promise<Seal[]> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            const response = await fetch(`${getApiUrl('/technician')}/seals/center-list?technician_id=${techId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to fetch technician seals');
            }

            return await response.json();
        } catch (error) {
            console.error('Get Technician Seals Error:', error);
            throw error;
        }
    },

    async transferSeals(targetTechnicianId: number, sealNumbers: string[]): Promise<any> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.TECHNICIAN_TRANSFER_SEAL), {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    target_technician_id: targetTechnicianId,
                    seal_numbers: sealNumbers,
                }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to transfer seals');
            }

            return await response.json();
        } catch (error) {
            console.error('Transfer Seals Error:', error);
            throw error;
        }
    },

    async getNotifications(): Promise<any[]> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.TECHNICIAN_NOTIFICATIONS), {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to fetch notifications');
            }

            return await response.json();
        } catch (error) {
            console.error('Get Notifications Error:', error);
            throw error;
        }
    },

    async clearNotifications(): Promise<void> {
        try {
            const token = await SecureStore.getItemAsync('userToken');
            if (!token) throw new Error('No token found');

            const response = await fetch(getApiUrl(API_CONFIG.endpoints.TECHNICIAN_NOTIFICATIONS), {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || data.message || 'Failed to clear notifications');
            }
        } catch (error) {
            console.error('Clear Notifications Error:', error);
            throw error;
        }
    }
};
