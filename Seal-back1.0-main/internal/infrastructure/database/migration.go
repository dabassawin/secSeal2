package migration

import (
	"log"

	"github.com/Kev2406/PEA/internal/domain/model"
	"gorm.io/gorm"
)

// CreateStoreTable runs database migrations and seeds initial data
func CreateStoreTable(db *gorm.DB) error {
	log.Println("🚀 Starting AutoMigrate for tables...")

	// ✅ ปิด foreign key constraints ชั่วคราวเพื่อป้องกันปัญหาที่อาจเกิดขึ้น
	db.Config.DisableForeignKeyConstraintWhenMigrating = true

	log.Println("🔄 Migrating User Table...")
	if err := db.AutoMigrate(&model.User{}); err != nil {
		log.Printf("❌ Failed to migrate User: %v", err)
		return err
	}
	log.Println("✅ User Table Migrated Successfully!")

	log.Println("🔄 Migrating Technician Table...")
	if err := db.AutoMigrate(&model.Technician{}); err != nil {
		log.Printf("❌ Failed to migrate Technician: %v", err)
		return err
	}
	log.Println("✅ Technician Table Migrated Successfully!")

	log.Println("🔄 Migrating Seal Table...")
	if err := db.AutoMigrate(&model.Seal{}); err != nil {
		log.Printf("❌ Failed to migrate Seal: %v", err)
		return err
	}
	log.Println("✅ Seal Table Migrated Successfully!")

	log.Println("🔄 Migrating Transaction Table...")
	if err := db.AutoMigrate(&model.Transaction{}); err != nil {
		log.Printf("❌ Failed to migrate Transaction: %v", err)
		return err
	}
	log.Println("✅ Transaction Table Migrated Successfully!")

	log.Println("🔄 Migrating Log Table...")
	if err := db.AutoMigrate(&model.Log{}); err != nil {
		log.Printf("❌ Failed to migrate Log: %v", err)
		return err
	}
	log.Println("✅ Log Table Migrated Successfully!")

	// 🔄 Renaming Logic Removed: We are mapping struct field PeaCode to DB column "code" directly.
	// if db.Migrator().HasColumn(&model.MasPea{}, "code") { ... }
	log.Println("🔄 Migrating MasPea Table...")
	if err := db.AutoMigrate(&model.MasPea{}); err != nil {
		log.Printf("❌ Failed to migrate MasPea: %v", err)
		return err
	}
	log.Println("✅ MasPea Table Migrated Successfully!")

	log.Println("🔄 Migrating MasCom Table...")
	if err := db.AutoMigrate(&model.MasCom{}); err != nil {
		log.Printf("❌ Failed to migrate MasCom: %v", err)
		return err
	}
	log.Println("✅ MasCom Table Migrated Successfully!")

	log.Println("✅ Migration successful!")

	// ✅ เปิด foreign key constraints กลับมา หลังจาก migration เสร็จสิ้น
	db.Config.DisableForeignKeyConstraintWhenMigrating = false

	// ✅ อัปเดต VIEW v_seal_report ให้รองรับ transferred_by_technician
	log.Println("🔄 Updating VIEW v_seal_report...")
	viewSQL := `
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
    COALESCE(
        NULLIF(t_trans.first_name || ' ' || t_trans.last_name, ' '),
        NULLIF(u.first_name || ' ' || u.last_name, ' '),
        ''
    ) AS issued_by_name,
    COALESCE(t.first_name || ' ' || t.last_name, '') AS technician_name,
    COALESCE(t.company_name, '') AS technician_company,
    COALESCE(mc.com_code, '') AS technician_com_code,
    COALESCE(mc.name_eng, '') AS technician_company_eng,
    COALESCE(t_used.first_name || ' ' || t_used.last_name, '') AS used_by_name,
    COALESCE(t_ret.first_name || ' ' || t_ret.last_name, '') AS returned_by_technician_name,
    COALESCE(u_ret.first_name || ' ' || u_ret.last_name, '') AS returned_by_name
FROM seals s
LEFT JOIN users u ON u.emp_id = s.issued_by AND u.deleted_at IS NULL
LEFT JOIN technicians t_trans ON t_trans.id = s.transferred_by_technician
LEFT JOIN technicians t ON t.id = s.issued_to
LEFT JOIN mas_coms mc ON mc.name_th = t.company_name AND mc.deleted_at IS NULL
LEFT JOIN technicians t_used ON t_used.id = s.used_by
LEFT JOIN technicians t_ret ON t_ret.id = s.returned_by_technician
LEFT JOIN users u_ret ON u_ret.emp_id = s.returned_by AND u_ret.deleted_at IS NULL
WHERE s.deleted_at IS NULL;`

	if err := db.Exec(viewSQL).Error; err != nil {
		log.Printf("❌ Failed to update VIEW v_seal_report: %v", err)
		return err
	}
	log.Println("✅ VIEW v_seal_report updated successfully!")

	// ✅ Backfill: เติม transferred_by_technician สำหรับซีลเดิม
	// ที่ถูกโอนจากศูนย์งาน (is_center=true) ไปให้ช่างทั่วไป (is_center=false)
	// แต่ยังไม่มีค่า transferred_by_technician (เพราะเพิ่มฟิลด์ใหม่)
	log.Println("🔄 Backfilling transferred_by_technician for existing seals...")
	backfillSQL := `
UPDATE seals s
SET transferred_by_technician = center.id
FROM (
    SELECT t.id, t.pea_code
    FROM technicians t
    WHERE t.is_center = true
) AS center, technicians tech
WHERE s.pea_code = center.pea_code
  AND s.assigned_to_technician = tech.id
  AND tech.is_center = false
  AND s.transferred_by_technician IS NULL
  AND s.issued_by IS NOT NULL
  AND s.assigned_to_technician IS NOT NULL`

	result := db.Exec(backfillSQL)
	if result.Error != nil {
		log.Printf("⚠️ Backfill transferred_by_technician warning: %v", result.Error)
		// ไม่ return error เพราะไม่ blocking — ซีลใหม่จะถูก set ถูกต้องอยู่แล้ว
	} else {
		log.Printf("✅ Backfilled transferred_by_technician for %d seal(s)", result.RowsAffected)
	}

	return nil
}
