package controller

import (
	"fmt"
	"log"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"os"
	"path/filepath"

	"github.com/Kev2406/PEA/internal/service"
	"github.com/gofiber/fiber/v2"
)

type SealController struct {
	sealService *service.SealService
}

func NewSealController(sealService *service.SealService) *SealController {
	return &SealController{sealService: sealService}
}

// -------------------------------------------------------------------
// 0) GetAllSealsHandler - Get all seals
// -------------------------------------------------------------------
func (sc *SealController) GetAllSealsHandler(c *fiber.Ctx) error {
	seals, err := sc.sealService.GetAllSeals(c.Query("pea_code", ""))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(seals)
}

// -------------------------------------------------------------------
// 1) GetSealsByStatusHandler
// -------------------------------------------------------------------
func (sc *SealController) GetSealsByStatusHandler(c *fiber.Ctx) error {
	// /api/seals/status/:status เช่น /api/seals/status/พร้อมใช้งาน
	rawStatus := c.Params("status")
	status, err := url.QueryUnescape(rawStatus)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid status parameter: " + err.Error(),
		})
	}

	seals, err := sc.sealService.GetSealsByStatus(status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	return c.JSON(seals)
}

// -------------------------------------------------------------------
// 2) GetSealByIDAndStatusHandler
// -------------------------------------------------------------------
func (sc *SealController) GetSealByIDAndStatusHandler(c *fiber.Ctx) error {
	rawID := c.Params("id")
	rawStatus := c.Params("status")

	status, err := url.QueryUnescape(rawStatus)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid status parameter: " + err.Error(),
		})
	}

	sealID, err := strconv.Atoi(rawID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid ID format",
		})
	}

	log.Println("🎬 กำลังดึงซีล ID:", sealID, " สถานะ:", status)

	seal, err := sc.sealService.GetSealByIDAndStatus(uint(sealID), status)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Seal not found"})
	}
	return c.JSON(seal)
}

// -------------------------------------------------------------------
// 3) GenerateSealsMultipleBatchesHandler (เฉพาะ admin)
// POST /api/seals/generate-batches
// Body:
//
//	{
//	  "batches": [
//	    { "seal_number": "F2499", "count": 3 },
//	    { "seal_number": "PEA000002", "count": 2 }
//	  ]
//	}
//
// -------------------------------------------------------------------
func (sc *SealController) GenerateSealsMultipleBatchesHandler(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	role, roleOk := c.Locals("role").(string)
	if !ok || !roleOk || (role != "admin" && role != "user") {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "Access denied",
		})
	}

	var request struct {
		Batches []struct {
			SealNumber string `json:"seal_number"`
			Count      int    `json:"count"`
			PeaCode    string `json:"pea_code"` // ✅ รับ PeaCode
			Status     string `json:"status"`   // ✅ รับ status
		} `json:"batches"`
	}

	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if len(request.Batches) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No batches provided",
		})
	}

	var allCreatedSeals []interface{}
	for _, batch := range request.Batches {
		if batch.SealNumber == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "Seal number is required in each batch",
			})
		}
		if batch.Count <= 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": fmt.Sprintf("Invalid count (%d) in batch for seal_number=%s", batch.Count, batch.SealNumber),
			})
		}

		seals, err := sc.sealService.GenerateAndCreateSealsFromNumber(batch.SealNumber, batch.Count, userID, batch.PeaCode, batch.Status)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
		}
		allCreatedSeals = append(allCreatedSeals, seals)
	}

	return c.JSON(fiber.Map{
		"message": "All batches generated successfully",
		"results": allCreatedSeals,
	})
}

