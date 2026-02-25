// TypeScript types and interfaces
// Example: export interface User { id: string; name: string; }
export interface Log {
    id: number;
    user_id: number;
    action: string;
    timestamp: string;
    created_at?: string;
    updated_at?: string;
}

export interface LogResponse {
    success: boolean;
    logs: {
        created: Log[];
        issued: Log[];
        used: Log[];
        returned: Log[];
        other: Log[];
    };
}

export interface SealReport {
    total_seals: number;
    "พร้อมใช้งาน": number;
    "จ่าย": number;
    "ติดตั้งแล้ว": number;
    "ใช้งานแล้ว": number;
}

export interface Seal {
    id: number;
    seal_number: string;
    qr_code?: string;
    pea_code?: string; // ✅ รหัสการไฟฟ้าที่ออกซีล
    status: 'พร้อมใช้งาน' | 'จ่าย' | 'ติดตั้งแล้ว' | 'ใช้งานแล้ว' | 'เสียหาย' | 'สูญหาย';
    box_number?: string;
    created_at?: string;
    updated_at?: string;
    is_deleted?: boolean;
    installed_serial?: string;
}

export interface Technician {
    id: number;
    technician_code: string;
    username: string;
    first_name: string;
    last_name: string;
    email: string;
    electric_code?: string;
    phone_number: string;
    company_name: string;
    department: string;
    pea_code?: string; // Added field for PEA Code
    created_at?: string;
    updated_at?: string;
}

export interface StatementItem {
    seal_number: string;
    pea_code: string;
    status: string;
    issued_by_name: string;
    tech_name: string;
    issue_remark: string;
    installed_serial: string;
    issued_at: string | null;
    used_at: string | null;
    returned_at: string | null;
    updated_at: string;
    created_at: string;
}

export interface SealStatement {
    period: { start_date: string; end_date: string };
    summary: Record<string, number>;
    total: number;
    items: StatementItem[];
}
