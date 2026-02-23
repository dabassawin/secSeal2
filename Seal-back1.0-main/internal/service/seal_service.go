package service

import (
	"errors"
	"fmt"
	"log"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/domain/repository"
	"github.com/Kev2406/PEA/internal/dto"
	"gorm.io/gorm"
)

// SealService จัดการทุกอย่างฝั่ง Seal (รวมถึง AssignSealsToTechnicianCode ด้วย)
type SealService struct {
	repo            *repository.SealRepository
	transactionRepo *repository.TransactionRepository
	logRepo         *repository.LogRepository
	db              *gorm.DB

	// เพิ่มฟิลด์ technicianRepo เพื่อเรียก FindByTechCode
	technicianRepo *repository.TechnicianRepository
}

// NewSealService รับ repository ต่าง ๆ จากภายนอก
func NewSealService(
	repo *repository.SealRepository,
	transactionRepo *repository.TransactionRepository,
	logRepo *repository.LogRepository,
	db *gorm.DB,
	technicianRepo *repository.TechnicianRepository, // <<-- เพิ่มพารามิเตอร์นี้
) *SealService {
	return &SealService{
		repo:            repo,
		transactionRepo: transactionRepo,
		logRepo:         logRepo,
		db:              db,
		technicianRepo:  technicianRepo, // <<-- เซตเข้าฟิลด์
	}
}

// -------------------------------------------------------------------
//                      Existing Functionality
// -------------------------------------------------------------------

func (s *SealService) GetLatestSealNumber() (string, error) {
	latestSeal, err := s.repo.GetLatestSeal()
	if err != nil {
		return "", err
	}
	if latestSeal == nil {
		return "F000000000001", nil
	}
	return latestSeal.SealNumber, nil
}

// GetAllSeals returns seals, optionally filtered by pea_code
func (s *SealService) GetAllSeals(peaCode string) ([]model.Seal, error) {
	var seals []model.Seal
	query := s.db
	if peaCode != "" {
		query = query.Where("pea_code = ?", peaCode)
	}
	if err := query.Find(&seals).Error; err != nil {
		return nil, err
	}
	return seals, nil
}

func (s *SealService) GetSealsByStatus(status string) ([]model.Seal, error) {
	log.Println("🎬 กำลังดึงซีลสถานะ:", status)
	var seals []model.Seal
	if err := s.db.Where("status = ?", status).Find(&seals).Error; err != nil {
		return nil, err
	}
	log.Println("🔍 เจอซีลจำนวน:", len(seals))
	return seals, nil
}

func (s *SealService) GetSealByIDAndStatus(sealID uint, status string) (*model.Seal, error) {
	log.Println("🔍 กำลังดึงซีลจาก ID:", sealID, " และสถานะ:", status)

	var seal model.Seal
	if err := s.db.Where("id = ? AND status = ?", sealID, status).First(&seal).Error; err != nil {
		log.Println("❌ ไม่พบซีล ID:", sealID, "ที่มีสถานะ:", status)
		return nil, err
	}

	log.Println("✅ เจอซีล ID:", sealID, " สถานะ:", status)
	return &seal, nil
}

func (s *SealService) GetSealByNumber(sealNumber string) (*model.Seal, error) {
	return s.repo.FindByNumber(sealNumber)
}

func (s *SealService) CreateSeal(seal *model.Seal, userID uint) error {
	exists, err := s.repo.CheckSealExists(seal.SealNumber)
	if err != nil {
		return err
	}
	if exists {
		return errors.New("Security seal ซ้ำกรุณากรอกเลขใหม่ด้วยค่ะ")
	}

	now := time.Now()
	seal.Status = "พร้อมใช้งาน"
	seal.CreatedAt = now
	seal.UpdatedAt = now

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Create(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("สร้างซีล %s", seal.SealNumber),
		}
		return s.logRepo.Create(&logEntry)
	})
}

