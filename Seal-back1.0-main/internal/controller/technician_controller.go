package controller

import (
	"fmt"
	"log"

	"strconv"

	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/service"
	"github.com/Kev2406/PEA/internal/uploads"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// TechnicianController รับผิดชอบ endpoint สำหรับช่าง (Technician)
type TechnicianController struct {
	technicianService *service.TechnicianService
	sealService       *service.SealService
	masComService     *service.MasComService
	masPeaService     *service.MasPeaService
}

// NewTechnicianController สร้าง instance ของ TechnicianController
func NewTechnicianController(technicianService *service.TechnicianService, sealService *service.SealService, masComService *service.MasComService, masPeaService *service.MasPeaService) *TechnicianController {
	return &TechnicianController{
		technicianService: technicianService,
		sealService:       sealService,
		masComService:     masComService,
		masPeaService:     masPeaService,
	}
}

func (tc *TechnicianController) RegisterHandler(c *fiber.Ctx) error {
	var req struct {
		TechnicianCode string `json:"technician_code"`
		Username       string `json:"username"`
		Password       string `json:"password"`
		FirstName      string `json:"first_name"`
		LastName       string `json:"last_name"`
		Email          string `json:"email"`
		PhoneNumber    string `json:"phone_number"`

		// เพิ่มฟิลด์ใหม่
		CompanyName string `json:"company_name"`
		Department  string `json:"department"`
		PeaCode     string `json:"pea_code"` // ✅ สังกัด
		ComCode     string `json:"com_code"` // ✅ รหัสศูนย์งาน (ใช้สร้าง technician_code อัตโนมัติ)
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// ✅ Auto-generate technician_code ถ้าส่ง com_code มาแต่ไม่ได้ส่ง technician_code
	if req.TechnicianCode == "" && req.ComCode != "" {
		// 1) หา MasCom จาก com_code
		com, err := tc.masComService.GetComByCode(req.ComCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ไม่พบศูนย์งาน: " + req.ComCode})
		}

		// 2) หา MasPea จาก pea_code ของ MasCom เพื่อเอา NameEng
		pea, err := tc.masPeaService.GetPeaByCode(com.PeaCode)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "ไม่พบสังกัด: " + com.PeaCode + " (DB err: " + err.Error() + ")"})
		}

		// 3) สร้าง prefix: {comCode}{NameEng}
		prefix := req.ComCode + pea.NameEng

		// 4) นับจำนวนช่างที่ขึ้นต้นด้วย prefix นี้
		count, err := tc.technicianService.CountByCodePrefix(prefix)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "ไม่สามารถสร้างรหัสช่างได้"})
		}

		// 5) สร้าง technician_code: {prefix}-{ลำดับถัดไป 2 หลัก}
		req.TechnicianCode = fmt.Sprintf("%s-%02d", prefix, count+1)

		// ✅ ตั้ง pea_code จาก MasCom ถ้ายังไม่ได้ส่งมา
		if req.PeaCode == "" {
			req.PeaCode = com.PeaCode
		}

		log.Printf("✅ Auto-generated technician_code: %s", req.TechnicianCode)
	}

	// สร้าง Model เพื่อส่งไป Service
	tech := &model.Technician{
		TechnicianCode: req.TechnicianCode,
		Username:       req.Username,
		Password:       req.Password,
		FirstName:      req.FirstName,
		LastName:       req.LastName,
		Email:          req.Email,
		PhoneNumber:    req.PhoneNumber,
		PeaCode:        req.PeaCode, // ✅ Map ค่า
		ComCode:        req.ComCode, // ✅ รหัสศูนย์งาน

		// ใส่ค่านี้ด้วย
		CompanyName: req.CompanyName,
	}

	// ถ้าไม่มี username ให้ใช้ technician_code แทน
	if tech.Username == "" && tech.TechnicianCode != "" {
		tech.Username = tech.TechnicianCode
	}

	// ถ้าไม่มี email ให้ใช้ค่า dummy เพื่อป้องกันปัญหา unique constraint
	if tech.Email == "" && tech.TechnicianCode != "" {
		tech.Email = tech.TechnicianCode + "@dummy.pea.co.th"
	}

	// เรียก Service เพื่อ Register
	if err := tc.technicianService.Register(tech); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":         "Technician registered successfully",
		"technician_code": tech.TechnicianCode,
	})
}

