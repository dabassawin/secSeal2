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
