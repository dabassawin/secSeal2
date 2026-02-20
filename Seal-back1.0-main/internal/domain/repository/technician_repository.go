package repository

import (
	"errors"
	"log"

	"github.com/Kev2406/PEA/internal/domain/model"
	"gorm.io/gorm"
)

type TechnicianRepository struct {
	db *gorm.DB
}

func NewTechnicianRepository(db *gorm.DB) *TechnicianRepository {
	return &TechnicianRepository{db: db}
}

func (r *TechnicianRepository) Create(tech *model.Technician) error {
	return r.db.Create(tech).Error
}

func (r *TechnicianRepository) FindByUsername(username string) (*model.Technician, error) {
	var tech model.Technician
	if err := r.db.Where("username = ?", username).First(&tech).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("technician not found")
		}
		return nil, err
	}
	return &tech, nil
}
func (r *TechnicianRepository) FindByID(techID uint) (*model.Technician, error) {
	var tech model.Technician
	if err := r.db.Where("id = ?", techID).First(&tech).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("ไม่พบช่างในระบบ")
		}
		return nil, err
	}
	return &tech, nil
}
func (r *TechnicianRepository) FindSealByNumber(sealNumber string) (*model.Seal, error) {
	var seal model.Seal

	log.Println("🔍 [DEBUG] Searching for Seal:", sealNumber) // Debug log ก่อน Query

	err := r.db.Where("seal_number = ?", sealNumber).First(&seal).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			log.Println("❌ [ERROR] Seal not found:", sealNumber) // Log กรณีไม่พบ
			return nil, errors.New("ไม่พบซีลในระบบ")
		}
		log.Println("❌ [ERROR] Database error:", err) // Log ถ้าเกิด DB error อื่นๆ
		return nil, err
	}

	// ✅ Debug Log ถ้าหาเจอซีล
	log.Println("✅ [DEBUG] Found Seal:", seal.SealNumber, "Status:", seal.Status, "UsedBy:", seal.UsedBy)

	return &seal, nil
}

// ✅ อัปเดตข้อมูลซีล
func (r *TechnicianRepository) UpdateSeal(seal *model.Seal) error {
	return r.db.Save(seal).Error
}

// ✅ บันทึก Log
func (r *TechnicianRepository) CreateLog(log *model.Log) error {
	return r.db.Create(log).Error
}
func (r *TechnicianRepository) UpdateTechnician(tech *model.Technician) error {
	log.Println("🔍 [REPO] Updating Technician ID:", tech.ID)

	if err := r.db.Save(tech).Error; err != nil {
		log.Println("❌ [ERROR] Failed to update Technician in DB:", err)
		return err
	}

	log.Println("✅ [REPO] Technician updated in DB successfully!")
	return nil
}

func (r *TechnicianRepository) FindByTechCode(code string) (*model.Technician, error) {
	var tech model.Technician
	if err := r.db.Where("technician_code = ?", code).First(&tech).Error; err != nil {
		return nil, err
	}
	return &tech, nil
}
func (r *TechnicianRepository) GetAllTechnicians(peaCode string, isPrefix bool) ([]model.Technician, error) {
	var technicians []model.Technician
	query := r.db
	if peaCode != "" {
		if isPrefix {
			query = query.Where("pea_code LIKE ?", peaCode+"%")
		} else {
			query = query.Where("pea_code = ?", peaCode)
		}
	}
	if err := query.Find(&technicians).Error; err != nil {
		return nil, err
	}
	return technicians, nil
}
func (r *TechnicianRepository) DeleteTechnician(techID uint) error {
	return r.db.Where("id = ?", techID).Delete(&model.Technician{}).Error
}
