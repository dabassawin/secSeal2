package service

import (
	"github.com/Kev2406/PEA/internal/domain/constants"

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

	"github.com/Kev2406/PEA/internal/realtime"
	"gorm.io/gorm"
)

// notifyTechnicianAsync is a helper to fire off push notifications without blocking responses
func (s *SealService) notifyTechnicianAsync(techID uint, title, body string) {
	/*
		go func() {
			tech, err := s.technicianRepo.FindByID(techID)
			if err == nil && tech.ExpoPushToken != "" {
				utils.SendExpoPushNotification(tech.ExpoPushToken, title, body, nil)
			}
		}()
	*/
}

// SealService จัดการทุกอย่างฝั่ง Seal (รวมถึง AssignSealsToTechnicianCode ด้วย)
type SealService struct {
	repo            *repository.SealRepository
	transactionRepo *repository.TransactionRepository
	logRepo         *repository.LogRepository
	db              *gorm.DB

	// เพิ่มฟิลด์ technicianRepo เพื่อเรียก FindByTechCode
	technicianRepo *repository.TechnicianRepository
	hub            *realtime.Hub
}

// NewSealService รับ repository ต่าง ๆ จากภายนอก
func NewSealService(
	repo *repository.SealRepository,
	transactionRepo *repository.TransactionRepository,
	logRepo *repository.LogRepository,
	db *gorm.DB,
	technicianRepo *repository.TechnicianRepository,
	hub *realtime.Hub,
) *SealService {
	return &SealService{
		repo:            repo,
		transactionRepo: transactionRepo,
		logRepo:         logRepo,
		db:              db,
		technicianRepo:  technicianRepo,
		hub:             hub,
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
func (s *SealService) GetAllSeals(peaCode string, pendingPeaCode string) ([]model.Seal, error) {
	var seals []model.Seal
	query := s.db.Model(&model.Seal{})

	if peaCode != "" {
		query = query.Where("pea_code = ?", peaCode)
	}

	if pendingPeaCode != "" {
		// Only return seals that are actually waiting for confirmation by this company
		query = query.Where("pending_pea_code = ? AND status = ?", pendingPeaCode, "รอยืนยัน")
	}

	if err := query.Find(&seals).Error; err != nil {
		return nil, err
	}
	return seals, nil
}

// GetWaitConfirmationByPeaCode fetches seals with status WAIT_CONFIRMATION belonging to a PEA code.
// This handles the "direct transfer" flow where pending_pea_code is empty but pea_code matches.
func (s *SealService) GetWaitConfirmationByPeaCode(peaCode string) ([]model.Seal, error) {
	var seals []model.Seal
	err := s.db.Where("pea_code = ? AND status = ? AND (pending_pea_code = '' OR pending_pea_code IS NULL)", peaCode, "รอยืนยัน").Find(&seals).Error
	return seals, err
}

// GetReadyByPeaCode fetches READY seals that belong to the company's pea_code and are not assigned to any technician.
// These are confirmed seals sitting in the company's inventory.
func (s *SealService) GetReadyByPeaCode(peaCode string) ([]model.Seal, error) {
	var seals []model.Seal
	err := s.db.Where("pea_code = ? AND status = ? AND (assigned_to_technician IS NULL OR assigned_to_technician = 0)", peaCode, "พร้อมใช้งาน").Find(&seals).Error
	return seals, err
}

func (s *SealService) GetSealsByStatus(status string) ([]model.Seal, error) {
	var seals []model.Seal
	if err := s.db.Where("status = ?", status).Find(&seals).Error; err != nil {
		return nil, err
	}
	return seals, nil
}

func (s *SealService) GetSealByIDAndStatus(sealID uint, status string) (*model.Seal, error) {

	var seal model.Seal
	if err := s.db.Where("id = ? AND status = ?", sealID, status).First(&seal).Error; err != nil {
		return nil, err
	}

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
	seal.Status = string(constants.StatusReady)
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
			Status:     string(constants.StatusReady),
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

func (s *SealService) GenerateAndCreateSealsFromNumber(startingSealNumber string, count int, userID uint, peaCode string, status string, createRemarks string) ([]model.Seal, error) {
	sealNumbers, err := GenerateNextSealNumbers(startingSealNumber, count)
	if err != nil {
		return nil, err
	}

	now := time.Now()
	var newSeals []model.Seal

	if status == "" {
		status = string(constants.StatusReady)
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
			SealNumber:    sn,
			PeaCode:       peaCode,
			Status:        status,
			CreateRemarks: createRemarks,
			CreatedAt:     now,
			UpdatedAt:     now,
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
	return s.UpdateSealStatus(sealNumber, string(constants.StatusIssued), userID)
}
func (s *SealService) UseSeal(sealNumber string, userID uint) error {
	return s.UpdateSealStatus(sealNumber, string(constants.StatusInstalled), userID)
}
func (s *SealService) ReturnSeal(sealNumber string, userID uint) error {
	return s.UpdateSealStatus(sealNumber, string(constants.StatusUsed), userID)
}

func (s *SealService) UpdateSealStatus(sealNumber string, newStatus string, userID uint) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซิลในระบบ")
	}
	now := time.Now()
	logAction := ""
	switch newStatus {
	case string(constants.StatusIssued):
		if seal.Status != string(constants.StatusReady) {
			return errors.New("ซิลต้องอยู่ในสถานะ 'พร้อมใช้งาน' เท่านั้นจึงจะจ่ายได้")
		}
		seal.Status = string(constants.StatusIssued)
		seal.IssuedBy = &userID
		seal.IssuedAt = &now
		logAction = fmt.Sprintf("จ่ายซิล %s", sealNumber)
	case string(constants.StatusInstalled):
		if seal.Status != string(constants.StatusIssued) {
			return errors.New("ซิลต้องอยู่ในสถานะ 'จ่าย' เท่านั้นจึงจะติดตั้งได้")
		}
		seal.Status = string(constants.StatusInstalled)
		seal.UsedBy = &userID
		seal.UsedAt = &now
		logAction = fmt.Sprintf("ติดตั้งซิล %s", sealNumber)
	case string(constants.StatusUsed):
		if seal.Status != string(constants.StatusInstalled) {
			return errors.New("ซิลต้องอยู่ในสถานะ 'ติดตั้งแล้ว' เท่านั้นจึงจะใช้งานได้")
		}
		seal.Status = string(constants.StatusUsed)
		seal.ReturnedBy = &userID
		seal.ReturnedAt = &now
		logAction = fmt.Sprintf("ซิล %s ถูกตั้งค่าว่าใช้งานแล้ว", sealNumber)
	default:
		return errors.New("สถานะไม่ถูกต้อง")
	}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: logAction,
		}
		return s.logRepo.Create(&logEntry)
	})

	if err == nil {
		s.hub.Broadcast(seal.PeaCode, "seal_updated")
	}
	return err
}