// ✅ LoginHandler สำหรับล็อกอินช่าง
func (tc *TechnicianController) LoginHandler(c *fiber.Ctx) error {
	var req struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	token, err := tc.technicianService.Login(req.Username, req.Password)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": err.Error()})
	}

	// Fetch Technician to get is_center flag
	tech, err := tc.technicianService.GetTechnicianByUsername(req.Username)
	isCenter := false
	if err == nil && tech != nil {
		isCenter = tech.IsCenter
	}

	return c.JSON(fiber.Map{
		"token":     token,
		"is_center": isCenter,
	})
}

// ✅ Technician ดูรายการซีลที่ได้รับมอบหมาย (เฉพาะของตัวเองเท่านั้น)
func (tc *TechnicianController) GetAssignedSealsHandler(c *fiber.Ctx) error {
	// ✅ ตรวจสอบ tech_id จาก JWT Token
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	fmt.Println("✅ Technician ID from Token:", techID) // Debug Log

	seals, err := tc.sealService.GetSealsByTechnician(techID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	// ✅ ถ้าเป็น IsCenter ให้ดึงซีลทั้งหมดในสังกัดนี้ที่อยู่ในสถานะรอยืนยัน
	isCenter, _ := c.Locals("is_center").(bool)
	if isCenter {
		tech, err := tc.technicianService.GetTechnicianByID(techID)
		if err == nil && tech.PeaCode != "" {
			seen := make(map[uint]bool)
			for _, s := range seals {
				seen[s.ID] = true
			}

			// Case 1: ดึงซีลที่มี pea_code ตรงกับสังกัดและรอยืนยัน (direct transfer)
			companySeals, err := tc.sealService.GetWaitConfirmationByPeaCode(tech.PeaCode)
			if err == nil {
				for _, s := range companySeals {
					if !seen[s.ID] {
						seals = append(seals, s)
						seen[s.ID] = true
					}
				}
			}

			// Case 2: ดึงซีลที่โอนระหว่างบริษัท (inter-company, pending_pea_code set)
			pendingSeals, err := tc.sealService.GetAllSeals("", tech.PeaCode)
			if err == nil {
				for _, s := range pendingSeals {
					if !seen[s.ID] {
						seals = append(seals, s)
						seen[s.ID] = true
					}
				}
			}
		}
	}

	return c.JSON(seals)
}

// ✅ User ปกติดูรายการซีลทั้งหมดที่จ่ายให้ช่าง (สำหรับ regular user)
func (tc *TechnicianController) GetAllTechnicianSealsHandler(c *fiber.Ctx) error {
	log.Printf("🔍 [GetAllTechnicianSealsHandler] Path: %s, Query: %s", c.Path(), c.OriginalURL())

	// ✅ เช็คสิทธิ์: ถ้าเป็นช่าง ต้องเป็น IsCenter ถึงจะดูได้
	roleInter := c.Locals("role")
	if roleInter == nil {
		log.Println("🚨 [GetAllTechnicianSealsHandler] Missing role in context")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized: role missing"})
	}
	role := roleInter.(string)

	if role == "technician" {
		isCenterInter := c.Locals("is_center")
		isCenter := false
		if isCenterInter != nil {
			isCenter = isCenterInter.(bool)
		}

		log.Printf("🕵️ [GetAllTechnicianSealsHandler] Role: technician, is_center: %v", isCenter)

		if !isCenter {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied: Center accounts only"})
		}
	} else {
		log.Printf("🕵️ [GetAllTechnicianSealsHandler] Role: %s", role)
	}

	// ✅ ดึงรายการซีลทั้งหมดที่มีสถานะ assigned_to_technician
	techIDStr := c.Query("technician_id")
	log.Printf("👤 [GetAllTechnicianSealsHandler] technician_id query: %s", techIDStr)
	if techIDStr != "" {
		techID, err := strconv.Atoi(techIDStr)
		if err == nil {
			seals, err := tc.sealService.GetSealsByTechnician(uint(techID))
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
			}
			return c.JSON(seals)
		}
	}

	seals, err := tc.sealService.GetAllAssignedSeals()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(seals)
}