func (s *SealService) GenerateAndCreateSeals(count int, userID uint) ([]model.Seal, error) {
	latestSealNumber, err := s.GetLatestSealNumber()
	if err != nil {
		return nil, err
	}
	sealNumbers, err := GenerateNextSealNumbers(latestSealNumber, count)
	if err != nil {
		return nil, err
	}
	now := time.Now()
	seals := make([]model.Seal, count)
	for i, sn := range sealNumbers {
		seals[i] = model.Seal{
			SealNumber: sn,
			Status:     "พร้อมใช้งาน",
			CreatedAt:  now,
			UpdatedAt:  now,
		}
	}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateMultiple(seals); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("สร้างซิลใหม่ %d อัน", count),
		}
		return s.logRepo.Create(&logEntry)
	})
	if err != nil {
		return nil, err
	}
	return seals, nil
}

func (s *SealService) GenerateAndCreateSealsFromNumber(startingSealNumber string, count int, userID uint, peaCode string, status string) ([]model.Seal, error) {
	sealNumbers, err := GenerateNextSealNumbers(startingSealNumber, count)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	var newSeals []model.Seal

	if status == "" {
		status = "พร้อมใช้งาน"
	}

	for _, sn := range sealNumbers {
		exists, err := s.repo.CheckSealExists(sn)
		if err != nil {
			return nil, err
		}
		if exists {
			return nil, fmt.Errorf("Security seal ซ้ำกรุณากรอกเลขใหม่ด้วยค่ะ: %s", sn)
		}

		newSeals = append(newSeals, model.Seal{
			SealNumber: sn,
			PeaCode:    peaCode, // ✅ ใส่ PeaCode
			Status:     status,
			CreatedAt:  now,
			UpdatedAt:  now,
		})
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.CreateMultiple(newSeals); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("สร้างซีลใหม่ %d อัน จากเลขเริ่ม %s (PEA: %s, สถานะ: %s)", count, startingSealNumber, peaCode, status),
		}
		return s.logRepo.Create(&logEntry)
	})
	if err != nil {
		return nil, err
	}
	return newSeals, nil
}

// -------------------------------------------------------------------
// Legacy Mechanics: IssueSeal, UseSeal, ReturnSeal
// -------------------------------------------------------------------
func (s *SealService) IssueSeal(sealNumber string, userID uint) error {
	return s.UpdateSealStatus(sealNumber, "จ่าย", userID)
}
func (s *SealService) UseSeal(sealNumber string, userID uint) error {
	return s.UpdateSealStatus(sealNumber, "ติดตั้งแล้ว", userID)
}
func (s *SealService) ReturnSeal(sealNumber string, userID uint) error {
	return s.UpdateSealStatus(sealNumber, "ใช้งานแล้ว", userID)
}

func (s *SealService) UpdateSealStatus(sealNumber string, newStatus string, userID uint) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซิลในระบบ")
	}
	now := time.Now()
	logAction := ""
	switch newStatus {
	case "จ่าย":
		if seal.Status != "พร้อมใช้งาน" {
			return errors.New("ซิลต้องอยู่ในสถานะ 'พร้อมใช้งาน' เท่านั้นจึงจะจ่ายได้")
		}
		seal.Status = "จ่าย"
		seal.IssuedBy = &userID
		seal.IssuedAt = &now
		logAction = fmt.Sprintf("จ่ายซิล %s", sealNumber)
	case "ติดตั้งแล้ว":
		if seal.Status != "จ่าย" {
			return errors.New("ซิลต้องอยู่ในสถานะ 'จ่าย' เท่านั้นจึงจะติดตั้งได้")
		}
		seal.Status = "ติดตั้งแล้ว"
		seal.UsedBy = &userID
		seal.UsedAt = &now
		logAction = fmt.Sprintf("ติดตั้งซิล %s", sealNumber)
	case "ใช้งานแล้ว":
		if seal.Status != "ติดตั้งแล้ว" {
			return errors.New("ซิลต้องอยู่ในสถานะ 'ติดตั้งแล้ว' เท่านั้นจึงจะใช้งานได้")
		}
		seal.Status = "ใช้งานแล้ว"
		seal.ReturnedBy = &userID
		seal.ReturnedAt = &now
		logAction = fmt.Sprintf("ซิล %s ถูกตั้งค่าว่าใช้งานแล้ว", sealNumber)
	default:
		return errors.New("สถานะไม่ถูกต้อง")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: logAction,
		}
		return s.logRepo.Create(&logEntry)
	})
}

