import api from './api';

export interface CreateUserRequest {
    emp_id: number;
    title_s_desc: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    role: string;
    pea_code?: string;
    pea_short?: string;
    pea_name?: string;
}

export const userService = {
    // Get MasPea list
    getMasPea: async () => {
        try {
            const response = await api.get('/api/maspea');
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Create new user (Admin only)
    createUser: async (data: CreateUserRequest) => {
        try {
            const response = await api.post('/api/users', data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Update user
    updateUser: async (username: string, data: any) => {
        try {
            const response = await api.put(`/api/users/${username}`, data);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Get user by username
    getUser: async (username: string) => {
        try {
            const response = await api.get(`/api/users/${username}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};
