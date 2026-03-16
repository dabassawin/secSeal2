package controller

import (
	"strconv"

	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/service"
	"github.com/gofiber/fiber/v2"
)

type MasComController struct {
	service           *service.MasComService
	technicianService *service.TechnicianService
}

func NewMasComController(service *service.MasComService, technicianService *service.TechnicianService) *MasComController {
	return &MasComController{
		service:           service,
		technicianService: technicianService,
	}
}

// CreateCom สร้างศูนย์งานใหม่
func (c *MasComController) CreateCom(ctx *fiber.Ctx) error {
	var com model.MasCom
	if err := ctx.BodyParser(&com); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if com.ComCode == "" || com.PeaCode == "" {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "com_code and pea_code are required"})
	}

	if err := c.service.CreateCom(&com); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// ✅ Auto-create a Center Account as a Technician
	dummyTech := &model.Technician{
		TechnicianCode: com.ComCode,
		Username:       com.ComCode,
		Password:       "default123", // รหัสผ่านเริ่มต้นสำหรับศูนย์งาน
		FirstName:      com.NameTh,
		LastName:       "(ศูนย์งาน)",
		Email:          com.ComCode + "@dummy.pea.co.th",
		PhoneNumber:    "-",
		CompanyName:    com.NameTh,
		PeaCode:        com.PeaCode,
		ComCode:        com.ComCode, // ✅ เพิ่ม com_code ให้บัญชีศูนย์
		IsCenter:       true,
	}

	// Ignore error if it fails (e.g., already exists), but log it
	if err := c.technicianService.Register(dummyTech); err != nil {
		// Just log it, don't fail the MasCom creation
		// fmt.Println("Warning: Failed to create Center Technician account:", err)
	}

	return ctx.Status(fiber.StatusCreated).JSON(com)
}

// GetAllComs ดูศูนย์งานทั้งหมด
func (c *MasComController) GetAllComs(ctx *fiber.Ctx) error {
	coms, err := c.service.GetAllComs()
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return ctx.JSON(coms)
}

// GetComByCode ดูศูนย์งานตาม com_code
func (c *MasComController) GetComByCode(ctx *fiber.Ctx) error {
	code := ctx.Params("code")
	com, err := c.service.GetComByCode(code)
	if err != nil {
		return ctx.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "ไม่พบศูนย์งาน"})
	}
	return ctx.JSON(com)
}

// GetComsByPeaCode ดูศูนย์งานตามสังกัด
func (c *MasComController) GetComsByPeaCode(ctx *fiber.Ctx) error {
	peaCode := ctx.Params("peaCode")
	coms, err := c.service.GetComsByPeaCode(peaCode)
	if err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return ctx.JSON(coms)
}

// UpdateCom แก้ไขศูนย์งาน
func (c *MasComController) UpdateCom(ctx *fiber.Ctx) error {
	id, err := strconv.Atoi(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	var updates model.MasCom
	if err := ctx.BodyParser(&updates); err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	updates.ID = uint(id)
	if err := c.service.UpdateCom(&updates); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return ctx.JSON(fiber.Map{"message": "อัปเดตศูนย์งานสำเร็จ"})
}

// DeleteCom ลบศูนย์งาน
func (c *MasComController) DeleteCom(ctx *fiber.Ctx) error {
	id, err := strconv.Atoi(ctx.Params("id"))
	if err != nil {
		return ctx.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid ID"})
	}

	if err := c.service.DeleteCom(uint(id)); err != nil {
		return ctx.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return ctx.JSON(fiber.Map{"message": "ลบศูนย์งานสำเร็จ"})
}