func (tc *TechnicianController) InstallSealHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// รับค่า seal_number และ serial_number จาก JSON Body
	var req struct {
		SealNumber   string `json:"seal_number"`
		SerialNumber string `json:"serial_number,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		log.Println("❌ [ERROR] Failed to parse request body:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	log.Println("🔍 [DEBUG] InstallSealHandler: seal_number =", req.SealNumber, ", serial_number =", req.SerialNumber)

	if req.SealNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Seal number is required"})
	}

	err := tc.technicianService.InstallSeal(req.SealNumber, techID, req.SerialNumber)
	if err != nil {
		log.Println("❌ [ERROR] Install Seal Error:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":       "ติดตั้งซีลสำเร็จ กรุณาอัปโหลดรูปภาพ",
		"seal_number":   req.SealNumber,
		"serial_number": req.SerialNumber,
	})
}

// ✅ Technician คืนซีลที่ติดตั้งแล้วหรือชำรุด
func (tc *TechnicianController) ReturnSealHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	// 1) รับค่าจาก FormData
	sealNumber := c.FormValue("seal_number")
	reason := c.FormValue("reason")

	if sealNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "seal_number is required"})
	}

	// 2) อัปโหลดรูปภาพถ้ามี
	var imageURL string
	file, err := c.FormFile("image")
	if err == nil && file.Size > 0 {
		imageURL, err = uploads.SaveImage(file)
		if err != nil {
			log.Println("❌ [ERROR] Failed to save return image:", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save image"})
		}
	}

	// 3) บันทึกการคืนซีลในฐานข้อมูล
	err = tc.technicianService.ReturnSealWithImage(sealNumber, techID, reason, imageURL)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":     "คืน Seal สำเร็จ",
		"seal_number": sealNumber,
		"reason":      reason,
		"image_url":   imageURL,
	})
}

// ✅ Technician ตรวจสอบซีลก่อนคืน (ว่าอยู่สังกัดเดียวกันหรือไม่)
func (tc *TechnicianController) CheckReturnableSealHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	sealNumber := c.Params("seal_number")
	if sealNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "seal_number is required"})
	}

	seal, err := tc.technicianService.CheckReturnableSeal(sealNumber, techID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": "สามารถคืนซีลได้",
		"seal":    seal,
	})
}

// TransferSealsHandler allows a Center to transfer seals to another Technician
// POST /api/technician/seals/transfer
func (tc *TechnicianController) TransferSealsHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		TargetTechnicianID uint     `json:"target_technician_id"`
		SealNumbers        []string `json:"seal_numbers"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if req.TargetTechnicianID == 0 || len(req.SealNumbers) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "target_technician_id and seal_numbers are required"})
	}

	err := tc.technicianService.TransferSeals(techID, req.TargetTechnicianID, req.SealNumbers)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "โอนซีลสำเร็จ"})
}

func (tc *TechnicianController) UpdateTechnicianHandler(c *fiber.Ctx) error {
	techIDStr := c.Params("id")
	techID, err := strconv.Atoi(techIDStr)
	if err != nil {
		log.Println("❌ [ERROR] Invalid Technician ID:", techIDStr, "Error:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid technician id"})
	}

	var req struct {
		FirstName   string `json:"first_name"`
		LastName    string `json:"last_name"`
		PhoneNumber string `json:"phone_number"`
		CompanyName string `json:"company_name"`
	}

	if err := c.BodyParser(&req); err != nil {
		log.Println("❌ [ERROR] Invalid JSON body:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid body"})
	}

	log.Println("🔍 [DEBUG] Technician Update Request:", req)

	// Convert req to the expected format
	techData := struct {
		FirstName   string
		LastName    string
		PhoneNumber string
		CompanyName string
	}{
		FirstName:   req.FirstName,
		LastName:    req.LastName,
		PhoneNumber: req.PhoneNumber,
		CompanyName: req.CompanyName,
	}

	err = tc.technicianService.UpdateTechnician(uint(techID), techData)
	if err != nil {
		log.Println("❌ [ERROR] Failed to update technician:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	log.Println("✅ [SUCCESS] Technician updated successfully! ID:", techID)
	return c.JSON(fiber.Map{"message": "Technician updated successfully"})
}

func (tc *TechnicianController) ImportTechniciansHandler(c *fiber.Ctx) error {
	var techList []model.Technician
	if err := c.BodyParser(&techList); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid JSON array"})
	}

	for i := range techList {
		t := &techList[i]

		// ใส่ default password ถ้าจำเป็น
		if t.Password == "" {
			t.Password = "default123"
		}

		// ถ้าไม่มี username ให้ใช้ technician_code แทน
		if t.Username == "" && t.TechnicianCode != "" {
			t.Username = t.TechnicianCode
		}

		// ถ้าไม่มี email ให้สร้างเพื่อหลีกเลี่ยง error
		if t.Email == "" && t.TechnicianCode != "" {
			t.Email = t.TechnicianCode + "@dummy.pea.co.th"
		}

		if err := tc.technicianService.Register(t); err != nil {
			// ให้ข้อมูลเพิ่มเติมเกี่ยวกับ Error ว่าเกิดขึ้นกับคนไหน
			return c.Status(500).JSON(fiber.Map{
				"error": fmt.Sprintf("Error at %s: %v", t.TechnicianCode, err),
			})
		}
	}

	return c.JSON(fiber.Map{"message": "Imported successfully", "count": len(techList)})
}