// -------------------------------------------------------------------
// New Methods: Support SerialNumber & Remarks
// -------------------------------------------------------------------
func (s *SealService) UseSealWithSerial(sealNumber string, userID uint, deviceSerial string) error {
	return s.UpdateSealStatusWithExtra(sealNumber, "ติดตั้งแล้ว", userID, deviceSerial, "")
}

func (s *SealService) ReturnSealWithRemarks(sealNumber string, userID uint, remarks string) error {
	return s.UpdateSealStatusWithExtra(sealNumber, "ใช้งานแล้ว", userID, "", remarks)
}

func (s *SealService) IssueSealWithDetails(sealNumber string, issuedTo uint, employeeCode string, remark string) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซิลในระบบ")
	}
	if seal.Status != "พร้อมใช้งาน" {
		return errors.New("ซิลต้องอยู่ในสถานะ 'พร้อมใช้งาน' เท่านั้นจึงจะจ่ายได้")
	}
	now := time.Now()
	seal.Status = "จ่าย"
	seal.IssuedTo = &issuedTo
	seal.AssignedToTechnician = &issuedTo
	seal.IssuedAt = &now
	seal.EmployeeCode = employeeCode
	seal.IssueRemark = remark

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: issuedTo,
			Action: fmt.Sprintf("จ่ายซิล %s ให้พนักงาน %d (รหัส: %s) - หมายเหตุ: %s", sealNumber, issuedTo, employeeCode, remark),
		}
		return s.logRepo.Create(&logEntry)
	})
}

func (s *SealService) UpdateSealStatusWithExtra(sealNumber string, newStatus string, userID uint, deviceSerial string, remarks string) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซิลในระบบ")
	}
	now := time.Now()
	logAction := ""
	switch newStatus {
	case "ติดตั้งแล้ว":
		if seal.Status != "จ่าย" {
			return errors.New("ซิลต้องอยู่ในสถานะ 'จ่าย' เท่านั้นจึงจะติดตั้งได้")
		}
		seal.Status = "ติดตั้งแล้ว"
		seal.UsedBy = &userID
		seal.UsedAt = &now
		seal.InstalledSerial = deviceSerial
		logAction = fmt.Sprintf("ติดตั้งซิล %s (Serial: %s)", sealNumber, deviceSerial)
	case "ใช้งานแล้ว":
		if seal.Status != "ติดตั้งแล้ว" {
			return errors.New("ซิลต้องอยู่ในสถานะ 'ติดตั้งแล้ว' เท่านั้นจึงจะใช้งานได้")
		}
		seal.Status = "ใช้งานแล้ว"
		seal.ReturnedBy = &userID
		seal.ReturnedAt = &now
		seal.ReturnRemarks = remarks
		logAction = fmt.Sprintf("ซิล %s ถูกตั้งค่าว่าใช้งานแล้ว (หมายเหตุ: %s)", sealNumber, remarks)
	default:
		return errors.New("สถานะไม่ถูกต้อง (version Extra)")
	}
	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: logAction,
		}
		return s.logRepo.Create(&logEntry)
	})
}

// -------------------------------------------------------------------
// GenerateNextSealNumbers
// -------------------------------------------------------------------
func GenerateNextSealNumbers(latest string, count int) ([]string, error) {
	if latest == "" {
		latest = "F000000000001"
	}
	re := regexp.MustCompile(`^([A-Za-z]*)(\d+)$`)
	matches := re.FindStringSubmatch(latest)
	if len(matches) != 3 {
		return nil, errors.New("รูปแบบเลขซิลไม่ถูกต้อง")
	}
	prefix := matches[1]
	numberPart := matches[2]
	lastInt, err := strconv.ParseInt(numberPart, 10, 64)
	if err != nil {
		return nil, errors.New("เลขซิลไม่ถูกต้อง")
	}
	sealNumbers := make([]string, count)
	numberLength := len(numberPart)
	for i := 0; i < count; i++ {
		newNum := lastInt + int64(i)
		sealNumbers[i] = fmt.Sprintf("%s%0*d", prefix, numberLength, newNum)
	}
	return sealNumbers, nil
}