// -------------------------------------------------------------------
// 4) ScanSealHandler
// POST /api/seals/scan
// Body: { "seal_number": "F2499" }
// -------------------------------------------------------------------
func (sc *SealController) ScanSealHandler(c *fiber.Ctx) error {
	var request struct {
		SealNumber string `json:"seal_number"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request"})
	}

	seal, err := sc.sealService.GetSealByNumber(request.SealNumber)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Seal not found"})
	}
	return c.JSON(fiber.Map{
		"message": "Seal scanned successfully",
		"seal":    seal,
	})
}

// -------------------------------------------------------------------
// 5) GetSealReportHandler
// GET /api/seals/report
// -------------------------------------------------------------------
func (sc *SealController) GetSealReportHandler(c *fiber.Ctx) error {
	peaCode := c.Query("pea_code", "")
	report, err := sc.sealService.GetSealReport(peaCode)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to generate report"})
	}
	return c.JSON(report)
}

// -------------------------------------------------------------------
// 6) GetSealHandler
// GET /api/seals/:seal_number
// -------------------------------------------------------------------
func (sc *SealController) GetSealHandler(c *fiber.Ctx) error {
	sealNumber := c.Params("seal_number")
	seal, err := sc.sealService.GetSealByNumber(sealNumber)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Seal not found"})
	}
	return c.JSON(seal)
}

// -------------------------------------------------------------------
// 7) IssueSealHandler (จ่าย Seal)
// PUT /api/seals/:seal_number/issue?issued_to=?&employee_code=?&remark=?
// -------------------------------------------------------------------
func (sc *SealController) IssueSealHandler(c *fiber.Ctx) error {
	sealNumber := c.Params("seal_number")

	issuedToParam := c.Query("issued_to", "3")
	employeeCode := c.Query("employee_code", "12345")
	remark := c.Query("remark", "จ่ายให้พนักงานตามคำสั่ง")

	issuedTo, err := strconv.ParseUint(issuedToParam, 10, 32)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid issued_to parameter"})
	}

	seal, err := sc.sealService.GetSealByNumber(sealNumber)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Database query failed"})
	}
	if seal == nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Seal not found"})
	}
	if seal.Status != "พร้อมใช้งาน" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Seal is not available for issuing"})
	}

	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		// fallback to 0 or we can return error. let's just use 0 if not exist
		userID = 0
	}

	if err := sc.sealService.IssueSealWithDetails(sealNumber, uint(issuedTo), employeeCode, remark, userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":       "จ่าย Seal เรียบร้อย",
		"seal_number":   sealNumber,
		"issued_to":     issuedTo,
		"employee_code": employeeCode,
		"remark":        remark,
	})
}

// -------------------------------------------------------------------
// 8) UseSealHandler (ติดตั้ง) + รับ Serial Number ใน Body
// PUT /api/seals/:seal_number/use
// Body: { "serial_number": "..." }
// -------------------------------------------------------------------
func (sc *SealController) UseSealHandler(c *fiber.Ctx) error {
	sealNumber := c.Params("seal_number")
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var request struct {
		SerialNumber string `json:"serial_number,omitempty"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if err := sc.sealService.UseSealWithSerial(sealNumber, userID, request.SerialNumber); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"message":       "ติดตั้ง Seal เรียบร้อย",
		"serial_number": request.SerialNumber,
	})
}

