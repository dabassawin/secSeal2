package controller

import (
	"github.com/Kev2406/PEA/internal/dto"
	"github.com/Kev2406/PEA/internal/service"
	"github.com/gofiber/fiber/v2"
)

// ReportController handles report-related API endpoints
type ReportController struct {
	reportService *service.ReportService
}

// NewReportController creates a new ReportController
func NewReportController(reportService *service.ReportService) *ReportController {
	return &ReportController{reportService: reportService}
}

// GetSealReportHandler returns seal report data from the v_seal_report VIEW
// GET /api/report/seals?pea_code=&status=&start_date=&end_date=
func (rc *ReportController) GetSealReportHandler(c *fiber.Ctx) error {
	peaCode := c.Query("pea_code")
	status := c.Query("status")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	items, err := rc.reportService.GetSealReport(peaCode, status, startDate, endDate)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"success": false,
			"error":   "Failed to fetch report data: " + err.Error(),
		})
	}

	return c.JSON(dto.SealReportResponse{
		Success: true,
		Total:   len(items),
		Items:   items,
	})
}
