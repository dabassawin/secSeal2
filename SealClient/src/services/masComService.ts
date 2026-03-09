import api from './api';

export const masComService = {
    // Get MasCom list
    getMasComs: async () => {
        try {
            const response = await api.get('/api/mascom');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching MasComs:', error);
            throw error;
        }
    },

    // Get MasCom by code
    getComByCode: async (code: string) => {
        try {
            const response = await api.get(`/api/mascom/${code}`);
            return response.data;
        } catch (error) {
            throw error;
        }
    },

    // Create new MasCom
    createMasCom: async (data: { com_code: string; name_th: string; name_eng: string; pea_code: string }) => {
        try {
            const response = await api.post('/api/mascom', data);
            return response.data;
        } catch (error) {
            throw error;
        }
    }
};
