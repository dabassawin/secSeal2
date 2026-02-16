import api from './api';
import { SealReport, Seal } from '@/types';

export const sealService = {
    getReport: async (): Promise<SealReport | null> => {
        try {
            const response = await api.get('/api/seals/report');
            return response.data;
        } catch (error) {
            console.error('Error fetching seal report:', error);
            return null;
        }
    },

    getSeals: async (): Promise<Seal[]> => {
        try {
            const response = await api.get('/api/seals');
            // Backend returns a direct array of seals
            return Array.isArray(response.data) ? response.data : (response.data.seals || []);
        } catch (error) {
            console.error('Error fetching seals:', error);
            return [];
        }
    },

    createSeal: async (data: any) => {
        return await api.post('/api/seals', data);
    },

    assignSeal: async (data: any) => {
        return await api.post('/api/seals/assign', data);
    },

    getSealByNumber: async (sealNumber: string): Promise<Seal | null> => {
        try {
            const response = await api.get(`/api/seals/${sealNumber}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching seal ${sealNumber}:`, error);
            return null;
        }
    },

    getSealLogs: async (sealNumber: string): Promise<any[]> => {
        try {
            const response = await api.get(`/api/seals/${sealNumber}/logs`);
            return response.data || [];
        } catch (error) {
            console.error(`Error fetching logs for seal ${sealNumber}:`, error);
            return [];
        }
    },

    // New methods for Assignment Screen
    checkSeals: async (sealNumbers: string[]): Promise<{ found: string[]; unavailable: string[] }> => {
        try {
            const response = await api.post('/api/seals/check', { seal_numbers: sealNumbers });
            return response.data;
        } catch (error) {
            console.error('Error checking seals:', error);
            throw error;
        }
    },

    assignSealsByTechCode: async (technicianCode: string, sealNumbers: string[], remark?: string) => {
        return await api.post('/api/seals/assign-by-techcode', {
            technician_code: technicianCode,
            seal_numbers: sealNumbers,
            remark
        });
    },

    cancelSeal: async (sealNumber: string) => {
        return await api.put(`/api/seals/${sealNumber}/cancel`);
    }
};
