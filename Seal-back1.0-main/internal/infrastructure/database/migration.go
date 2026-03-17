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

	return nil
}