// -------------------------------------------------------------------
// 9) ReturnSealHandler (ใช้งานแล้ว) + Remarks
// PUT /api/seals/:seal_number/return
// Body: { "remarks": "..." }
// -------------------------------------------------------------------
func (sc *SealController) ReturnSealHandler(c *fiber.Ctx) error {
	sealNumber := c.Params("seal_number")
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var request struct {
		Remarks string `json:"remarks,omitempty"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if err := sc.sealService.ReturnSealWithRemarks(sealNumber, userID, request.Remarks); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"message": "บันทึกเป็น 'ใช้งานแล้ว' เรียบร้อย",
		"remarks": request.Remarks,
	})
}

// -------------------------------------------------------------------
// 10) GenerateSealsHandler (admin)
// POST /api/seals/generate
// Body: { "seal_number":"F2499", "count":3 }
// -------------------------------------------------------------------
func (sc *SealController) GenerateSealsHandler(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	role, roleOk := c.Locals("role").(string)
	if !ok || !roleOk || role != "admin" {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "Access denied, admin only"})
	}

	var request struct {
		SealNumber string `json:"seal_number"`
		Count      int    `json:"count"`
		PeaCode    string `json:"pea_code"` // ✅ รับ PeaCode
		Status     string `json:"status"`   // ✅ รับ status
	}
	if err := c.BodyParser(&request); err != nil || request.Count <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if request.SealNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Seal number is required"})
	}

	seals, err := sc.sealService.GenerateAndCreateSealsFromNumber(request.SealNumber, request.Count, userID, request.PeaCode, request.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Seals generated successfully", "seals": seals})
}

// -------------------------------------------------------------------
// 11) CreateSealHandler (user?)
// POST /api/seals/ (กรณีต้องการ Create Seal แบบเดียวกับ GenerateSeals)
// -------------------------------------------------------------------
func (sc *SealController) CreateSealHandler(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var request struct {
		SealNumber string `json:"seal_number"`
		Count      int    `json:"count"`
		PeaCode    string `json:"pea_code"` // ✅ รับ PeaCode
		Status     string `json:"status"`   // ✅ รับ status
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid input"})
	}
	if request.SealNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Seal number is required"})
	}
	if request.Count <= 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Count must be greater than zero"})
	}

	seals, err := sc.sealService.GenerateAndCreateSealsFromNumber(request.SealNumber, request.Count, userID, request.PeaCode, request.Status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"message": "Seals created successfully", "seals": seals})
}

// -------------------------------------------------------------------
// ส่วน incrementSealNumber เดิม (ถ้าจะยังใช้ในบางที่)
// -------------------------------------------------------------------
func incrementSealNumber(current string) string {
	if len(current) < 5 {
		log.Println("❌ Error: Invalid seal number format")
		return current
	}

	re := regexp.MustCompile(`^([A-Za-z]*)(\d+)$`)
	matches := re.FindStringSubmatch(current)
	if len(matches) != 3 {
		log.Println("❌ Error: Invalid seal number format")
		return current
	}

	prefix := matches[1]
	numberPart := matches[2]

	num, err := strconv.ParseInt(numberPart, 10, 64)
	if err != nil {
		log.Println("❌ Error parsing seal number:", err)
		return current
	}
	num++
	return fmt.Sprintf("%s%0*d", prefix, len(numberPart), num)
}

// -------------------------------------------------------------------
// 12) CheckSealExistsHandler
// GET /api/seals/check/:seal_number
// -------------------------------------------------------------------
func (sc *SealController) CheckSealExistsHandler(c *fiber.Ctx) error {
	sealNumber := c.Params("seal_number")
	log.Println("🔍 Checking Seal:", sealNumber)

	seal, err := sc.sealService.GetSealByNumber(sealNumber)
	if err == nil && seal != nil && seal.ID != 0 {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"message": "Seal number already exists", "seal_number": sealNumber})
	}
	
	// If seal does not exist (not found)
	return c.JSON(fiber.Map{"message": "Seal number is available", "seal_number": sealNumber})
}

// -------------------------------------------------------------------
// 13) InstallSealHandler (ช่างติดตั้ง Seal เฉพาะที่ assigned)
// PUT /api/seals/:seal_number/install
// Body: { "serial_number": "..." }
// -------------------------------------------------------------------
func (sc *SealController) InstallSealHandler(c *fiber.Ctx) error {
	techID, ok := c.Locals("tech_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	sealNumber := c.Params("seal_number")
	var req struct {
		SerialNumber string `json:"serial_number,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if err := sc.sealService.UseSealWithSerial(sealNumber, techID, req.SerialNumber); err != nil {
		log.Println("❌ Install Seal Error:", err)
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"message":       "ติดตั้ง Seal เรียบร้อย",
		"serial_number": req.SerialNumber,
	})
}

// -------------------------------------------------------------------
// 14) GetSealLogsHandler (ดู Log ซีลจาก SealNumber)
// GET /api/seals/:seal_number/logs
// -------------------------------------------------------------------
func (sc *SealController) GetSealLogsHandler(c *fiber.Ctx) error {
	sealNumber := c.Params("seal_number")
	logs, err := sc.sealService.GetSealLogs(sealNumber)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to fetch logs"})
	}
	return c.JSON(logs)
}

