export const SealStatus = {
    READY: 'พร้อมใช้งาน',
    ISSUED: 'จ่าย',
    INSTALLED: 'ติดตั้งแล้ว',
    USED: 'ใช้งานแล้ว',
    DAMAGED: 'เสียหาย',
    LOST: 'สูญหาย',
    PENDING_RETURN: 'รอตรวจสอบคืน',
    WAIT_CONFIRMATION: 'รอยืนยัน',
} as const;

export type SealStatusType = typeof SealStatus[keyof typeof SealStatus];

export const ALL_SEAL_STATUSES: SealStatusType[] = [
    SealStatus.READY,
    SealStatus.ISSUED,
    SealStatus.WAIT_CONFIRMATION,
    SealStatus.INSTALLED,
    SealStatus.USED,
    SealStatus.DAMAGED,
    SealStatus.LOST,
    SealStatus.PENDING_RETURN,
];
