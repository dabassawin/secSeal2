import api from './api';
import { SealReport, Seal } from '@/types';

export interface SealCheckResult {
    seal_number: string;
    is_available: boolean;
    status: string;
    reason: string;
}

export const sealService = {
    getReport: async (peaCode?: string): Promise<SealReport | null> => {
        try {
            const url = peaCode ? `/api/seals/report?pea_code=${encodeURIComponent(peaCode)}` : '/api/seals/report';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching seal report:', error);
            return null;
        }
    },


    getSeals: async (peaCode?: string): Promise<Seal[]> => {
        try {
            const url = peaCode ? `/api/seals?pea_code=${encodeURIComponent(peaCode)}` : '/api/seals';
            const response = await api.get(url);
            return Array.isArray(response.data) ? response.data : (response.data.seals || []);
        } catch (error) {
            console.error('Error fetching seals:', error);
            return [];
        }
    },

    createSeal: async (data: any) => {
        return await api.post('/api/seals', data);
    },

    generateBatches: async (batches: { seal_number: string; count: number; pea_code: string; status?: string; create_remarks?: string }[]) => {
        return await api.post('/api/seals/generate-batches', { batches });
    },

    checkSealExists: async (sealNumber: string) => {
        try {
            const response = await api.get(`/api/seals/check/${sealNumber}`);
            return response.data;
        } catch (error) {
            throw error;
        }
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
    checkSeals: async (sealNumbers: string[]): Promise<SealCheckResult[]> => {
        try {
            const response = await api.post('/api/seals/check', { seal_numbers: sealNumbers });
            return response.data.results;
        } catch (error) {
            console.error('Error checking seals:', error);
            throw error;
        }
    },

    assignSealsByTechCode: async (technicianCode: string, sealNumbers: string[], remark?: string, sealRemarks?: Record<string, string>) => {
        return await api.post('/api/seals/assign-by-techcode', {
            technician_code: technicianCode,
            seal_numbers: sealNumbers,
            remark,
            seal_remarks: sealRemarks
        });
    },

    cancelSeal: async (sealNumber: string) => {
        return await api.put(`/api/seals/${sealNumber}/cancel`);
    },

    updateSealStatus: async (sealNumber: string, status: string) => {
        return await api.put(`/api/seals/${sealNumber}/status`, { status });
    },

    getPendingReturns: async (peaCode?: string) => {
        try {
            const url = peaCode
                ? `/api/seals/pending-returns?pea_code=${encodeURIComponent(peaCode)}`
                : '/api/seals/pending-returns';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching pending returns:', error);
            return { items: [], total: 0 };
        }
    },

    acceptReturn: async (sealNumber: string) => {
        return await api.put(`/api/seals/${sealNumber}/accept-return`);
    },
};
