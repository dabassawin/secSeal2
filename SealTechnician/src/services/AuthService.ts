import * as SecureStore from 'expo-secure-store';
import { API_CONFIG, getApiUrl } from '../config/api.config';

export const AuthService = {
    async login(username: string, password: string): Promise<any> {
        try {
            const response = await fetch(getApiUrl(API_CONFIG.endpoints.TECHNICIAN_LOGIN), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || 'Login failed');
            }

            if (data.token) {
                await SecureStore.setItemAsync('userToken', data.token);
            }

            return data;
        } catch (error) {
            console.error('Login Error:', error);
            throw error;
        }
    },

    async logout(): Promise<void> {
        await SecureStore.deleteItemAsync('userToken');
    },

    async getToken(): Promise<string | null> {
        return await SecureStore.getItemAsync('userToken');
    },

    async updateDeviceToken(token: string): Promise<void> {
        try {
            const userToken = await this.getToken();
            if (!userToken) return;

            // Wait, we need to map this in api.config.ts but since it's just one, I'll use the constant.
            const url = getApiUrl(API_CONFIG.endpoints.TECHNICIAN_NOTIFICATIONS ? '/technician/device-token' : '/technician/device-token');

            await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${userToken}`,
                },
                body: JSON.stringify({ expo_push_token: token }),
            });
        } catch (error) {
            console.error('Update Device Token Error:', error);
        }
    }
};

