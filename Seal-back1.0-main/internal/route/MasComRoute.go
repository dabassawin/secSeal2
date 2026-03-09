package route

import (
	"github.com/Kev2406/PEA/internal/controller"
	"github.com/gofiber/fiber/v2"
)

func SetupMasComRoutes(router fiber.Router, controller *controller.MasComController) {
	group := router.Group("/api/mascom")
	group.Post("/", controller.CreateCom)
	group.Get("/", controller.GetAllComs)
	group.Get("/pea/:peaCode", controller.GetComsByPeaCode) // ต้องมาก่อน /:code
	group.Get("/:code", controller.GetComByCode)
	group.Put("/:id", controller.UpdateCom)
	group.Delete("/:id", controller.DeleteCom)
}