// -------------------------------------------------------------------
// New Methods: Support SerialNumber & Remarks
// -------------------------------------------------------------------
func (s *SealService) UseSealWithSerial(sealNumber string, userID uint, deviceSerial string) error {
	return s.UpdateSealStatusWithExtra(sealNumber, string(constants.StatusInstalled), userID, deviceSerial, "")
}

func (s *SealService) ReturnSealWithRemarks(sealNumber string, userID uint, remarks string) error {
	return s.UpdateSealStatusWithExtra(sealNumber, string(constants.StatusUsed), userID, "", remarks)
}

func (s *SealService) IssueSealWithDetails(sealNumber string, issuedTo uint, employeeCode string, remark string, issuedBy uint) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซิลในระบบ")
	}
	if seal.Status != string(constants.StatusReady) {
		return errors.New("ซิลต้องอยู่ในสถานะ 'พร้อมใช้งาน' เท่านั้นจึงจะจ่ายได้")
	}
	now := time.Now()
	seal.Status = string(constants.StatusWaitConfirmation)
	seal.IssuedTo = &issuedTo
	seal.AssignedToTechnician = &issuedTo
	seal.IssuedAt = &now
	seal.IssuedBy = &issuedBy
	seal.EmployeeCode = employeeCode
	seal.IssueRemark = remark

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: issuedTo,
			Action: fmt.Sprintf("จ่ายซิล %s ให้พนักงาน %d (รหัส: %s) - หมายเหตุ: %s", sealNumber, issuedTo, employeeCode, remark),
		}
		return s.logRepo.Create(&logEntry)
	})

	if err == nil {
		s.hub.Broadcast(seal.PeaCode, "seal_updated")
	}
	return err
}

