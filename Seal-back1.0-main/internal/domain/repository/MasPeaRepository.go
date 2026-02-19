package repository

import (
	"github.com/Kev2406/PEA/internal/domain/model"
	"gorm.io/gorm"
)

type MasPeaRepository struct {
	db *gorm.DB
}

func NewMasPeaRepository(db *gorm.DB) *MasPeaRepository {
	return &MasPeaRepository{db: db}
}

func (r *MasPeaRepository) Create(pea *model.MasPea) error {
	return r.db.Create(pea).Error
}

func (r *MasPeaRepository) FindAll() ([]model.MasPea, error) {
	var peas []model.MasPea
	err := r.db.Find(&peas).Error
	return peas, err
}

func (r *MasPeaRepository) FindByCode(code string) (*model.MasPea, error) {
	var pea model.MasPea
	err := r.db.Where("pea_code = ?", code).First(&pea).Error
	if err != nil {
		return nil, err
	}
	return &pea, nil
}