// -------------------------------------------------------------------
// GetSealReport (4 statuses)
// -------------------------------------------------------------------
func (s *SealService) GetSealReport(peaCode string) (map[string]interface{}, error) {
	var total, ready, paid, installed, used int64

	query := s.db.Model(&model.Seal{})
	if peaCode != "" {
		query = query.Where("pea_code = ?", peaCode)
	}

	// Clone query for each count to avoid interference
	if err := query.Session(&gorm.Session{}).Where("status = ?", "พร้อมใช้งาน").Count(&ready).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", "จ่าย").Count(&paid).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", "ติดตั้งแล้ว").Count(&installed).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", "ใช้งานแล้ว").Count(&used).Error; err != nil {
		return nil, err
	}
	total = ready + paid + installed + used
	report := map[string]interface{}{
		"total_seals": total,
		"พร้อมใช้งาน": ready,
		"จ่าย":        paid,
		"ติดตั้งแล้ว": installed,
		"ใช้งานแล้ว":  used,
	}
	return report, nil
}

func (s *SealService) GetSealsByTechnician(techID uint) ([]model.Seal, error) {
	var seals []model.Seal
	if err := s.db.Where("assigned_to_technician = ?", techID).Find(&seals).Error; err != nil {
		return nil, err
	}
	return seals, nil
}

// ✅ ฟังก์ชันตรวจสอบว่าหมายเลข Seal มีอยู่หรือไม่
func (s *SealService) CheckSealBeforeGenerate(sealPrefix string, lastNumbers []int) (bool, error) {
	missingSeals := []int{}

	for _, num := range lastNumbers {
		sealNumber := fmt.Sprintf("%s%02d", sealPrefix, num)
		exists, err := s.repo.CheckSealExists(sealNumber)
		if err != nil {
			return false, err
		}
		if !exists {
			missingSeals = append(missingSeals, num)
		}
	}
	if len(missingSeals) > 0 {
		return false, fmt.Errorf("หมายเลข Seal ไม่พบในระบบ: %v", missingSeals)
	}
	return true, nil
}

func (s *SealService) AssignSealToTechnician(sealNumber string, techID uint, issuedBy uint, remark string) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return err
	}

	if seal.Status != "พร้อมใช้งาน" && seal.Status != "จ่าย" {
		return errors.New("ซิลต้องอยู่ในสถานะ 'พร้อมใช้งาน' หรือ 'จ่าย' เท่านั้นจึงจะ Assign ได้")
	}

	now := time.Now()

	if seal.Status == "พร้อมใช้งาน" {
		seal.Status = "จ่าย"
		seal.IssuedAt = &now
		seal.IssuedBy = &issuedBy
	}

	seal.AssignedToTechnician = &techID
	seal.IssueRemark = remark

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(seal).Error; err != nil {
			return err
		}
		log := model.Log{
			UserID:    issuedBy,
			Action:    fmt.Sprintf("Assigned seal %s to technician ID %d", sealNumber, techID),
			Timestamp: now,
		}
		if err := tx.Create(&log).Error; err != nil {
			return err
		}
		return nil
	})
}

func (s *SealService) InstallSeal(sealNumber string, techID uint, serialNumber string) error {
	// ค้นหาซิลจากฐานข้อมูล
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซิลในระบบ")
	}

	// ตรวจสอบว่าซิลถูกมอบหมายให้ช่างคนนี้หรือไม่
	if seal.AssignedToTechnician == nil || *seal.AssignedToTechnician != techID {
		return errors.New("คุณไม่มีสิทธิ์ติดตั้งซีลนี้")
	}

	// ✅ เพิ่ม Debug Log และ Trim ช่องว่างใน status
	log.Printf("🛠 [InstallSeal] sealNumber=%s, DB status='%s'", sealNumber, seal.Status)
	actualStatus := strings.TrimSpace(seal.Status)
	if actualStatus != "จ่าย" {
		return errors.New("ซิลต้องอยู่ในสถานะ 'จ่าย' เท่านั้นจึงจะติดตั้งได้")
	}

	now := time.Now()
	seal.Status = "ติดตั้งแล้ว"
	seal.UsedBy = &techID
	seal.UsedAt = &now
	seal.InstalledSerial = serialNumber

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: techID,
			Action: fmt.Sprintf("ติดตั้งซิล %s (Serial: %s)", sealNumber, serialNumber),
		}
		return s.logRepo.Create(&logEntry)
	})
}