// SetPasswordHandler forcefully sets a single technician's password
// POST /api/technician/set-password
// Body: { "username": "...", "new_password": "..." }
func (tc *TechnicianController) SetPasswordHandler(c *fiber.Ctx) error {
	var req struct {
		Username    string `json:"username"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}
	if req.Username == "" || req.NewPassword == "" {
		return c.Status(400).JSON(fiber.Map{"error": "username and new_password are required"})
	}
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to hash password"})
	}
	technicians, err := tc.technicianService.GetAllTechnicians("", false, "")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "failed to fetch technicians"})
	}
	for _, tech := range technicians {
		if tech.Username == req.Username {
			if err := tc.technicianService.UpdateTechnicianPassword(tech.ID, string(hashed)); err != nil {
				return c.Status(500).JSON(fiber.Map{"error": "failed to update password"})
			}
			return c.JSON(fiber.Map{"message": "Password updated successfully", "username": req.Username})
		}
	}
	return c.Status(404).JSON(fiber.Map{"error": "technician not found"})
}

// ResetAllPasswordsHandler re-hashes all passwords that are stored as plain text
// POST /api/technician/reset-passwords
func (tc *TechnicianController) ResetAllPasswordsHandler(c *fiber.Ctx) error {
	technicians, err := tc.technicianService.GetAllTechnicians("", false, "")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Failed to fetch technicians"})
	}

	fixed := 0
	for i := range technicians {
		tech := &technicians[i]
		// bcrypt hashes always start with "$2a$" or "$2b$"
		if len(tech.Password) > 0 && tech.Password[:1] != "$" {
			hashed, err := bcrypt.GenerateFromPassword([]byte(tech.Password), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("❌ Failed to hash password for %s: %v", tech.Username, err)
				continue
			}
			tech.Password = string(hashed)
			if err := tc.technicianService.UpdateTechnicianPassword(tech.ID, tech.Password); err != nil {
				log.Printf("❌ Failed to update password for %s: %v", tech.Username, err)
				continue
			}
			fixed++
		}
	}

	return c.JSON(fiber.Map{
		"message": "Password reset complete",
		"fixed":   fixed,
	})
}
func (tc *TechnicianController) GetAllTechniciansHandler(c *fiber.Ctx) error {
	peaCode := c.Query("pea_code", "")
	comCode := c.Query("com_code", "")
	isPrefix := c.Query("is_prefix", "false") == "true"
	technicians, err := tc.technicianService.GetAllTechnicians(peaCode, isPrefix, comCode)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch technicians"})
	}
	return c.JSON(technicians)
}

func (tc *TechnicianController) DeleteTechnicianHandler(c *fiber.Ctx) error {
	techIDStr := c.Params("id")
	techID, err := strconv.Atoi(techIDStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid technician ID"})
	}

	err = tc.technicianService.DeleteTechnician(uint(techID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "Technician deleted successfully"})
}
func (tc *TechnicianController) UploadSealImagesHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		log.Println("❌ [ERROR] Unauthorized access: No tech_id found")
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}
	log.Println("🔍 [DEBUG] Technician ID:", techID)

	sealNumber := c.FormValue("seal_number")
	log.Println("📸 [DEBUG] Received seal_number =", sealNumber)

	if sealNumber == "" {
		log.Println("❌ [ERROR] Missing seal_number in request")
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Seal number is required"})
	}

	var imageURL1, imageURL2 string

	// ✅ Debug ว่ามีไฟล์ถูกอัปโหลดมาจริงไหม + เช็กขนาดไฟล์
	file1, err1 := c.FormFile("image1")
	if err1 == nil {
		log.Println("✅ [DEBUG] Image1 received:", file1.Filename)
		log.Println("📂 [DEBUG] Image1 size:", file1.Size, "bytes")
		log.Println("📂 [DEBUG] Image1 MIME type:", file1.Header.Get("Content-Type"))

		if file1.Size > 0 {
			imageURL1, err1 = uploads.SaveImage(file1)
			if err1 != nil {
				log.Println("❌ [ERROR] Failed to save Image1:", err1)
			}
		} else {
			log.Println("⚠️ [WARNING] Image1 is empty (size = 0)")
		}
	} else {
		log.Println("❌ [ERROR] Image1 FormFile error:", err1)
	}

	file2, err2 := c.FormFile("image2")
	if err2 == nil {
		log.Println("✅ [DEBUG] Image2 received:", file2.Filename)
		log.Println("📂 [DEBUG] Image2 size:", file2.Size, "bytes")
		log.Println("📂 [DEBUG] Image2 MIME type:", file2.Header.Get("Content-Type"))

		if file2.Size > 0 {
			imageURL2, err2 = uploads.SaveImage(file2)
			if err2 != nil {
				log.Println("❌ [ERROR] Failed to save Image2:", err2)
			}
		} else {
			log.Println("⚠️ [WARNING] Image2 is empty (size = 0)")
		}
	} else {
		log.Println("❌ [ERROR] Image2 FormFile error:", err2)
	}

	// ✅ เพิ่ม Debug ก่อนส่งไปยัง Service
	log.Println("📸 [DEBUG] Sending to service -> seal_number:", sealNumber, "image1:", imageURL1, "image2:", imageURL2)

	err := tc.technicianService.UploadSealImages(sealNumber, techID, imageURL1, imageURL2)
	if err != nil {
		log.Println("❌ [ERROR] UploadSealImages Error:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	log.Println("✅ [SUCCESS] Image upload completed for seal:", sealNumber)
	return c.JSON(fiber.Map{
		"message":     "อัปโหลดรูปสำเร็จ",
		"seal_number": sealNumber,
		"image1":      imageURL1,
		"image2":      imageURL2,
	})
}

// GetNotificationsHandler handles GET /api/technician/notifications
func (tc *TechnicianController) GetNotificationsHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	logs, err := tc.technicianService.GetNotifications(techID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch notifications"})
	}

	return c.JSON(logs)
}

// ClearNotificationsHandler handles DELETE /api/technician/notifications
func (tc *TechnicianController) ClearNotificationsHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	err := tc.technicianService.ClearNotifications(techID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to clear notifications"})
	}

	return c.JSON(fiber.Map{"message": "Notifications cleared successfully"})
}

// GetMeHandler returns the profile of the currently logged-in technician
func (tc *TechnicianController) GetMeHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	tech, err := tc.technicianService.GetTechnicianByID(techID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch profile info"})
	}

	// Make sure we hide the password
	tech.Password = ""

	return c.JSON(tech)
}

// UpdateDeviceTokenHandler saves the Expo Push Token for the technician
func (tc *TechnicianController) UpdateDeviceTokenHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		ExpoPushToken string `json:"expo_push_token"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON body"})
	}

	if req.ExpoPushToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Token is required"})
	}

	err := tc.technicianService.UpdatePushToken(techID, req.ExpoPushToken)
	if err != nil {
		log.Println("❌ [ERROR] Failed to save push token:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update token"})
	}

	return c.JSON(fiber.Map{"message": "Device token updated successfully"})
}

// ConfirmSealsReceiptHandler handles POST /api/technician/seals/confirm
func (tc *TechnicianController) ConfirmSealsReceiptHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		SealNumbers []string `json:"seal_numbers"`
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if len(req.SealNumbers) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "seal_numbers are required"})
	}

	var err error
	isCenter, _ := c.Locals("is_center").(bool)

	if isCenter {
		// ถ้าเป็น Center ให้ใช้การยืนยันรับโอนระหว่างบริษัท
		tech, techErr := tc.technicianService.GetTechnicianByID(techID)
		if techErr != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "ไม่พบข้อมูลผู้ใช้งาน"})
		}
		_, err = tc.sealService.BulkConfirmCompanyTransfer(req.SealNumbers, tech.PeaCode, techID)
	} else {
		// ถ้าเป็น Technician ปกติ ให้ใช้การยืนยันรับซีลจากบริษัท
		err = tc.sealService.ConfirmSealsReceipt(techID, req.SealNumbers)
	}

	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{"message": "ยืนยันการรับซีลสำเร็จ"})
}