func (s *SealService) UpdateSealStatusWithExtra(sealNumber string, newStatus string, userID uint, deviceSerial string, remarks string) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซิลในระบบ")
	}
	now := time.Now()
	logAction := ""
	switch newStatus {
	case string(constants.StatusInstalled):
		if seal.Status != string(constants.StatusIssued) {
			return errors.New("ซิลต้องอยู่ในสถานะ 'จ่าย' เท่านั้นจึงจะติดตั้งได้")
		}
		seal.Status = string(constants.StatusInstalled)
		seal.UsedBy = &userID
		seal.UsedAt = &now
		seal.InstalledSerial = deviceSerial
		logAction = fmt.Sprintf("ติดตั้งซิล %s (Serial: %s)", sealNumber, deviceSerial)
	case string(constants.StatusUsed):
		if seal.Status != string(constants.StatusInstalled) {
			return errors.New("ซิลต้องอยู่ในสถานะ 'ติดตั้งแล้ว' เท่านั้นจึงจะใช้งานได้")
		}
		seal.Status = string(constants.StatusUsed)
		seal.ReturnedBy = &userID
		seal.ReturnedAt = &now
		seal.ReturnRemarks = remarks
		logAction = fmt.Sprintf("ซิล %s ถูกตั้งค่าว่าใช้งานแล้ว (หมายเหตุ: %s)", sealNumber, remarks)
	default:
		return errors.New("สถานะไม่ถูกต้อง (version Extra)")
	}
	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: logAction,
		}
		return s.logRepo.Create(&logEntry)
	})

	if err == nil {
		s.hub.Broadcast(seal.PeaCode, "seal_updated")
	}
	return err
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
	var total, ready, paid, waitConfirm, installed, used, damaged, pendingReturn, pendingTransferIn int64

	query := s.db.Model(&model.Seal{})
	if peaCode != "" {
		query = query.Where("pea_code = ?", peaCode)
	}

	// Count all seals for total_seals
	if err := query.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", string(constants.StatusReady)).Count(&ready).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", string(constants.StatusIssued)).Count(&paid).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", string(constants.StatusWaitConfirmation)).Count(&waitConfirm).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", string(constants.StatusInstalled)).Count(&installed).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", string(constants.StatusUsed)).Count(&used).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", string(constants.StatusDamaged)).Count(&damaged).Error; err != nil {
		return nil, err
	}
	if err := query.Session(&gorm.Session{}).Where("status = ?", string(constants.StatusPendingReturn)).Count(&pendingReturn).Error; err != nil {
		return nil, err
	}

	// Count incoming transfers (pending_pea_code matches current pea_code)
	if peaCode != "" {
		if err := s.db.Model(&model.Seal{}).Where("pending_pea_code = ? AND status = ?", peaCode, string(constants.StatusWaitConfirmation)).Count(&pendingTransferIn).Error; err != nil {
			return nil, err
		}
	}

	report := map[string]interface{}{
		"total_seals":                         total,
		string(constants.StatusReady):            ready,
		string(constants.StatusWaitConfirmation): waitConfirm,
		string(constants.StatusIssued):           paid,
		string(constants.StatusInstalled):        installed,
		string(constants.StatusUsed):             used,
		string(constants.StatusDamaged):          damaged,
		string(constants.StatusPendingReturn):    pendingReturn,
		"pending_transfer_in":                    pendingTransferIn,
	}
	return report, nil
}

