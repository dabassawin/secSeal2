-- ============================================================
-- SCRIPT: fix_transferred_by.sql
-- แก้ไขข้อมูลเดิม: เติม transferred_by_technician สำหรับซีล
-- ที่อยู่ใน status 'จ่าย' หรือ 'รอยืนยัน' และมี assigned_to_technician
-- แต่ issued_by เป็น Admin (user) ไม่ใช่ศูนย์งาน
--
-- วิธีใช้: run script นี้ใน psql หรือ DBeaver หลังจาก restart server แล้ว
-- ============================================================

-- Step 1: ดูว่าซีล T2569100039 ปัจจุบันมีค่าอะไร
SELECT
    s.seal_number,
    s.status,
    s.issued_by,
    s.issued_to,
    s.transferred_by_technician,
    s.assigned_to_technician,
    t.first_name || ' ' || t.last_name AS assigned_tech_name
FROM seals s
LEFT JOIN technicians t ON t.id = s.assigned_to_technician
WHERE s.seal_number IN ('T2569100039', 'T2569100038')
ORDER BY s.seal_number;

-- Step 2: หา ID ของศูนย์งาน นครราชสีมา (is_center = true, pea_code ตรงกัน)
SELECT id, first_name, last_name, pea_code, com_code, is_center
FROM technicians
WHERE is_center = true
ORDER BY pea_code;

-- ============================================================
-- Step 3: อัปเดต transferred_by_technician สำหรับซีลที่:
--   - ถูก assigned_to_technician (ช่างทั่วไป, ไม่ใช่ center)
--   - ยังไม่มี transferred_by_technician
--   - มี issued_by ที่เป็น user (admin)
-- โดยหาศูนย์งานที่ is_center = true และ pea_code ตรงกับซีล
-- ============================================================
UPDATE seals s
SET transferred_by_technician = center.id
FROM (
    SELECT t.id, t.pea_code
    FROM technicians t
    WHERE t.is_center = true
) AS center
JOIN technicians tech ON tech.id = s.assigned_to_technician AND tech.is_center = false
WHERE s.pea_code = center.pea_code
  AND s.transferred_by_technician IS NULL
  AND s.issued_by IS NOT NULL
  AND s.assigned_to_technician IS NOT NULL
  AND s.status IN ('จ่าย', 'รอยืนยัน', 'ติดตั้งแล้ว', 'รอคืน', 'ใช้งานแล้ว');

-- Step 4: ตรวจสอบผลลัพธ์
SELECT
    s.seal_number,
    s.status,
    s.issued_by,
    COALESCE(
        NULLIF(t_trans.first_name || ' ' || t_trans.last_name, ' '),
        NULLIF(u.first_name || ' ' || u.last_name, ' '),
        ''
    ) AS issued_by_name,
    t.first_name || ' ' || t.last_name AS technician_name
FROM seals s
LEFT JOIN users u ON u.emp_id = s.issued_by AND u.deleted_at IS NULL
LEFT JOIN technicians t_trans ON t_trans.id = s.transferred_by_technician
LEFT JOIN technicians t ON t.id = s.issued_to
WHERE s.seal_number IN ('T2569100039', 'T2569100038');