// -------------------------------------------------------------------
// 15) AssignSealToTechnicianHandler
// PUT /api/seals/:seal_number/assign
// Body: { "technician_id": 123, "remark": "..."}
//
// (Assign ซีลให้ Technician ID ตรง ๆ)
// -------------------------------------------------------------------
func (sc *SealController) AssignSealToTechnicianHandler(c *fiber.Ctx) error {
	assignedBy, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var request struct {
		TechnicianID uint   `json:"technician_id"`
		Remark       string `json:"remark"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	sealNumber := c.Params("seal_number")
	err := sc.sealService.AssignSealToTechnician(sealNumber, request.TechnicianID, assignedBy, request.Remark)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":     fmt.Sprintf("ซีล %s ถูก Assign ให้ช่าง ID %d เรียบร้อยแล้ว", sealNumber, request.TechnicianID),
		"seal_number": sealNumber,
		"technician":  request.TechnicianID,
	})
}

// -------------------------------------------------------------------
// 16) IssueMultipleSealsHandler (เบิกหลายซีลทีเดียว จาก base number)
// POST /api/seals/issue-multiple
// Body:
//
//	{
//	  "base_seal_number": "F11620000051015",
//	  "last_numbers": [16, 17, 18],
//	  "issued_to": 3,
//	  "employee_code": "12345",
//	  "remark": "จ่ายให้พนักงานตามคำสั่ง"
//	}
//
// -------------------------------------------------------------------
func (sc *SealController) IssueMultipleSealsHandler(c *fiber.Ctx) error {
	var req struct {
		BaseSealNumber string `json:"base_seal_number"`
		LastNumbers    []int  `json:"last_numbers"`
		IssuedTo       uint   `json:"issued_to"`
		EmployeeCode   string `json:"employee_code"`
		Remark         string `json:"remark"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid JSON input"})
	}
	if req.BaseSealNumber == "" || len(req.LastNumbers) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Must provide base_seal_number and last_numbers"})
	}

	re := regexp.MustCompile(`^([A-Za-z]*)(\d+)$`)
	matches := re.FindStringSubmatch(req.BaseSealNumber)
	if len(matches) != 3 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid seal format in base_seal_number"})
	}
	prefix := matches[1]
	baseNumStr := matches[2]

	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		userID = 0
	}

	issuedSeals, err := sc.sealService.IssueMultipleSeals(prefix, baseNumStr, req.LastNumbers, req.IssuedTo, req.EmployeeCode, req.Remark, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{
		"message": "Issued multiple seals successfully",
		"seals":   issuedSeals,
	})
}

// -------------------------------------------------------------------
// 17) CheckMultipleSealsHandler (query param) / CheckSealsHandler (body)
// -------------------------------------------------------------------
func (sc *SealController) CheckMultipleSealsHandler(c *fiber.Ctx) error {
	rawParam := c.Query("seal_numbers", "")
	if rawParam == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No seal_numbers provided"})
	}
	parts := strings.Split(rawParam, ",")
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
	}
	unavailable, err := sc.sealService.CheckMultipleSeals(parts)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}
	return c.JSON(fiber.Map{"unavailable": unavailable})
}

