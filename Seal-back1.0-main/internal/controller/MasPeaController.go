package controller

import (
	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/service"
	"github.com/gofiber/fiber/v2"
)

type MasPeaController struct {
	service *service.MasPeaService
}

func NewMasPeaController(service *service.MasPeaService) *MasPeaController {
	return &MasPeaController{service: service}
}

func (c *MasPeaController) CreatePea(ctx *fiber.Ctx) error {
	var pea model.MasPea
	if err := ctx.BodyParser(&pea); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := c.service.CreatePea(&pea); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return ctx.Status(fiber.StatusCreated).JSON(pea)
}

func (c *MasPeaController) GetAllPeas(ctx *fiber.Ctx) error {
	peas, err := c.service.GetAllPeas()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return ctx.JSON(peas)
}

func (c *MasPeaController) GetPeaByCode(ctx *fiber.Ctx) error {
	code := ctx.Params("code")
	pea, err := c.service.GetPeaByCode(code)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Pea not found"})
	}
	return ctx.JSON(pea)
}
