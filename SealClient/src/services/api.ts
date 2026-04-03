import axios from 'axios';
import { Platform } from 'react-native';

// For testing on physical devices/Expo, use actual server IP
// For emulator testing, use 10.0.2.2 (Android) or localhost (iOS)
// For web/emulator use localhost. For physical device use LAN IP (e.g. 172.22.1.40)
const BASE_URL = 'http://192.168.137.1:3000';
// Alternative for Android Emulator: 'http://10.0.2.2:3000'
// Alternative for iOS Simulator: 'http://localhost:3000'

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export default api;