func (s *SealService) GetSealsByTechnician(techID uint) ([]model.Seal, error) {
	var seals []model.Seal
	// ✅ รวมทั้งซีลที่ยังถือ (assigned_to_technician) 
	// ✅ ซีลที่คืนแล้ว (returned_by_technician)
	// ✅ ซีลที่ได้รับโอน (issued_to)
	// ✅ ซีลที่โอนไปแล้ว (issued_by)
	// เพื่อให้ช่างและบริษัทเห็นประวัติทั้งหมด
	if err := s.db.Where(
		"assigned_to_technician = ? OR returned_by_technician = ? OR issued_to = ? OR issued_by = ?",
		techID, techID, techID, techID,
	).Find(&seals).Error; err != nil {
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

	if seal.Status != string(constants.StatusReady) && seal.Status != string(constants.StatusIssued) {
		return errors.New("ซิลต้องอยู่ในสถานะ 'พร้อมใช้งาน' หรือ 'จ่าย' เท่านั้นจึงจะ Assign ได้")
	}

	now := time.Now()

	if seal.Status == string(constants.StatusReady) {
		seal.Status = string(constants.StatusWaitConfirmation)
		seal.IssuedAt = &now
		seal.IssuedBy = &issuedBy
	}

	seal.AssignedToTechnician = &techID
	seal.IssuedTo = &techID
	seal.IssueRemark = remark

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(seal).Error; err != nil {
			return err
		}
		log := model.Log{
			UserID:    issuedBy,
			Action:    fmt.Sprintf("จ่ายซีล %s ให้ช่าง %d", sealNumber, techID),
			Timestamp: now,
		}
		if err := tx.Create(&log).Error; err != nil {
			return err
		}
		return nil
	})

	if err == nil {
		s.hub.Broadcast(seal.PeaCode, "seal_updated")
	}
	return err
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
	if actualStatus != string(constants.StatusIssued) {
		return errors.New("ซิลต้องอยู่ในสถานะ 'จ่าย' เท่านั้นจึงจะติดตั้งได้")
	}

	now := time.Now()
	seal.Status = string(constants.StatusInstalled)
	seal.UsedBy = &techID
	seal.UsedAt = &now
	seal.InstalledSerial = serialNumber

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: techID,
			Action: fmt.Sprintf("ติดตั้งซิล %s (Serial: %s)", sealNumber, serialNumber),
		}
		return s.logRepo.Create(&logEntry)
	})

	if err == nil {
		s.hub.Broadcast(seal.PeaCode, "seal_updated")
	}
	return err
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
	issuedBy uint,
) ([]model.Seal, error) {

	digitCount := len(baseNumStr)
	var sealsToIssue []model.Seal

	for _, num := range lastNumbers {
		fullSealNumber := fmt.Sprintf("%s%0*d", prefix, digitCount, num)

		seal, err := s.repo.FindByNumber(fullSealNumber)
		if err != nil {
			return nil, fmt.Errorf("ไม่พบซีลในระบบ: %s", fullSealNumber)
		}
		if seal.Status != string(constants.StatusReady) && seal.Status != string(constants.StatusWaitConfirmation) {
			return nil, fmt.Errorf("ซีล %s ไม่ได้อยู่ในสถานะที่พร้อมสำหรับการจ่าย", fullSealNumber)
		}
		sealsToIssue = append(sealsToIssue, *seal)
	}

	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for i := range sealsToIssue {
			sealsToIssue[i].Status = string(constants.StatusWaitConfirmation)
			sealsToIssue[i].IssuedTo = &issuedTo
			sealsToIssue[i].AssignedToTechnician = &issuedTo
			sealsToIssue[i].IssuedAt = &now
			sealsToIssue[i].IssuedBy = &issuedBy
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

	if len(sealsToIssue) > 0 {
		s.hub.Broadcast(sealsToIssue[0].PeaCode, "seal_updated")
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

func (s *SealService) CheckSealAvailability(sealNumbers []string, peaCode string) ([]dto.SealCheckResult, error) {
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

		// Check pea_code ownership if peaCode filter is provided
		if peaCode != "" && seal.PeaCode != peaCode {
			results = append(results, dto.SealCheckResult{
				SealNumber:  sn,
				IsAvailable: false,
				Status:      seal.Status,
				Reason:      fmt.Sprintf("ซีลไม่ได้อยู่ในสังกัดของคุณ (สังกัดซีล: %s)", seal.PeaCode),
			})
			continue
		}

		if seal.Status == string(constants.StatusReady) {
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

func (s *SealService) AssignSealsByTechCode(techCode string, sealNumbers []string, remark string, sealRemarks map[string]string, issuedBy uint) error {
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
		if seal.Status != string(constants.StatusReady) && seal.Status != string(constants.StatusIssued) {
			return fmt.Errorf("ซีล %s ไม่ได้อยู่ในสถานะที่อนุญาตให้ assign", sn)
		}
		// ถ้าเป็น “พร้อมใช้งาน” -> เปลี่ยนเป็น “จ่าย”
		if seal.Status == string(constants.StatusReady) {
			seal.Status = string(constants.StatusWaitConfirmation)
			seal.IssuedAt = &now
			seal.IssuedBy = &issuedBy
		}

		// ✅ Clear previous return data to ensure a fresh lifecycle
		seal.ReturnedBy = nil
		seal.ReturnedByTechnician = nil
		seal.ReturnedAt = nil
		seal.ReturnRemarks = ""
		seal.Image2 = ""

		// ใส่ technician ลงในฟิลด์ AssignedToTechnician และ IssuedTo
		seal.AssignedToTechnician = &technician.ID
		seal.IssuedTo = &technician.ID

		// ใช้ per-seal remark ถ้ามี, ไม่งั้นใช้ remark ทั่วไป
		if sealRemarks != nil {
			if r, ok := sealRemarks[sn]; ok && r != "" {
				seal.IssueRemark = r
			} else {
				seal.IssueRemark = remark
			}
		} else {
			seal.IssueRemark = remark
		}

		// Update DB
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		// log
		logEntry := model.Log{
			UserID: technician.ID,
			Action: fmt.Sprintf("จ่ายซีล %s ให้ช่าง %s", sn, techCode),
		}
		if err := s.logRepo.Create(&logEntry); err != nil {
			return err
		}

		s.notifyTechnicianAsync(technician.ID, "ได้รับซีลใหม่", fmt.Sprintf("คุณได้รับมอบหมายซีลหมายเลข %s", sn))
	}

	if len(sealNumbers) > 0 {
		seal, err := s.repo.FindByNumber(sealNumbers[0])
		if err == nil {
			s.hub.Broadcast(seal.PeaCode, "seal_updated")
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
	// if seal.Status == string(constants.StatusInstalled) || seal.Status == string(constants.StatusUsed) {
	// 	return errors.New("ซีลถูกใช้งานไปแล้ว ไม่สามารถคืนได้")
	// }

	now := time.Now()
	seal.Status = string(constants.StatusReady)
	seal.IssuedBy = nil
	seal.IssuedTo = nil
	seal.IssuedAt = nil
	seal.ReturnedBy = &userID
	seal.ReturnedAt = &now

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("คืนซีล %s กลับเป็นสถานะ 'พร้อมใช้งาน'", sealNumber),
		}
		return s.logRepo.Create(&logEntry)
	})

	if err == nil {
		s.hub.Broadcast(seal.PeaCode, "seal_updated")
	}
	return err
}

// GetAllAssignedSeals ดึงซีลทั้งหมดที่จ่ายให้ช่าง
func (s *SealService) GetAllAssignedSeals() ([]model.Seal, error) {
	return s.repo.GetAllAssignedSeals()
}

// -------------------------------------------------------------------
// ScanAndUseSeal (Scan & Mark Installed)
// -------------------------------------------------------------------
func (s *SealService) ScanAndUseSeal(sealNumber string, userID uint, imagePath string, serialNumber string, meterImagePath string) (string, error) {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return "", errors.New("ไม่พบซิลในระบบ")
	}

	// 1. Check if already installed or used
	if seal.Status == string(constants.StatusInstalled) {
		return "", errors.New("ซีลนี้ถูกติดตั้งไปแล้ว")
	}
	if seal.Status == string(constants.StatusUsed) {
		return "", errors.New("ซีลนี้ถูกใช้งานไปแล้ว")
	}

	// 1.5 Check ownership
	if userID == 0 {
		return "", errors.New("ไม่พบข้อมูลผู้ใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง")
	}
	if seal.AssignedToTechnician == nil || *seal.AssignedToTechnician != userID {
		return "", errors.New("ซีลนี้ไม่ได้ถูกจ่ายให้กับคุณ ไม่สามารถใช้งานได้")
	}

	// 2. Only allow "จ่าย" status to be installed
	if seal.Status != string(constants.StatusIssued) {
		return "", fmt.Errorf("ซีลต้องอยู่ในสถานะ 'จ่าย' เท่านั้นจึงจะติดตั้งได้ (สถานะปัจจุบัน: %s)", seal.Status)
	}

	now := time.Now()
	seal.Status = string(constants.StatusInstalled)
	seal.UsedAt = &now
	// รูปซีล (image1)
	if imagePath != "" {
		seal.Image1 = imagePath
	}
	// รูปมิเตอร์ (image3)
	if meterImagePath != "" {
		seal.Image3 = meterImagePath
	}
	// เลขมิเตอร์ → installed_serial
	if serialNumber != "" {
		seal.InstalledSerial = serialNumber
	}
	if userID != 0 {
		seal.UsedBy = &userID
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("สแกนและติดตั้งซีล %s (มิเตอร์: %s)", sealNumber, serialNumber),
		}
		return s.logRepo.Create(&logEntry)
	})

	if err != nil {
		return "", err
	}

	s.hub.Broadcast(seal.PeaCode, "seal_updated")
	return "ติดตั้งสำเร็จ", nil
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

// -------------------------------------------------------------------
// GetSealStatement (Statement/Report with date range & enriched data)
// -------------------------------------------------------------------
type StatementItem struct {
	SealNumber      string  `json:"seal_number"`
	PeaCode         string  `json:"pea_code"`
	Status          string  `json:"status"`
	IssuedByName    string  `json:"issued_by_name"`
	TechName        string  `json:"tech_name"`
	IssueRemark     string  `json:"issue_remark"`
	InstalledSerial string  `json:"installed_serial"`
	IssuedAt        *string `json:"issued_at"`
	UsedAt          *string `json:"used_at"`
	ReturnedAt      *string `json:"returned_at"`
	UpdatedAt       string  `json:"updated_at"`
	CreatedAt       string  `json:"created_at"`
}

type SealStatement struct {
	Period  map[string]string `json:"period"`
	Summary map[string]int64  `json:"summary"`
	Total   int64             `json:"total"`
	Items   []StatementItem   `json:"items"`
}

func (s *SealService) GetSealStatement(peaCode string, startDate string, endDate string) (*SealStatement, error) {
	query := s.db.Model(&model.Seal{})

	if peaCode != "" {
		query = query.Where("pea_code = ?", peaCode)
	}

	// Apply date range filter on updated_at
	if startDate != "" {
		t, err := time.Parse("2006-01-02", startDate)
		if err == nil {
			query = query.Where("updated_at >= ?", t)
		}
	}
	if endDate != "" {
		t, err := time.Parse("2006-01-02", endDate)
		if err == nil {
			// end of day
			endOfDay := t.Add(24*time.Hour - time.Second)
			query = query.Where("updated_at <= ?", endOfDay)
		}
	}

	// Count by status
	statuses := []string{
		string(constants.StatusReady),
		string(constants.StatusWaitConfirmation),
		string(constants.StatusIssued),
		string(constants.StatusInstalled),
		string(constants.StatusUsed),
		string(constants.StatusDamaged),
		string(constants.StatusLost),
		string(constants.StatusPendingReturn),
	}
	summary := make(map[string]int64)
	var total int64

	for _, st := range statuses {
		var count int64
		if err := query.Session(&gorm.Session{}).Where("status = ?", st).Count(&count).Error; err != nil {
			return nil, err
		}
		summary[st] = count
		total += count
	}

	// Fetch all seals matching filter
	var seals []model.Seal
	if err := query.Session(&gorm.Session{}).Order("updated_at DESC").Find(&seals).Error; err != nil {
		return nil, err
	}

	// Collect user IDs and technician IDs for name lookup
	userIDSet := make(map[uint]bool)
	techIDSet := make(map[uint]bool)
	for _, seal := range seals {
		if seal.IssuedBy != nil {
			userIDSet[*seal.IssuedBy] = true
		}
		if seal.IssuedTo != nil {
			techIDSet[*seal.IssuedTo] = true
		}
	}

	// Batch lookup users (IssuedBy stores EmpID, not User.ID)
	userNameMap := make(map[uint]string)
	if len(userIDSet) > 0 {
		var userIDs []uint
		for id := range userIDSet {
			userIDs = append(userIDs, id)
		}
		var users []model.User
		s.db.Where("emp_id IN ?", userIDs).Find(&users)
		for _, u := range users {
			userNameMap[u.EmpID] = u.FirstName + " " + u.LastName
		}
	}

	// Batch lookup technicians
	techNameMap := make(map[uint]string)
	if len(techIDSet) > 0 {
		var techIDs []uint
		for id := range techIDSet {
			techIDs = append(techIDs, id)
		}
		var techs []model.Technician
		s.db.Where("id IN ?", techIDs).Find(&techs)
		for _, t := range techs {
			techNameMap[t.ID] = t.FirstName + " " + t.LastName
		}
	}

	// Build items
	items := make([]StatementItem, 0, len(seals))
	for _, seal := range seals {
		item := StatementItem{
			SealNumber:      seal.SealNumber,
			PeaCode:         seal.PeaCode,
			Status:          seal.Status,
			IssueRemark:     seal.IssueRemark,
			InstalledSerial: seal.InstalledSerial,
			UpdatedAt:       seal.UpdatedAt.Format("2006-01-02 15:04:05"),
			CreatedAt:       seal.CreatedAt.Format("2006-01-02 15:04:05"),
		}
		if seal.IssuedBy != nil {
			if name, ok := userNameMap[*seal.IssuedBy]; ok {
				item.IssuedByName = name
			}
		}
		if seal.IssuedTo != nil {
			if name, ok := techNameMap[*seal.IssuedTo]; ok {
				item.TechName = name
			}
		}
		if seal.IssuedAt != nil {
			s := seal.IssuedAt.Format("2006-01-02 15:04:05")
			item.IssuedAt = &s
		}
		if seal.UsedAt != nil {
			s := seal.UsedAt.Format("2006-01-02 15:04:05")
			item.UsedAt = &s
		}
		if seal.ReturnedAt != nil {
			s := seal.ReturnedAt.Format("2006-01-02 15:04:05")
			item.ReturnedAt = &s
		}
		items = append(items, item)
	}

	period := map[string]string{
		"start_date": startDate,
		"end_date":   endDate,
	}

	return &SealStatement{
		Period:  period,
		Summary: summary,
		Total:   total,
		Items:   items,
	}, nil
}

// -------------------------------------------------------------------
// PendingReturnItem — DTO for pending returns list
// -------------------------------------------------------------------
type PendingReturnItem struct {
	ID             uint       `json:"id"`
	SealNumber     string     `json:"seal_number"`
	Status         string     `json:"status"`
	PeaCode        string     `json:"pea_code"`
	ReturnRemarks  string     `json:"return_remarks"`
	ReturnedAt     *time.Time `json:"returned_at"`
	Image1         string     `json:"image1,omitempty"`
	TechnicianID   *uint      `json:"technician_id"`
	TechnicianName string     `json:"technician_name"`
	TechnicianCode string     `json:"technician_code"`
}

// GetPendingReturns returns seals that a technician has returned but user hasn't confirmed yet
func (s *SealService) GetPendingReturns(peaCode string) ([]PendingReturnItem, error) {
	var results []PendingReturnItem

	query := s.db.Table("seals").
		Select(`seals.id, seals.seal_number, seals.status, seals.pea_code,
			seals.return_remarks, seals.returned_at, seals.image1,
			seals.returned_by_technician as technician_id,
			COALESCE(t.first_name || ' ' || t.last_name, '') as technician_name,
			COALESCE(t.technician_code, '') as technician_code`).
		Joins("LEFT JOIN technicians t ON t.id = seals.returned_by_technician").
		Where("seals.returned_by_technician IS NOT NULL").
		Where("seals.returned_by IS NULL").
		Where("seals.deleted_at IS NULL").
		Order("seals.returned_at DESC")

	if peaCode != "" {
		query = query.Where("seals.pea_code = ?", peaCode)
	}

	if err := query.Scan(&results).Error; err != nil {
		return nil, err
	}
	return results, nil
}

// AcceptReturn — user confirms the return
// - "ไม่ได้ใช้งาน (คืนคลัง)" / "รอตรวจสอบคืน" → กลับเป็น 'พร้อมใช้งาน'
// - "ซีลเก่าที่ถูกตัดออก" → คงสถานะ 'ใช้งานแล้ว' (แค่บันทึกผู้รับคืน)
// - "ชำรุดก่อนใช้งาน" → คงสถานะ 'เสียหาย' (แค่บันทึกผู้รับคืน)
func (s *SealService) AcceptReturn(sealNumber string, userID uint) error {
	seal, err := s.repo.FindByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซีลในระบบ")
	}

	if seal.ReturnedByTechnician == nil {
		return errors.New("ซีลนี้ยังไม่ได้ถูกส่งคืนจากช่าง")
	}
	if seal.ReturnedBy != nil {
		return errors.New("ซีลนี้ถูกรับคืนแล้ว")
	}

	now := time.Now()
	seal.ReturnedBy = &userID
	seal.ReturnedAt = &now

	// เปลี่ยนสถานะสุดท้ายตามเหตุผลการคืนที่ช่างแจ้ง
	switch seal.ReturnRemarks {
	case "ซีลเก่าที่ถูกตัดออก":
		// ซีลเก่าที่ตัดแล้ว → ใช้งานแล้ว
		seal.Status = string(constants.StatusUsed)
		seal.AssignedToTechnician = nil
	case "ชำรุดก่อนใช้งาน":
		// ซีลชำรุด → เสียหาย
		seal.Status = string(constants.StatusDamaged)
		seal.AssignedToTechnician = nil
	default:
		// "ไม่ได้ใช้งาน (คืนคลัง)" หรืออื่นๆ → กลับเป็นพร้อมใช้งาน
		// ✅ เก็บ IssuedAt ไว้เพื่อให้ฝั่ง App ยังแสดงวันที่จ่ายซีลในประวัติได้
		seal.Status = string(constants.StatusReady)
		seal.AssignedToTechnician = nil
	}

	err = s.db.Transaction(func(tx *gorm.DB) error {
		if err := s.repo.Update(seal); err != nil {
			return err
		}
		logEntry := model.Log{
			UserID: userID,
			Action: fmt.Sprintf("ยืนยันรับคืนซีล %s (เหตุผล: %s)", sealNumber, seal.ReturnRemarks),
		}
		return s.logRepo.Create(&logEntry)
	})

	if err == nil {
		s.hub.Broadcast(seal.PeaCode, "seal_updated")
	}
	return err
}

