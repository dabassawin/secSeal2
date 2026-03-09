import { SealStatus } from '../constants/status';
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
    [SealStatus.READY]: number;
    [SealStatus.ISSUED]: number;
    [SealStatus.INSTALLED]: number;
    [SealStatus.USED]: number;
}

export interface Seal {
    id: number;
    seal_number: string;
    qr_code?: string;
    pea_code?: string; // ✅ รหัสการไฟฟ้าที่ออกซีล
    status: typeof SealStatus[keyof typeof SealStatus];
    box_number?: string;
    created_at?: string;
    updated_at?: string;
    is_deleted?: boolean;
    installed_serial?: string;
    image1?: string;
    image2?: string;
    image3?: string; // รูปมิเตอร์
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
    is_center?: boolean; // ✅ Flag to identify Center Accounts
    created_at?: string;
    updated_at?: string;
}

