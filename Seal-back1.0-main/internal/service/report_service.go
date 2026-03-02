package service

import (
	"time"

	"github.com/Kev2406/PEA/internal/dto"
	"gorm.io/gorm"
)

// ReportService handles queries against the v_seal_report VIEW
type ReportService struct {
	db *gorm.DB
}

// NewReportService creates a new ReportService
func NewReportService(db *gorm.DB) *ReportService {
	return &ReportService{db: db}
}

// GetSealReport queries v_seal_report with optional filters
func (s *ReportService) GetSealReport(peaCode, status, startDate, endDate string) ([]dto.SealReportRow, error) {
	query := s.db.Table("v_seal_report")

	// Filter by PEA code
	if peaCode != "" {
		query = query.Where("pea_code = ?", peaCode)
	}

	// Filter by status
	if status != "" {
		query = query.Where("status = ?", status)
	}

	// Filter by date range (based on created_at)
	if startDate != "" {
		t, err := time.Parse("2006-01-02", startDate)
		if err == nil {
			query = query.Where("created_at >= ?", t)
		}
	}
	if endDate != "" {
		t, err := time.Parse("2006-01-02", endDate)
		if err == nil {
			endOfDay := t.Add(24*time.Hour - time.Second)
			query = query.Where("created_at <= ?", endOfDay)
		}
	}

	// Order by created_at descending
	query = query.Order("created_at DESC")

	var items []dto.SealReportRow
	if err := query.Find(&items).Error; err != nil {
		return nil, err
	}

	return items, nil
}
