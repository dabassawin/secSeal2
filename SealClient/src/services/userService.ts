import api from './api';

export interface CreateUserRequest {
    emp_id: number;
    title_s_desc: string;
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    role: string;
}

export const userService = {
    // Create new user (Admin only)
    createUser: async (data: CreateUserRequest) => {
        try {
            const response = await api.post('/api/users', data);
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
