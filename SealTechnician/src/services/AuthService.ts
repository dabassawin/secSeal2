import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://192.168.1.38:3000/api'; // Updated to local IP for device testing

export const AuthService = {
    async login(username: string, password: string): Promise<any> {
        try {
            const response = await fetch(`${API_URL}/technician/login`, {
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
    }
};
