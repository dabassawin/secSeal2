package route

import (
	"github.com/Kev2406/PEA/internal/controller"
	"github.com/Kev2406/PEA/internal/middleware"
	"github.com/gofiber/fiber/v2"
)

func SetupTechnicianRoutes(router fiber.Router, techController *controller.TechnicianController) {
	// 🔹 Group สำหรับ Technician (ใช้ /api/technician)
	tech := router.Group("/api/technician")

	// ✅ Public Routes (ไม่ต้องใช้ JWT)
	tech.Post("/register", techController.RegisterHandler)        // สมัครช่างใหม่
	tech.Post("/login", techController.LoginHandler)              // ล็อกอิน
	tech.Post("/import", techController.ImportTechniciansHandler) // Import รายชื่อช่าง
	tech.Get("/list", techController.GetAllTechniciansHandler)    // ดูรายชื่อช่างทั้งหมด

	tech.Put("/update/:id", techController.UpdateTechnicianHandler)    // อัปเดตข้อมูลช่าง
	tech.Delete("/delete/:id", techController.DeleteTechnicianHandler) // ลบข้อมูลช่าง

	// 🔹 Protected Routes สำหรับ Technician (ใช้ TechnicianJWT) — ต้องลงทะเบียนก่อน userProtected
	protectedTech := tech.Group("", middleware.TechnicianJWTMiddleware())
	protectedTech.Get("/my-seals", techController.GetAssignedSealsHandler)
	protectedTech.Put("/seals/install", techController.InstallSealHandler)
	protectedTech.Put("/seals/return/:seal_number", techController.ReturnSealHandler)
	protectedTech.Post("/seals/upload-images", techController.UploadSealImagesHandler)

	// 🔹 Protected Routes สำหรับ User ปกติ (ใช้ regular JWT)
	userProtected := tech.Group("", middleware.JWTMiddleware())
	userProtected.Get("/seals", techController.GetAllTechnicianSealsHandler)
}