// -------------------------------------------------------------------
// BulkUpdateStatus — Batch update status for multiple seals
// -------------------------------------------------------------------
func (s *SealService) BulkUpdateStatus(sealNumbers []string, status string, remark string, userID uint) (int, error) {
	updated := 0
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, sn := range sealNumbers {
			seal, err := s.repo.FindByNumber(sn)
			if err != nil {
				return fmt.Errorf("ไม่พบซีล %s ในระบบ", sn)
			}
			oldStatus := seal.Status
			seal.Status = status
			now := time.Now()
			seal.UpdatedAt = now

			if err := s.repo.Update(seal); err != nil {
				return fmt.Errorf("อัปเดตซีล %s ล้มเหลว", sn)
			}

			logAction := fmt.Sprintf("แอดมินเปลี่ยนสถานะซีล %s จาก '%s' เป็น '%s'", sn, oldStatus, status)
			if remark != "" {
				logAction += fmt.Sprintf(" (หมายเหตุ: %s)", remark)
			}
			logEntry := model.Log{
				UserID: userID,
				Action: logAction,
			}
			if err := s.logRepo.Create(&logEntry); err != nil {
				return err
			}
			updated++
		}
		return nil
	})

	if err == nil && len(sealNumbers) > 0 {
		// Just use the first seal's PEA code for broadcasting, assuming they belong to the same PEA
		// Or better, broadcast to the one we know.
		seal, _ := s.repo.FindByNumber(sealNumbers[0])
		if seal != nil {
			s.hub.Broadcast(seal.PeaCode, "seal_updated")
		}
	}
	return updated, err
}

