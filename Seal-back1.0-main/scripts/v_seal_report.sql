-- ============================================================
-- VIEW: v_seal_report
-- สร้าง VIEW สำหรับหน้ารายงานสรุปข้อมูลซีล
-- JOIN seals กับ users (ผู้จ่าย) และ technicians (ช่างที่รับ)
-- ============================================================
-- วิธีใช้: นำ SQL นี้ไป run ใน PostgreSQL database ของระบบ
-- ============================================================

DROP VIEW IF EXISTS v_seal_report;

CREATE OR REPLACE VIEW v_seal_report AS
SELECT
    s.id,
    s.seal_number,
    s.status,
    s.pea_code,
    s.installed_serial,
    s.issue_remark,
    s.create_remarks,
    s.employee_code,
    s.created_at,
    s.issued_at,
    s.used_at,
    s.returned_at,
    s.updated_at,
    -- ผู้จ่าย: ถ้ามี transferred_by_technician (ศูนย์งานโอนต่อ) ให้ใช้ชื่อของ technician นั้น
    -- มิฉะนั้นใช้ user (Admin) ที่ issued ซีลครั้งแรก
    COALESCE(
        NULLIF(t_trans.first_name || ' ' || t_trans.last_name, ' '),
        NULLIF(u.first_name || ' ' || u.last_name, ' '),
        ''
    ) AS issued_by_name,
    -- ช่างที่รับ (Technician ที่ assigned)
    COALESCE(t.first_name || ' ' || t.last_name, '') AS technician_name,
    COALESCE(t.company_name, '') AS technician_company,
    COALESCE(mc.com_code, '') AS technician_com_code,
    COALESCE(mc.name_eng, '') AS technician_company_eng,
    -- ช่างที่ติดตั้ง (used_by → technicians)
    COALESCE(t_used.first_name || ' ' || t_used.last_name, '') AS used_by_name,
    -- ช่างที่ส่งคืน (returned_by_technician → technicians)
    COALESCE(t_ret.first_name || ' ' || t_ret.last_name, '') AS returned_by_technician_name,
    -- ผู้รับคืน (user ที่ยืนยันรับคืน)
    COALESCE(u_ret.first_name || ' ' || u_ret.last_name, '') AS returned_by_name
FROM seals s
LEFT JOIN users u ON u.emp_id = s.issued_by AND u.deleted_at IS NULL
LEFT JOIN technicians t_trans ON t_trans.id = s.transferred_by_technician
LEFT JOIN technicians t ON t.id = s.issued_to
LEFT JOIN mas_coms mc ON mc.name_th = t.company_name AND mc.deleted_at IS NULL
LEFT JOIN technicians t_used ON t_used.id = s.used_by
LEFT JOIN technicians t_ret ON t_ret.id = s.returned_by_technician
LEFT JOIN users u_ret ON u_ret.emp_id = s.returned_by AND u_ret.deleted_at IS NULL
WHERE s.deleted_at IS NULL;

