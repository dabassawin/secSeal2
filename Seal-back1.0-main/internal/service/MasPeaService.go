package service

import (
	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/domain/repository"
)

type MasPeaService struct {
	repo *repository.MasPeaRepository
}

func NewMasPeaService(repo *repository.MasPeaRepository) *MasPeaService {
	return &MasPeaService{repo: repo}
}

func (s *MasPeaService) CreatePea(pea *model.MasPea) error {
	return s.repo.Create(pea)
}

func (s *MasPeaService) GetAllPeas() ([]model.MasPea, error) {
	return s.repo.FindAll()
}

func (s *MasPeaService) GetPeaByCode(code string) (*model.MasPea, error) {
	return s.repo.FindByCode(code)
}