func (sc *SealController) CheckSealsHandler(c *fiber.Ctx) error {
	var request struct {
		SealNumbers []string `json:"seal_numbers"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request format"})
	}
	if len(request.SealNumbers) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "seal_numbers is required"})
	}

	results, err := sc.sealService.CheckSealAvailability(request.SealNumbers)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Database query failed"})
	}

	// Return the results directly
	return c.JSON(fiber.Map{
		"results": results,
	})
}

// -------------------------------------------------------------------
// 18) AssignSealsByTechCodeHandler
// POST /api/seals/assign-by-techcode
// Body: { "technician_code": "46735201FNRM-24", "seal_numbers": ["F1001","F1002"], "remark":"..." }
// -------------------------------------------------------------------
func (sc *SealController) AssignSealsByTechCodeHandler(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	var req struct {
		TechnicianCode string   `json:"technician_code"`
		SealNumbers    []string `json:"seal_numbers"`
		Remark         string   `json:"remark,omitempty"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}
	if req.TechnicianCode == "" || len(req.SealNumbers) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "technician_code and seal_numbers are required",
		})
	}

	// เรียก SealService.AssignSealsByTechCode
	if err := sc.sealService.AssignSealsByTechCode(req.TechnicianCode, req.SealNumbers, req.Remark, userID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":         "Assigned seals successfully",
		"technician_code": req.TechnicianCode,
		"seals_assigned":  req.SealNumbers,
	})
}
func (sc *SealController) CancelSealHandler(c *fiber.Ctx) error {
	userID, ok := c.Locals("user_id").(uint)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "Unauthorized"})
	}

	sealNumber := c.Params("seal_number")
	err := sc.sealService.CancelSeal(sealNumber, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message": fmt.Sprintf("ซีล %s ถูกคืนสำเร็จ และกลับเป็นสถานะ 'พร้อมใช้งาน'", sealNumber),
	})
}

// -------------------------------------------------------------------
// 19) ScanAndUseSealHandler
// POST /api/seals/scan-use
// Body: { "seal_number": "..." }
// -------------------------------------------------------------------
func (sc *SealController) ScanAndUseSealHandler(c *fiber.Ctx) error {
	sealNumber := c.FormValue("seal_number")
	
	if sealNumber == "" {
		// Fallback to JSON body just in case
		var request struct {
			SealNumber string `json:"seal_number"`
		}
		if err := c.BodyParser(&request); err == nil && request.SealNumber != "" {
			sealNumber = request.SealNumber
		}
	}

	if sealNumber == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Seal number is required"})
	}

	var imagePath string
	file, err := c.FormFile("image")
	if err != nil {
		log.Println("⚠️ No image or err receiving image:", err)
	} else {
		// อัปโหลดไฟล์สำเร็จ ดำเนินการบันทึก
		log.Println("📷 Received image:", file.Filename, "size:", file.Size)
		uploadDir := "./uploads"
		if _, err := os.Stat(uploadDir); os.IsNotExist(err) {
			os.Mkdir(uploadDir, 0755)
		}
		
		fileName := fmt.Sprintf("seal_%s_%s", sealNumber, file.Filename)
		savePath := filepath.Join(uploadDir, fileName)
		
		if err := c.SaveFile(file, savePath); err != nil {
			log.Println("❌ Failed to save image to disk:", err)
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to save image"})
		}
		log.Println("✅ Image saved to", savePath)
		imagePath = savePath
	}

	// For now, allow unauthenticated usage (userID = 0) as per mobile app state
	// Or use context if available
	var userID uint = 0
	if id, ok := c.Locals("user_id").(uint); ok {
		userID = id
	}

	message, err := sc.sealService.ScanAndUseSeal(sealNumber, userID, imagePath)
	if err != nil {
		// Differentiate errors? simple for now
		if err.Error() == "ซีลนี้ถูกใช้งานไปแล้ว" {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":     "บันทึกการใช้งานสำเร็จ",
		"seal_number": sealNumber,
		"image_path":  imagePath,
		"logs":        message,
	})
}

// -------------------------------------------------------------------
// 20) UpdateSealStatusAdminHandler
// PUT /api/seals/:seal_number/status
// Body: { "status": "ชำรุด" }
// -------------------------------------------------------------------
func (sc *SealController) UpdateSealStatusAdminHandler(c *fiber.Ctx) error {
	var request struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&request); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Invalid request body"})
	}

	if request.Status == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "Status is required"})
	}

	sealNumber := c.Params("seal_number")

	var userID uint = 0
	if id, ok := c.Locals("user_id").(uint); ok {
		userID = id
	}

	err := sc.sealService.UpdateSealStatusAdmin(sealNumber, request.Status, userID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	return c.JSON(fiber.Map{
		"message":     fmt.Sprintf("เปลี่ยนสถานะซีล %s เป็น '%s' สำเร็จ", sealNumber, request.Status),
		"seal_number": sealNumber,
		"status":      request.Status,
	})
}
