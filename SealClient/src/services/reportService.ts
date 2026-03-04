import api from './api';

export interface SealReportItem {
    id: number;
    seal_number: string;
    status: string;
    pea_code: string;
    installed_serial: string;
    issue_remark: string;
    create_remarks: string;
    employee_code: string;
    created_at: string;
    issued_at: string | null;
    used_at: string | null;
    returned_at: string | null;
    updated_at: string;
    issued_by_name: string;
    technician_name: string;
    technician_company: string;
    used_by_name: string;
    returned_by_technician_name: string;
    returned_by_name: string;
}

export interface SealReportResponse {
    success: boolean;
    total: number;
    items: SealReportItem[];
}

export interface ReportFilters {
    pea_code?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
}

export const reportService = {
    getReportSeals: async (filters: ReportFilters): Promise<SealReportResponse> => {
        try {
            const params = new URLSearchParams();
            if (filters.pea_code) params.append('pea_code', filters.pea_code);
            if (filters.status) params.append('status', filters.status);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);

            const queryString = params.toString();
            const url = `/api/report/seals${queryString ? `?${queryString}` : ''}`;
            const response = await api.get(url);
            return response.data;
        } catch (error) {
            console.error('Error fetching report data:', error);
            return { success: false, total: 0, items: [] };
        }
    },
};
