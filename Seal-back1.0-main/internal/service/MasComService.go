package service

import (
	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/domain/repository"
)

type MasComService struct {
	repo *repository.MasComRepository
}

func NewMasComService(repo *repository.MasComRepository) *MasComService {
	return &MasComService{repo: repo}
}

func (s *MasComService) CreateCom(com *model.MasCom) error {
	return s.repo.Create(com)
}

func (s *MasComService) GetAllComs() ([]model.MasCom, error) {
	return s.repo.FindAll()
}

func (s *MasComService) GetComByCode(code string) (*model.MasCom, error) {
	return s.repo.FindByCode(code)
}

func (s *MasComService) GetComsByPeaCode(peaCode string) ([]model.MasCom, error) {
	return s.repo.FindByPeaCode(peaCode)
}

func (s *MasComService) UpdateCom(com *model.MasCom) error {
	return s.repo.Update(com)
}

func (s *MasComService) DeleteCom(id uint) error {
	return s.repo.Delete(id)
}
