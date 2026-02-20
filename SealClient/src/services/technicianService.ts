import api from './api';
import { Technician } from '@/types';

export const technicianService = {
    getTechnicians: async (peaCode?: string, isPrefix?: boolean): Promise<Technician[]> => {
        try {
            let url = '/api/technician/list';
            const params = new URLSearchParams();
            if (peaCode) {
                params.append('pea_code', peaCode);
            }
            if (isPrefix) {
                params.append('is_prefix', 'true');
            }

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const response = await api.get(url);
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
