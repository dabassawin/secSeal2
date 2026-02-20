package main

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/Kev2406/PEA/internal/config"
	"github.com/Kev2406/PEA/internal/controller"
	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/domain/repository"
	migration "github.com/Kev2406/PEA/internal/infrastructure/database"
	"github.com/Kev2406/PEA/internal/middleware"
	"github.com/Kev2406/PEA/internal/route"
	"github.com/Kev2406/PEA/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/golang-jwt/jwt/v5"
	"github.com/joho/godotenv"
)

var secretKey = []byte("your-secret-key")

func generateToken(user *model.User, wg *sync.WaitGroup, tokenChan chan<- string) {
	defer wg.Done()
	claims := jwt.MapClaims{
		"user_id":    user.ID,
		"emp_id":     user.EmpID,
		"role":       user.Role,
		"title":      user.Title,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
		"username":   user.Username,
		"email":      user.Email,
		"exp":        time.Now().Add(24 * time.Hour).Unix(),
		"pea_code":   user.PeaCode,
		"pea_short":  user.PeaShort,
		"pea_name":   user.PeaName,
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signedToken, err := token.SignedString(secretKey)
	if err != nil {
		tokenChan <- ""
		return
	}
	tokenChan <- signedToken
}

func main() {
	log.SetFlags(log.LstdFlags | log.Lshortfile)

	// ✅ Robust .env loading with absolute paths
	// Get current working directory
	cwd, _ := os.Getwd()
	log.Printf("Current working directory: %s", cwd)

	// Try different possible locations for .env file
	envPaths := []string{
		filepath.Join(cwd, "..", "..", ".env"), // From cmd/server, go up 2 levels
		filepath.Join(cwd, ".env"),             // Current directory
		"C:\\Users\\514917\\Desktop\\SECSEAL\\Seal-back1.0-main\\Seal-back1.0-main\\.env", // Absolute path
	}

	envLoaded := false
	for _, envPath := range envPaths {
		log.Printf("Trying to load .env from: %s", envPath)
		if err := godotenv.Load(envPath); err == nil {
			log.Printf("✅ Loaded environment variables from: %s", envPath)
			envLoaded = true
			break
		} else {
			log.Printf("Failed to load from %s: %v", envPath, err)
		}
	}

	if !envLoaded {
		log.Println("⚠️ Warning: No .env file found. Using system environment variables only.")
	}

	// init DB
	config.InitDB()

	log.Println("🔧 Running database migrations...")
	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		if err := migration.CreateStoreTable(config.DB); err != nil {
			log.Println("Migration failed:", err)
		}
		log.Println("✅ Migrations completed!")
	}()

	app := fiber.New()

	// ✅ เสิร์ฟไฟล์อัปโหลด
	app.Static("/uploads", "./internal/uploads")

	// ✅ เสิร์ฟ frontend static files (สำหรับ production)
	app.Static("/", "./static", fiber.Static{
		Index: "index.html",
	})

	// health check
	app.Get("/api/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "time": time.Now()})
	})

	// CORS - รองรับทุกเครื่องในเครือข่าย LAN
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowMethods:     "GET,POST,PUT,DELETE,OPTIONS",
		AllowHeaders:     "Content-Type, Authorization, Accept",
		AllowCredentials: false, // เปลี่ยนเป็น false เพื่อให้ใช้งานกับ "*" ได้
		ExposeHeaders:    "Content-Length, Content-Type",
		MaxAge:           12 * 3600,
	}))

	app.Options("*", func(c *fiber.Ctx) error {
		if c.Get("Origin") != "" {
			c.Set("Access-Control-Allow-Origin", c.Get("Origin"))
		}
		c.Set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS")
		c.Set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept")
		c.Set("Access-Control-Allow-Credentials", "true")
		return c.SendStatus(fiber.StatusOK)
	})

	// repositories
	userRepo := repository.NewUserRepository(config.DB)
	sealRepo := repository.NewSealRepository(config.DB)
	transactionRepo := repository.NewTransactionRepository(config.DB)
	logRepo := repository.NewLogRepository(config.DB)
	technicianRepo := repository.NewTechnicianRepository(config.DB)
	masPeaRepo := repository.NewMasPeaRepository(config.DB)

	// services
	userService := service.NewUserService(userRepo)
	sealService := service.NewSealService(sealRepo, transactionRepo, logRepo, config.DB, technicianRepo)
	logService := service.NewLogService(logRepo)
	technicianService := service.NewTechnicianService(technicianRepo)
	masPeaService := service.NewMasPeaService(masPeaRepo)

	// controllers
	technicianController := controller.NewTechnicianController(technicianService, sealService)
	userController := controller.NewUserController(userService)
	sealController := controller.NewSealController(sealService)
	logController := controller.NewLogController(logService)
	masPeaController := controller.NewMasPeaController(masPeaService)

	// ... (Login API code remains same)

	// routes
	publicGroup := app.Group("")
	route.SetupTechnicianRoutes(publicGroup, technicianController)
	route.SetupMasPeaRoutes(publicGroup, masPeaController)   // Public for now, or move to secure if needed
	route.SetupPublicSealRoutes(publicGroup, sealController) // ✅ Public seal routes (scan-use)

	// ✅ Login API endpoint
	app.Post("/api/auth/login", func(c *fiber.Ctx) error {
		log.Println("🔑 [LOGIN] Received login request")

		var loginReq struct {
			Username string `json:"username"`
			Password string `json:"password"`
		}

		if err := c.BodyParser(&loginReq); err != nil {
			log.Printf("❌ [LOGIN] Failed to parse request body: %v", err)
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Invalid request body",
			})
		}

		log.Printf("🔍 [LOGIN] Attempting login for username: %s", loginReq.Username)

		var targetUser *model.User

		// 1️⃣ Check Mock Users first
		mockUsers := map[string]map[string]interface{}{
			"admin": {
				"password": "admin123",
				"user_id":  1,
				"role":     "admin",
				"name":     "Administrator",
				"email":    "admin@pea.co.th",
			},
			"user": {
				"password": "user123",
				"user_id":  2,
				"role":     "user",
				"name":     "Regular User",
				"email":    "user@pea.co.th",
			},
		}

		if mockData, exists := mockUsers[loginReq.Username]; exists {
			if mockData["password"] == loginReq.Password {
				nameParts := strings.SplitN(mockData["name"].(string), " ", 2)
				lastName := ""
				if len(nameParts) > 1 {
					lastName = nameParts[1]
				}
				targetUser = &model.User{
					ID:        uint(mockData["user_id"].(int)),
					Username:  loginReq.Username,
					Email:     mockData["email"].(string),
					Role:      mockData["role"].(string),
					FirstName: nameParts[0],
					LastName:  lastName,
				}
			}
		}

		// 2️⃣ If not Mock, Check Database
		if targetUser == nil {
			dbUser, err := userService.GetUserByUsername(loginReq.Username)
			if err == nil && dbUser != nil {
				// ✅ Default Password for DB Users
				if loginReq.Password == "123456" {
					targetUser = dbUser
				} else {
					log.Printf("❌ [LOGIN] Incorrect password for DB user %s", loginReq.Username)
				}
			} else {
				log.Printf("❌ [LOGIN] User not found in DB: %s", loginReq.Username)
			}
		}

		if targetUser == nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid username or password",
			})
		}

		// สร้าง JWT token
		tokenChan := make(chan string, 1)
		var wg sync.WaitGroup
		wg.Add(1)

		go generateToken(targetUser, &wg, tokenChan)
		wg.Wait()
		token := <-tokenChan

		// ✅ บันทึก Mock User ลง Database ถ้ายังไม่มี (DB User มีอยู่แล้ว)
		if _, exists := mockUsers[loginReq.Username]; exists {
			existingUser, err := userService.GetUserByUsername(loginReq.Username)
			if err != nil || existingUser == nil {
				if createErr := userService.CreateUser(targetUser); createErr != nil {
					log.Printf("⚠️ [LOGIN] Could not save mock user to DB: %v", createErr)
				} else {
					log.Printf("✅ [LOGIN] Mock User '%s' saved to database", loginReq.Username)
				}
			}
		}

		return c.JSON(fiber.Map{
			"success": true,
			"message": "Login successful",
			"token":   token,
			"user": fiber.Map{
				"id":       targetUser.ID,
				"username": targetUser.Username,
				"role":     targetUser.Role,
				"name":     fmt.Sprintf("%s %s", targetUser.FirstName, targetUser.LastName),
				"email":    targetUser.Email,
				"pea_code": targetUser.PeaCode,
				"pea_name": targetUser.PeaName,
			},
		})
	})

	// routes

	secureGroup := app.Group("", middleware.JWTMiddleware())
	route.SetupSealRoutes(secureGroup, sealController) // ✅ ย้ายกลับมาใน secure group
	route.SetupUserRoutes(secureGroup, userController)

	secureGroup.Use("/logs", middleware.AdminOnlyMiddleware)
	route.SetupLogRoutes(secureGroup, logController)

	wg.Wait()

	// กำหนด Port
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	fmt.Printf("🚀 Server is running on http://0.0.0.0:%s (accessible from LAN)\n", port)
	fmt.Printf("🌐 Access from your network: http://172.22.1.40:%s\n", port)
	log.Fatal(app.Listen("0.0.0.0:" + port))
}
