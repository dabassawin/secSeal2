package repository

import (
	"github.com/Kev2406/PEA/internal/domain/model"
	"gorm.io/gorm"
)

type MasComRepository struct {
	db *gorm.DB
}

func NewMasComRepository(db *gorm.DB) *MasComRepository {
	return &MasComRepository{db: db}
}

func (r *MasComRepository) Create(com *model.MasCom) error {
	return r.db.Create(com).Error
}

func (r *MasComRepository) FindAll() ([]model.MasCom, error) {
	var coms []model.MasCom
	err := r.db.Find(&coms).Error
	return coms, err
}

func (r *MasComRepository) FindByCode(code string) (*model.MasCom, error) {
	var com model.MasCom
	err := r.db.Where("com_code = ?", code).First(&com).Error
	if err != nil {
		return nil, err
	}
	return &com, nil
}

func (r *MasComRepository) FindByPeaCode(peaCode string) ([]model.MasCom, error) {
	var coms []model.MasCom
	err := r.db.Where("pea_code = ?", peaCode).Find(&coms).Error
	return coms, err
}

func (r *MasComRepository) Update(com *model.MasCom) error {
	return r.db.Save(com).Error
}

func (r *MasComRepository) Delete(id uint) error {
	return r.db.Where("id = ?", id).Delete(&model.MasCom{}).Error
}