func (s *SealService) GetSealLogs(sealNumber string) ([]model.Log, error) {
	var logs []model.Log
	err := s.db.Where("action LIKE ?", "%"+sealNumber+"%").Order("created_at DESC").Find(&logs).Error
	if err != nil {
		return nil, err
	}
	return logs, nil
}

func (s *SealService) IssueMultipleSeals(
	prefix string,
	baseNumStr string,
	lastNumbers []int,
	issuedTo uint,
	employeeCode string,
	remark string,
) ([]model.Seal, error) {

	digitCount := len(baseNumStr)
	var sealsToIssue []model.Seal

	for _, num := range lastNumbers {
		fullSealNumber := fmt.Sprintf("%s%0*d", prefix, digitCount, num)

		seal, err := s.repo.FindByNumber(fullSealNumber)
		if err != nil {
			return nil, fmt.Errorf("ไม่พบซีลในระบบ: %s", fullSealNumber)
		}
		if seal.Status != "พร้อมใช้งาน" {
			return nil, fmt.Errorf("ซีล %s ไม่ได้อยู่ในสถานะ 'พร้อมใช้งาน'", fullSealNumber)
		}
		sealsToIssue = append(sealsToIssue, *seal)
	}

	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for i := range sealsToIssue {
			sealsToIssue[i].Status = "จ่าย"
			sealsToIssue[i].IssuedTo = &issuedTo
			sealsToIssue[i].AssignedToTechnician = &issuedTo
			sealsToIssue[i].IssuedAt = &now
			sealsToIssue[i].EmployeeCode = employeeCode
			sealsToIssue[i].IssueRemark = remark

			if err := s.repo.Update(&sealsToIssue[i]); err != nil {
				return err
			}

			logEntry := model.Log{
				UserID: issuedTo,
				Action: fmt.Sprintf(
					"จ่ายซิล %s ให้พนักงาน %d (รหัส: %s) - หมายเหตุ: %s",
					sealsToIssue[i].SealNumber,
					issuedTo,
					employeeCode,
					remark,
				),
			}
			if err := s.logRepo.Create(&logEntry); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return sealsToIssue, nil
}

func (s *SealService) CheckMultipleSeals(sealNumbers []string) ([]string, error) {
	var unavailable []string
	for _, sn := range sealNumbers {
		exists, err := s.repo.CheckSealExists(sn)
		if err != nil {
			return nil, err
		}
		if !exists {
			unavailable = append(unavailable, sn)
		}
	}
	return unavailable, nil
}

func (s *SealService) CheckSealAvailability(sealNumbers []string) ([]dto.SealCheckResult, error) {
	var results []dto.SealCheckResult

	// 1. Find all seals that exist in the database
	var existingSeals []model.Seal
	if err := s.db.Where("seal_number IN ?", sealNumbers).Find(&existingSeals).Error; err != nil {
		return nil, err
	}

	// 2. Create a map for quick lookup
	existingSealMap := make(map[string]model.Seal)
	for _, seal := range existingSeals {
		existingSealMap[seal.SealNumber] = seal
	}

	// 3. Iterate through requested seal numbers and build results
	for _, sn := range sealNumbers {
		seal, exists := existingSealMap[sn]

		if !exists {
			results = append(results, dto.SealCheckResult{
				SealNumber:  sn,
				IsAvailable: false,
				Status:      "Not Found",
				Reason:      "ไม่พบในระบบ",
			})
			continue
		}

		if seal.Status == "พร้อมใช้งาน" {
			results = append(results, dto.SealCheckResult{
				SealNumber:  sn,
				IsAvailable: true,
				Status:      seal.Status,
				Reason:      "",
			})
		} else {
			results = append(results, dto.SealCheckResult{
				SealNumber:  sn,
				IsAvailable: false,
				Status:      seal.Status,
				Reason:      fmt.Sprintf("สถานะ: %s", seal.Status),
			})
		}
	}
	return results, nil
}

func (s *SealService) AssignSealsByTechCode(techCode string, sealNumbers []string, remark string) error {
	// 1) หา Technician
	technician, err := s.technicianRepo.FindByTechCode(techCode)
	if err != nil {
		return fmt.Errorf("ไม่พบช่างที่มีรหัส %s", techCode)
	}

	now := time.Now()

	// 2) วนลูปซีล
	for _, sn := range sealNumbers {
		seal, err := s.repo.FindByNumber(sn)
		if err != nil {
			return fmt.Errorf("ซีล %s ไม่พบในระบบ", sn)
		}
		// ตรวจสอบสถานะ
		if seal.Status != "พร้อมใช้งาน" && seal.Status != "จ่าย" {
			return fmt.Errorf("ซีล %s ไม่ได้อยู่ในสถานะที่อนุญาตให้ assign", sn)
		}
		// ถ้าเป็น “พร้อมใช้งาน” -> เปลี่ยนเป็น “จ่าย”
		if seal.Status == "พร้อมใช้งาน" {
			seal.Status = "จ่าย"
			seal.IssuedAt = &now
		}
		// ใส่ technician ลงในฟิลด์ AssignedToTechnician
		seal.AssignedToTechnician = &technician.ID
		seal.IssueRemark = remark

		// Update DB
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		// log
		logEntry := model.Log{
			UserID: technician.ID,
			Action: fmt.Sprintf("Assigned seal %s to technician_code=%s", sn, techCode),
		}
		if err := s.logRepo.Create(&logEntry); err != nil {
			return err
		}
	}
	return nil
}
func (s *SealService) CancelSeal(sealNumber string, userID uint) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซิลในระบบ")
	}

	// Allow cancelling from 'Used' or 'Installed' to revert to 'Available'
	// if seal.Status == "ติดตั้งแล้ว" || seal.Status == "ใช้งานแล้ว" {
	// 	return errors.New("ซีลถูกใช้งานไปแล้ว ไม่สามารถคืนได้")
	// }

	now := time.Now()
	seal.Status = "พร้อมใช้งาน"
	seal.IssuedBy = nil
	seal.IssuedTo = nil
	seal.IssuedAt = nil
	seal.ReturnedBy = &userID
	seal.ReturnedAt = &now

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("คืนซีล %s กลับเป็นสถานะ 'พร้อมใช้งาน'", sealNumber),
		}
		return s.logRepo.Create(&logEntry)
	})
}