// -------------------------------------------------------------------
// BulkTransferPeaCode — Transfer multiple seals to a new PEA Code
// -------------------------------------------------------------------
func (s *SealService) BulkTransferPeaCode(sealNumbers []string, newPeaCode string, userID uint) (int, error) {
	transferred := 0
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, sn := range sealNumbers {
			seal, err := s.repo.FindByNumber(sn)
			if err != nil {
				return fmt.Errorf("ไม่พบซีล %s ในระบบ", sn)
			}
			oldPeaCode := seal.PeaCode
			seal.PendingPeaCode = newPeaCode
			seal.Status = string(constants.StatusWaitConfirmation)
			now := time.Now()
			seal.UpdatedAt = now

			if err := s.repo.Update(seal); err != nil {
				return fmt.Errorf("ร้องขอโอนย้ายซีล %s ล้มเหลว", sn)
			}

			logEntry := model.Log{
				UserID: userID,
				Action: fmt.Sprintf("ร้องขอโอนย้ายซีล %s จากสังกัด '%s' ไปยังสังกัด '%s' (รอยืนยัน)", sn, oldPeaCode, newPeaCode),
			}
			if err := s.logRepo.Create(&logEntry); err != nil {
				return err
			}
			transferred++
		}
		return nil
	})

	if err == nil && len(sealNumbers) > 0 {
		// Broadcast to the original PEA and possibly the new one
		// For simplicity, just broadcast "updated"
		s.hub.Broadcast(newPeaCode, "seal_updated")
		
		seal, _ := s.repo.FindByNumber(sealNumbers[0])
		if seal != nil {
			s.hub.Broadcast(seal.PeaCode, "seal_updated")
		}
	}
	return transferred, err
}

