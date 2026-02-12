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

	// services
	userService := service.NewUserService(userRepo)
	sealService := service.NewSealService(sealRepo, transactionRepo, logRepo, config.DB, technicianRepo)
	logService := service.NewLogService(logRepo)
	technicianService := service.NewTechnicianService(technicianRepo)

	// controllers
	technicianController := controller.NewTechnicianController(technicianService, sealService)
	userController := controller.NewUserController(userService)
	sealController := controller.NewSealController(sealService)
	logController := controller.NewLogController(logService)

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

		// Mock users - ในระบบจริงจะดึงจาก database
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

		user, exists := mockUsers[loginReq.Username]
		if !exists || user["password"] != loginReq.Password {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid username or password",
			})
		}

		// สร้าง JWT token
		tokenChan := make(chan string, 1)
		var wg sync.WaitGroup
		wg.Add(1)

		mockUser := &model.User{
			ID:       uint(user["user_id"].(int)),
			Username: loginReq.Username,
			Email:    user["email"].(string),
			Role:     user["role"].(string),
		}

		go generateToken(mockUser, &wg, tokenChan)
		wg.Wait()
		token := <-tokenChan

		// ✅ บันทึก User ลง Database ถ้ายังไม่มี
		existingUser, err := userService.GetUserByUsername(loginReq.Username)
		if err != nil || existingUser == nil {
			dbUser := &model.User{
				EmpID:    uint(user["user_id"].(int)),
				Username: loginReq.Username,
				Email:    user["email"].(string),
				Role:     user["role"].(string),
			}
			// แยกชื่อจาก name
			nameParts := strings.SplitN(user["name"].(string), " ", 2)
			dbUser.FirstName = nameParts[0]
			if len(nameParts) > 1 {
				dbUser.LastName = nameParts[1]
			}
			if createErr := userService.CreateUser(dbUser); createErr != nil {
				log.Printf("⚠️ [LOGIN] Could not save user to DB: %v", createErr)
			} else {
				log.Printf("✅ [LOGIN] User '%s' saved to database", loginReq.Username)
			}
		}

		return c.JSON(fiber.Map{
			"success": true,
			"message": "Login successful",
			"token":   token,
			"user": fiber.Map{
				"id":       user["user_id"],
				"username": loginReq.Username,
				"role":     user["role"],
				"name":     user["name"],
				"email":    user["email"],
			},
		})
	})

	// routes
	publicGroup := app.Group("")
	route.SetupTechnicianRoutes(publicGroup, technicianController)

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
