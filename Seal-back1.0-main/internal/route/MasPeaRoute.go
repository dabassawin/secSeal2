package route

import (
	"github.com/Kev2406/PEA/internal/controller"
	"github.com/gofiber/fiber/v2"
)

func SetupMasPeaRoutes(router fiber.Router, controller *controller.MasPeaController) {
	group := router.Group("/api/maspea")
	group.Post("/", controller.CreatePea)
	group.Get("/", controller.GetAllPeas)
	group.Get("/:code", controller.GetPeaByCode)
}