func (s *SealService) BulkCancelSeals(sealNumbers []string, userID uint) (int, error) {
	cancelled := 0
	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, sn := range sealNumbers {
			seal, err := s.repo.FindByNumber(sn)
			if err != nil {
				return fmt.Errorf("ไม่พบซีล %s ในระบบ", sn)
			}

			// Only allow cancelling if Status is either wait confirmation or issued (can be recalled)
			if seal.Status != string(constants.StatusWaitConfirmation) && seal.Status != string(constants.StatusIssued) {
				continue // skip seals that are already used, installed, etc.
			}

			seal.Status = string(constants.StatusReady)
			seal.IssuedBy = nil
			seal.IssuedTo = nil
			seal.IssuedAt = nil
			seal.AssignedToTechnician = nil
			seal.EmployeeCode = ""
			seal.IssueRemark = ""
			seal.ReturnedBy = &userID
			seal.ReturnedAt = &now
			seal.UpdatedAt = now

			if err := tx.Save(seal).Error; err != nil {
				return fmt.Errorf("คืนซีล %s ล้มเหลว", sn)
			}

			logEntry := model.Log{
				UserID: userID,
				Action: fmt.Sprintf("เรียกคืนซีล(Bulk Recall) %s กลับเป็นสถานะ 'พร้อมใช้งาน'", sn),
			}
			if err := s.logRepo.Create(&logEntry); err != nil {
				return err
			}
			cancelled++
		}
		return nil
	})

	if err == nil && len(sealNumbers) > 0 {
		seal, _ := s.repo.FindByNumber(sealNumbers[0])
		if seal != nil {
			s.hub.Broadcast(seal.PeaCode, "seal_updated")
		}
	}
	return cancelled, err
}
func (s *SealService) ConfirmSealsReceipt(techID uint, sealNumbers []string) error {
	var seals []model.Seal
	if err := s.db.Where("seal_number IN ? AND status = ?", sealNumbers, string(constants.StatusWaitConfirmation)).Find(&seals).Error; err != nil {
		return err
	}

	if len(seals) == 0 {
		return errors.New("ไม่พบซีลที่รอการยืนยัน")
	}

	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for i := range seals {
			// ตรวจสอบว่าเป็นซีลที่ถูกจ่ายให้อนันต์คนนี้จริงหรือไม่
			if seals[i].IssuedTo == nil || *seals[i].IssuedTo != techID {
				return fmt.Errorf("คุณไม่มีสิทธิ์ยืนยันซีล %s", seals[i].SealNumber)
			}

			seals[i].Status = string(constants.StatusIssued)
			seals[i].UpdatedAt = now

			if err := tx.Save(&seals[i]).Error; err != nil {
				return err
			}

			logEntry := model.Log{
				UserID: techID,
				Action: fmt.Sprintf("ยืนยันการรับซีล %s", seals[i].SealNumber),
			}
			if err := s.logRepo.Create(&logEntry); err != nil {
				return err
			}
		}
		return nil
	})

	if err == nil && len(seals) > 0 {
		s.hub.Broadcast(seals[0].PeaCode, "seal_updated")
	}
	return err
}