// GetAllAssignedSeals ดึงซีลทั้งหมดที่จ่ายให้ช่าง
func (s *SealService) GetAllAssignedSeals() ([]model.Seal, error) {
	return s.repo.GetAllAssignedSeals()
}

// -------------------------------------------------------------------
// ScanAndUseSeal (Scan & Mark Used Immediately)
// -------------------------------------------------------------------
func (s *SealService) ScanAndUseSeal(sealNumber string, userID uint) (string, error) {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return "", errors.New("ไม่พบซิลในระบบ")
	}

	// 1. Check if already used
	if seal.Status == "ใช้งานแล้ว" {
		return "", errors.New("ซีลนี้ถูกใช้งานไปแล้ว")
	}

	// 2. Allow ANY status -> Used (as per user request)
	// if seal.Status != "พร้อมใช้งาน" && seal.Status != "จ่าย" && seal.Status != "ติดตั้งแล้ว" {
	// 	return "", fmt.Errorf("สถานะซีลปัจจุบัน (%s) ไม่สามารถเปลี่ยนเป็น 'ใช้งานแล้ว' ได้ทันที", seal.Status)
	// }

	now := time.Now()
	seal.Status = "ใช้งานแล้ว"
	seal.UsedAt = &now
	// If we want to track who scanned it, we use userID (even if 0 for public Scan)
	if userID != 0 {
		seal.UsedBy = &userID
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("สแกนและใช้งานซีล %s ทันที", sealNumber),
		}
		return s.logRepo.Create(&logEntry)
	})

	if err != nil {
		return "", err
	}
	return "ใช้งานสำเร็จ", nil
}

// -------------------------------------------------------------------
// UpdateSealStatusAdmin (Arbitrary status change from frontend)
// -------------------------------------------------------------------
func (s *SealService) UpdateSealStatusAdmin(sealNumber string, status string, userID uint) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซีลในระบบ")
	}

	oldStatus := seal.Status
	seal.Status = status
	now := time.Now()
	seal.UpdatedAt = now

	return s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("แอดมินเปลี่ยนสถานะซีล %s จาก '%s' เป็น '%s'", sealNumber, oldStatus, status),
		}
		return s.logRepo.Create(&logEntry)
	})
}
