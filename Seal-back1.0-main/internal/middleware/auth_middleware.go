package middleware

import (
	"log"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/service"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

var (
	loggedMissingHeader      = false
	loggedTechnicianMissing = false
)

// ✅ JWTMiddleware ใช้ตรวจสอบ Token (ทั้ง PEA API และ Mock JWT)
func JWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			if !loggedMissingHeader {
				log.Println("🚨 Missing Authorization header (further logs will be suppressed)")
				loggedMissingHeader = true
			}
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Missing token",
			})
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")

		authService := service.NewAuthService()

		// ✅ ลองตรวจสอบกับ Mock JWT ก่อน
		user, err := authService.VerifyMockJWT(tokenString)
		if err == nil {
			setUserContext(c, user)
			return c.Next()
		}

		// ❌ ถ้า Mock JWT ไม่ผ่าน ลองตรวจสอบกับ PEA API
		log.Println("⚠️ [JWTMiddleware] Mock JWT verification failed. Trying PEA API...")
		user, err = authService.VerifyPEAToken(tokenString)
		if err != nil {
			log.Println("❌ [JWTMiddleware] Token Verification Failed:", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
				"error": "Invalid token",
			})
		}

		// ✅ Ensure role is set in Context
		if user.Role == "" {
			log.Println("🚨 [JWTMiddleware] Role is missing from token")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token: missing role"})
		}

		setUserContext(c, user)
		return c.Next()
	}
}

func AdminOnlyMiddleware(c *fiber.Ctx) error {
	log.Printf("Role from c.Locals('role'): %v", c.Locals("role"))
	role, ok := c.Locals("role").(string)
	if !ok || role != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied. Admins only"})
	}
	return c.Next()
}

// ✅ ฟังก์ชันช่วยเซ็ตค่า User Context ใน Fiber
func setUserContext(c *fiber.Ctx, user *model.User) {
	c.Locals("user_id", user.EmpID)
	c.Locals("role", user.Role) // ✅ Role is always set now
	c.Locals("first_name", user.FirstName)
	c.Locals("last_name", user.LastName)

	// ✅ เพิ่มข้อมูลของ กฟฟ. ลงใน Context
	c.Locals("pea_code", user.PeaCode)
	c.Locals("pea_short", user.PeaShort)
	c.Locals("pea_name", user.PeaName)
}

// ✅ Middleware สำหรับตรวจสอบ JWT ของ Technician
func TechnicianJWTMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {

		// ✅ ข้าม JWT สำหรับบาง Path
		skipPaths := []string{
			"/api/technician/register",
			"/api/technician/login",
			"/api/technician/import",
			"/api/technician/list",
		}

		regexPatterns := []string{
			`^/api/technician/update/\d+$`,
			`^/api/technician/delete/\d+$`,
		}

		for _, path := range skipPaths {
			if c.Path() == path {
// log.Println("✅ [TechnicianJWTMiddleware] Skipping JWT check for:", c.Path())
				return c.Next()
			}
		}

		for _, pattern := range regexPatterns {
			match, _ := regexp.MatchString(pattern, c.Path())
			if match {
// log.Println("✅ [TechnicianJWTMiddleware] Skipping JWT check for:", c.Path())
				return c.Next()
			}
		}

		// 🔑 ตรวจสอบ Authorization Header
		authHeader := c.Get("Authorization")

		if authHeader == "" {
			if !loggedTechnicianMissing {
				log.Println("❌ [TechnicianJWTMiddleware] Missing Token (further logs will be suppressed)")
				loggedTechnicianMissing = true
			}
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Missing token"})
		}

		// ✅ ตัด "Bearer " ออกให้ถูกต้อง
		tokenString := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))

		// ✅ ป้องกัน Token ที่ยังมี "Bearer " ติดซ้ำ
		if strings.HasPrefix(tokenString, "Bearer ") {
			tokenString = strings.TrimPrefix(tokenString, "Bearer ")
			tokenString = strings.TrimSpace(tokenString) // ลบช่องว่างที่อาจเกิดขึ้น
		}

		// ✅ เช็คว่า Token ดูเหมือนถูกต้องหรือไม่
		if len(tokenString) < 20 {
			log.Println("❌ [TechnicianJWTMiddleware] Token is too short or malformed")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token format"})
		}

		// ✅ โหลด Secret Key จาก Environment (ถ้าใช้จริงควรใช้ .env)
		technicianSecretKey := []byte(os.Getenv("TECHNICIAN_SECRET_KEY"))
		if len(technicianSecretKey) == 0 {
			technicianSecretKey = []byte("your-technician-secret-key") // ใช้ค่า Default (แต่ควรแก้เป็น env)
		}

		// ✅ ตรวจสอบว่า Token Decode ได้หรือไม่
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			return technicianSecretKey, nil
		})

		if err != nil || !token.Valid {
			log.Println("❌ [TechnicianJWTMiddleware] Invalid Token:", err)
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token"})
		}

		// ✅ ตรวจสอบ Claims ของ Token
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			log.Println("❌ [TechnicianJWTMiddleware] Invalid Token Claims")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token claims"})
		}

		// ✅ ตรวจสอบ Expiration (`exp`)
		if exp, ok := claims["exp"].(float64); ok {
			expTime := time.Unix(int64(exp), 0)
			if time.Now().After(expTime) {
				log.Println("❌ [TechnicianJWTMiddleware] Token Expired at:", expTime)
				return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Token expired"})
			}
		} else {
			log.Println("❌ [TechnicianJWTMiddleware] Missing `exp` in Token")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token: missing expiration"})
		}

		// ✅ ตรวจสอบ Role ว่าเป็น "technician" หรือไม่
		role, _ := claims["role"].(string)

		if role != "technician" {
			log.Println("❌ [TechnicianJWTMiddleware] Access Denied: Not a Technician")
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied: not technician"})
		}

		// ✅ ตรวจสอบ `tech_id`
		techIDFloat, ok := claims["tech_id"].(float64)
		if !ok {
			log.Println("❌ [TechnicianJWTMiddleware] Missing tech_id in Token")
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Invalid token: missing tech_id"})
		}
		
		techID := uint(techIDFloat)
		isCenter, _ := claims["is_center"].(bool)

		// ✅ ตั้งค่าใน `Locals` เพื่อให้ API ใช้
		c.Locals("tech_id", techID)
		c.Locals("role", role)
		c.Locals("is_center", isCenter)

// log.Printf("🔑 [TechnicianJWTMiddleware] Access granted: tech_id=%d, role=%s, is_center=%v", techID, role, isCenter)

		return c.Next()
	}
}
