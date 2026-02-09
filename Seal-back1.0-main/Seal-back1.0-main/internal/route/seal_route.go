package route

import (
	"github.com/Kev2406/PEA/internal/controller"
	"github.com/Kev2406/PEA/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

// SetupSealRoutes sets up routes for "seals" under /api/seals
func SetupSealRoutes(router fiber.Router, sealController *controller.SealController) {
	api := router.Group("/api")
	seal := api.Group("/seals")

	// -- 0) GET /api/seals/ : get all seals (public for testing)
	seal.Get("/", sealController.GetAllSealsHandler)

	// -- 1) POST /api/seals/ : create a new Seal (public for testing)
	seal.Post("/", sealController.CreateSealHandler)

	// -- 2) POST /api/seals/generate : admin can generate multiple seals (public for testing)
	seal.Post("/generate", sealController.GenerateSealsHandler)

	// -- 3) PUT /api/seals/:seal_number/assign : assign a seal to a technician (public for testing)
	seal.Put("/:seal_number/assign", sealController.AssignSealToTechnicianHandler)

	// -- 4) POST /api/seals/scan : scan a barcode (public for testing)
	seal.Post("/scan", sealController.ScanSealHandler)

	// -- 5) GET /api/seals/report : admin-only report (public for testing)
	seal.Get("/report", sealController.GetSealReportHandler)

	// -- 6) GET /api/seals/check : check multiple seals with query params (public for testing)
	seal.Get("/check", sealController.CheckMultipleSealsHandler)

	// -- 7) GET /api/seals/check/:seal_number : check existence of a single seal (public for testing)
	seal.Get("/check/:seal_number", sealController.CheckSealExistsHandler)

	// -- 8) POST /api/seals/issue-multiple : bulk-issue seals from base number (public for testing)
	seal.Post("/issue-multiple", sealController.IssueMultipleSealsHandler)

	// -- 9) GET /api/seals/status/:status : get seals by status (public for testing)
	seal.Get("/status/:status", sealController.GetSealsByStatusHandler)

	// -- 10) GET /api/seals/:id/status/:status : get seal by ID & status
	seal.Get("/:id/status/:status", middleware.JWTMiddleware(), sealController.GetSealByIDAndStatusHandler)

	// -- 11) PUT /api/seals/:seal_number/issue : admin issues a seal to a user
	seal.Put("/:seal_number/issue", middleware.JWTMiddleware(), sealController.IssueSealHandler)

	// -- 12) PUT /api/seals/:seal_number/use : user uses a previously issued seal
	seal.Put("/:seal_number/use", middleware.JWTMiddleware(), sealController.UseSealHandler)

	// -- 13) PUT /api/seals/:seal_number/return : user returns a seal after use
	seal.Put("/:seal_number/return", middleware.JWTMiddleware(), sealController.ReturnSealHandler)

	// -- 14) GET /api/seals/:seal_number : get a single seal by number (wildcard route - put last!)
	seal.Get("/:seal_number", middleware.JWTMiddleware(), sealController.GetSealHandler)

	// -- 15) POST /api/seals/check : check seals via JSON body
	seal.Post("/check", sealController.CheckSealsHandler)

	// -- 16) POST /api/seals/assign-by-techcode : assign seals by technician_code (ฟีเจอร์ใหม่)
	seal.Post("/assign-by-techcode", middleware.JWTMiddleware(), sealController.AssignSealsByTechCodeHandler)
	seal.Put("/:seal_number/cancel", middleware.JWTMiddleware(), sealController.CancelSealHandler)

}
