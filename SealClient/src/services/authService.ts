import api, { setAuthToken } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Types
export interface User {
    id: number;
    username: string;
    role?: string; // For staff
    first_name?: string; // For staff/tech
    last_name?: string; // For staff/tech
    technician_code?: string; // For tech
    [key: string]: any;
}

export interface LoginResponse {
    token: string;
    user?: User; // Staff login returns user object
    // Tech login might allow fetching user details separately if not in response
}

export const authService = {
    // Staff Login
    loginStaff: async (username: string, password: string): Promise<User> => {
        try {
            const response = await api.post('/api/auth/login', { username, password });
            const { token, user } = response.data;

            if (token) {
                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('userRole', 'staff');
                setAuthToken(token);
            }

            return user || { id: 0, username, role: 'staff' };
        } catch (error) {
            throw error;
        }
    },

    // Technician Login
    loginTechnician: async (username: string, password: string): Promise<User> => {
        try {
            const response = await api.post('/api/technician/login', { username, password });
            const { token } = response.data;

            if (token) {
                await AsyncStorage.setItem('token', token);
                await AsyncStorage.setItem('userRole', 'technician');
                setAuthToken(token);

                // Fetch tech details after login if not provided
                // Assuming there's an endpoint to get profile or use decoded token
                // For now, return a placeholder or fetch if API exists
                // Per docs: GET /api/technician/my-seals uses tech token, implies we are authenticated.
                // We might need an endpoint to get "Me". 
                // Docs don't explicitly show "Get My Profile", but usually it's needed.
                // For now, construct a basic user object.
                return { id: 0, username, role: 'technician' };
            }
            throw new Error('No token received');
        } catch (error) {
            throw error;
        }
    },

    logout: async () => {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userRole');
        setAuthToken(null);
    },

    getToken: async () => {
        return await AsyncStorage.getItem('token');
    },

    getUserRole: async () => {
        return await AsyncStorage.getItem('userRole');
    }
};