// BulkConfirmCompanyTransfer — Confirm incoming seal transfers for a company.
// Handles two cases:
//  1. Direct transfer (pending_pea_code is empty, pea_code = company's code)
//  2. Inter-company transfer (pending_pea_code = company's code)
func (s *SealService) BulkConfirmCompanyTransfer(sealNumbers []string, currentPeaCode string, userID uint) (int, error) {
	confirmed := 0
	err := s.db.Transaction(func(tx *gorm.DB) error {
		for _, sn := range sealNumbers {
			seal, err := s.repo.FindByNumber(sn)
			if err != nil {
				return fmt.Errorf("ไม่พบซีล %s ในระบบ", sn)
			}

			if seal.Status != string(constants.StatusWaitConfirmation) {
				return fmt.Errorf("ซีล %s ไม่ได้อยู่ในสถานะรอยืนยัน", sn)
			}

			var logMsg string

			if seal.PendingPeaCode != "" {
				// Case 1: Inter-company transfer — validate pending_pea_code
				if seal.PendingPeaCode != currentPeaCode {
					return fmt.Errorf("ซีล %s ไม่ได้รอยืนยันรับโอนสำหรับสังกัดคุณ", sn)
				}
				oldPeaCode := seal.PeaCode
				seal.PeaCode = seal.PendingPeaCode
				seal.PendingPeaCode = ""
				seal.AssignedToTechnician = nil
				seal.IssuedTo = &userID
				seal.Status = string(constants.StatusReady)
				logMsg = fmt.Sprintf("ยืนยันรับโอนซีล %s จากสังกัด '%s' เข้าสู่สังกัด '%s'", sn, oldPeaCode, seal.PeaCode)
			} else {
				// Case 2: Direct transfer to company admin — validate pea_code
				if seal.PeaCode != currentPeaCode {
					return fmt.Errorf("ซีล %s ไม่ได้อยู่ในสังกัดของคุณ", sn)
				}
				// Return seal to company admin as an assigned seal (StatusIssued)
				seal.AssignedToTechnician = &userID
				seal.IssuedTo = &userID
				seal.Status = string(constants.StatusIssued)
				logMsg = fmt.Sprintf("รับซีล %s", sn)
			}

			now := time.Now()
			seal.UpdatedAt = now

			if err := s.repo.Update(seal); err != nil {
				return fmt.Errorf("ยืนยันซีล %s ล้มเหลว", sn)
			}

			logEntry := model.Log{
				UserID: userID,
				Action: logMsg,
			}
			if err := s.logRepo.Create(&logEntry); err != nil {
				return err
			}
			confirmed++
		}
		return nil
	})

	if err == nil && len(sealNumbers) > 0 {
		s.hub.Broadcast(currentPeaCode, "seal_updated")
	}
	return confirmed, err
}
