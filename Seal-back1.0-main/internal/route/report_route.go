package route

import (
	"github.com/Kev2406/PEA/internal/controller"
	"github.com/gofiber/fiber/v2"
)

// SetupReportRoutes sets up routes for report endpoints under /api/report
func SetupReportRoutes(router fiber.Router, reportController *controller.ReportController) {
	api := router.Group("/api")
	report := api.Group("/report")

	// GET /api/report/seals?pea_code=&status=&start_date=&end_date=
	report.Get("/seals", reportController.GetSealReportHandler)
}
