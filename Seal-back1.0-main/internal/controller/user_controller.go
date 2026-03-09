package controller

import (
	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/service"
	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

type UserController struct {
	userService *service.UserService
}

func NewUserController(userService *service.UserService) *UserController {
	return &UserController{userService: userService}
}

// ✅ GET /api/users — ดึงรายชื่อผู้ใช้ทั้งหมด
func (uc *UserController) GetAllUsersHandler(c *fiber.Ctx) error {
	users, err := uc.userService.GetAllUsers()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch users"})
	}
	return c.JSON(users)
}

// ✅ GET /api/users/:username — ดึงข้อมูลผู้ใช้ตาม username
func (uc *UserController) GetUserHandler(c *fiber.Ctx) error {
	username := c.Params("username")

	user, err := uc.userService.GetUserByUsername(username)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(user)
}

// ✅ POST /api/users — สร้างผู้ใช้ใหม่
func (uc *UserController) CreateUserHandler(c *fiber.Ctx) error {
	var request struct {
		EmpID    uint   `json:"emp_id"`
		Title    string `json:"title_s_desc"`
		First    string `json:"first_name"`
		Last     string `json:"last_name"`
		Username string `json:"username"`
		Email    string `json:"email"`
		Role     string `json:"role"`
		Password string `json:"password"`
		IsActive bool   `json:"is_active"`
		PeaCode  string `json:"pea_code"`
		PeaShort string `json:"pea_short"`
		PeaName  string `json:"pea_name"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request format"})
	}

	existingUser, _ := uc.userService.GetUserByEmpID(request.EmpID)
	if existingUser != nil {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "Employee ID already exists"})
	}

	// Hash password
	hashedPassword := ""
	if request.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
		}
		hashedPassword = string(hash)
	}

	user := model.User{
		EmpID:     request.EmpID,
		Title:     request.Title,
		FirstName: request.First,
		LastName:  request.Last,
		Username:  request.Username,
		Email:     request.Email,
		Role:      request.Role,
		Password:  hashedPassword,
		IsActive:  request.IsActive,
		PeaCode:   request.PeaCode,
		PeaShort:  request.PeaShort,
		PeaName:   request.PeaName,
	}

	err := uc.userService.CreateUser(&user)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create user"})
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "User created successfully", "user": user})
}

// ✅ PUT /api/users/:username — แก้ไขข้อมูลผู้ใช้
func (uc *UserController) UpdateUserHandler(c *fiber.Ctx) error {
	username := c.Params("username")
	var request struct {
		Title    string `json:"title_s_desc"`
		First    string `json:"first_name"`
		Last     string `json:"last_name"`
		Email    string `json:"email"`
		Role     string `json:"role"`
		Password string `json:"password"`
		IsActive *bool  `json:"is_active"` // pointer so we can detect if it was sent
		PeaCode  string `json:"pea_code"`
		PeaShort string `json:"pea_short"`
		PeaName  string `json:"pea_name"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request format"})
	}

	user, err := uc.userService.GetUserByUsername(username)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	// Update all editable fields
	if request.Title != "" {
		user.Title = request.Title
	}
	if request.First != "" {
		user.FirstName = request.First
	}
	if request.Last != "" {
		user.LastName = request.Last
	}
	if request.Email != "" {
		user.Email = request.Email
	}
	if request.Role != "" {
		user.Role = request.Role
	}
	if request.PeaCode != "" {
		user.PeaCode = request.PeaCode
	}
	if request.PeaShort != "" {
		user.PeaShort = request.PeaShort
	}
	if request.PeaName != "" {
		user.PeaName = request.PeaName
	}
	if request.IsActive != nil {
		user.IsActive = *request.IsActive
	}

	// Hash new password if provided
	if request.Password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(request.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to hash password"})
		}
		user.Password = string(hash)
	}

	if err := uc.userService.UpdateUser(user); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update user"})
	}

	return c.JSON(fiber.Map{"message": "User updated successfully", "user": user})
}

// ✅ DELETE /api/users/:username — ลบผู้ใช้ (Soft Delete)
func (uc *UserController) DeleteUserHandler(c *fiber.Ctx) error {
	username := c.Params("username")

	if err := uc.userService.DeleteUser(username); err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "User not found"})
	}

	return c.JSON(fiber.Map{"message": "User deleted successfully"})
}
