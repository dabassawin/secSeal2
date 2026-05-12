import api from './api';
import { SealReport, Seal } from '@/types';

export interface SealCheckResult {
    seal_number: string;
    is_available: boolean;
    status: string;
    reason: string;
}

export const sealService = {
    getReport: async (peaCode?: string, inventoryDepartment?: string): Promise<SealReport | null> => {
        try {
            const params: string[] = [];
            if (peaCode) params.push(`pea_code=${encodeURIComponent(peaCode)}`);
            if (inventoryDepartment) params.push(`inventory_department=${encodeURIComponent(inventoryDepartment)}`);
            const url = params.length > 0 ? `/api/seals/report?${params.join('&')}` : '/api/seals/report';
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching seal report:', error);
            return null;
        }
    },


    getSeals: async (peaCode?: string, pendingPeaCode?: string): Promise<Seal[]> => {
        try {
            let url = '/api/seals?';
            if (peaCode) url += `pea_code=${encodeURIComponent(peaCode)}&`;
            if (pendingPeaCode) url += `pending_pea_code=${encodeURIComponent(pendingPeaCode)}&`;
            
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
    checkSeals: async (sealNumbers: string[], peaCode?: string): Promise<SealCheckResult[]> => {
        try {
            const response = await api.post('/api/seals/check', { seal_numbers: sealNumbers, pea_code: peaCode });
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

    bulkUpdateStatus: async (sealNumbers: string[], status: string, remark: string) => {
        return await api.post('/api/seals/bulk-update-status', { seal_numbers: sealNumbers, status, remark });
    },

    bulkTransferPeaCode: async (sealNumbers: string[], newPeaCode: string) => {
        return await api.post('/api/seals/bulk-transfer', { seal_numbers: sealNumbers, new_pea_code: newPeaCode });
    },

    bulkRecallSeals: async (sealNumbers: string[]) => {
        return await api.post('/api/seals/bulk-recall', { seal_numbers: sealNumbers });
    },

    bulkConfirmCompanyTransfer: async (sealNumbers: string[], peaCode: string) => {
        return await api.post('/api/seals/bulk-confirm-transfer', { seal_numbers: sealNumbers, pea_code: peaCode });
    },

    transferToAccounting: async (sealNumbers: string[]) => {
        return await api.post('/api/seals/transfer-to-user', { seal_numbers: sealNumbers });
    },

    transferToUser: async (targetUsername: string, sealNumbers: string[]) => {
        return await api.post('/api/seals/transfer-to-user', {
            seal_numbers: sealNumbers,
            receiver_username: targetUsername
        });
    },

    confirmUserReceipt: async (sealNumbers: string[]) => {
        return await api.post('/api/seals/confirm-user', { seal_numbers: sealNumbers });
    },

    getIssuedLogs: async (): Promise<any[]> => {
        try {
            const response = await api.get('/api/logs/issued');
            return response.data.logs || [];
        } catch (error) {
            console.error('Error fetching issued logs:', error);
            return [];
        }
    },
};
