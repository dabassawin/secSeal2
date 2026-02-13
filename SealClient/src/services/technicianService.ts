import api from './api';
import { Technician } from '@/types';

export const technicianService = {
    getTechnicians: async (): Promise<Technician[]> => {
        try {
            const response = await api.get('/api/technician/list');
            return response.data || [];
        } catch (error) {
            console.error('Error fetching technicians:', error);
            return [];
        }
    },

    registerTechnician: async (data: any) => {
        return await api.post('/api/technician/register', data);
    },

    importTechnicians: async (data: any[]) => {
        return await api.post('/api/technician/import', data);
    },

    updateTechnician: async (id: number, data: any) => {
        return await api.put(`/api/technician/update/${id}`, data);
    },

    deleteTechnician: async (id: number) => {
        return await api.delete(`/api/technician/delete/${id}`);
    }
};
