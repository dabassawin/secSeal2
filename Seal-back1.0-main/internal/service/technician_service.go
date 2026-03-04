package service

import (
	"errors"
	"log"
	"time"

	"fmt"

	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/Kev2406/PEA/internal/domain/repository"

	//"github.com/Kev2406/PEA/internal/uploads"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

var technicianSecretKey = []byte("your-technician-secret-key")

// notifyTechnicianAsync is a helper to fire off push notifications without blocking responses
/*
func (s *TechnicianService) notifyTechnicianAsync(techID uint, title, body string) {
	go func() {
		tech, err := s.repo.FindByID(techID)
		if err == nil && tech.ExpoPushToken != "" {
			// Assuming utils.SendExpoPushNotification exists and is imported
			// utils.SendExpoPushNotification(tech.ExpoPushToken, title, body, nil)
		}
	}()
}
*/

// TechnicianService รับผิดชอบ business logic สำหรับการลงทะเบียนและล็อกอินของช่าง
type TechnicianService struct {
	repo *repository.TechnicianRepository
}

// NewTechnicianService สร้าง instance ของ TechnicianService
func NewTechnicianService(repo *repository.TechnicianRepository) *TechnicianService {
	return &TechnicianService{repo: repo}
}

// Register สำหรับลงทะเบียนช่างใหม่
// Register สำหรับลงทะเบียนช่างใหม่
func (s *TechnicianService) Register(tech *model.Technician) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tech.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	tech.Password = string(hashedPassword)
	tech.CreatedAt = time.Now()
	tech.UpdatedAt = time.Now()

	// 🔍 Debug Technician Data ก่อนบันทึก
	fmt.Println("🔍 Debug Technician Data:", tech)

	return s.repo.Create(tech)
}

// Login สำหรับช่าง โดยตรวจสอบ credentials และสร้าง JWT token
func (s *TechnicianService) Login(username, password string) (string, error) {
	tech, err := s.repo.FindByUsername(username)
	if err != nil {
		return "", err
	}
	err = bcrypt.CompareHashAndPassword([]byte(tech.Password), []byte(password))
	if err != nil {
		return "", errors.New("invalid credentials")
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"tech_id":  tech.ID,
		"username": tech.Username,
		"role":     "technician",
		"exp":      time.Now().Add(24 * time.Hour).Unix(),
	})
	signedToken, err := token.SignedString(technicianSecretKey)
	if err != nil {
		return "", err
	}
	return signedToken, nil
}
func (s *TechnicianService) InstallSeal(sealNumber string, techID uint, serialNumber string) error {
	log.Printf("🔧 [InstallSeal] sealNumber=%s, techID=%d\n", sealNumber, techID)

	// 🔎 **1) ตรวจสอบว่าซีลมีอยู่ในระบบ**
	seal, err := s.repo.FindSealByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซีลในระบบ")
	}

	// 🔍 **2) ตรวจสอบว่าซีลถูก assign ให้ technician คนนี้**
	if seal.AssignedToTechnician == nil || *seal.AssignedToTechnician != techID {
		return errors.New("คุณไม่มีสิทธิ์ติดตั้งซีลนี้")
	}

	// 🚦 **3) ตรวจสอบว่าสถานะของซีลเป็น 'จ่าย'**
	if seal.Status != "จ่าย" {
		return errors.New("ซีลต้องอยู่ในสถานะ 'จ่าย' เท่านั้นจึงจะติดตั้งได้")
	}

	// 🛠 **4) อัปเดตสถานะเป็น 'ติดตั้งแล้ว'**
	now := time.Now()
	seal.Status = "ติดตั้งแล้ว"
	seal.UsedBy = &techID
	seal.UsedAt = &now
	seal.InstalledSerial = serialNumber

	if err := s.repo.UpdateSeal(seal); err != nil {
		return err
	}

	// 📝 **5) บันทึก Log ว่ามีการติดตั้ง**
	logEntry := model.Log{
		UserID: techID,
		Action: fmt.Sprintf("ติดตั้งซีล %s (Serial: %s)", sealNumber, serialNumber),
	}
	return s.repo.CreateLog(&logEntry)
}

func (s *TechnicianService) ReturnSealWithImage(sealNumber string, techID uint, remarks string, imageURL string) error {
	// ✅ ค้นหาซิลจากฐานข้อมูล
	seal, err := s.repo.FindSealByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซีลในระบบ")
	}

	// ✅ ตรวจสอบว่าซิลอยู่ในสถานะที่คืนได้ ('จ่าย', 'ติดตั้งแล้ว')
	if seal.Status != "จ่าย" && seal.Status != "ติดตั้งแล้ว" {
		return errors.New("ซีลไม่ได้อยู่ในสถานะที่สามารถคืนได้")
	}

	// ✅ ตรวจสอบ PeaCode ว่าตรงกับช่างหรือไม่
	tech, err := s.GetTechnicianByID(techID)
	if err != nil {
		return errors.New("ไม่พบข้อมูลช่าง")
	}
	if seal.PeaCode != tech.PeaCode {
		return errors.New("ไม่สามารถคืนซีลของสังกัดอื่นได้")
	}

	now := time.Now()

	// Determine the new status based on the return reason
	switch remarks {
	case "ซีลเก่าที่ถูกตัดออก":
		seal.Status = "ใช้งานแล้ว"
	case "ชำรุดก่อนใช้งาน":
		seal.Status = "เสียหาย"
	case "ไม่ได้ใช้งาน (คืนคลัง)":
		seal.Status = "พร้อมใช้งาน"
	default:
		seal.Status = "รอตรวจสอบคืน"
	}

	seal.ReturnedByTechnician = &techID
	seal.ReturnedAt = &now
	seal.ReturnRemarks = remarks // ✅ บันทึกเหตุผลการคืน

	if imageURL != "" {
		seal.Image2 = imageURL // เซฟเป็นรูปที่ 2 (รูปหลักฐานการคืน)
	}

	// ✅ บันทึกข้อมูลลงฐานข้อมูล
	if err := s.repo.UpdateSeal(seal); err != nil {
		return err
	}

	// ✅ บันทึก Log
	logEntry := model.Log{
		UserID: techID,
		Action: fmt.Sprintf("คืนซีล %s (เหตุผล: %s)", sealNumber, remarks),
	}
	return s.repo.CreateLog(&logEntry)
}

func (s *TechnicianService) CheckReturnableSeal(sealNumber string, techID uint) (*model.Seal, error) {
	seal, err := s.repo.FindSealByNumber(sealNumber)
	if err != nil {
		return nil, errors.New("ไม่พบซีลนี้ในระบบ")
	}

	if seal.Status != "จ่าย" && seal.Status != "ติดตั้งแล้ว" {
		return nil, errors.New("ซีลไม่ได้อยู่ในสถานะที่สามารถคืนได้")
	}

	tech, err := s.GetTechnicianByID(techID)
	if err != nil {
		return nil, errors.New("ไม่พบข้อมูลช่าง")
	}
	if seal.PeaCode != tech.PeaCode {
		return nil, errors.New("ไม่สามารถคืนซีลของสังกัดอื่นได้")
	}

	return seal, nil
}
func (s *TechnicianService) UpdateTechnician(techID uint, req struct {
	FirstName   string
	LastName    string
	PhoneNumber string
	CompanyName string
	Department  string
}) error {
	log.Println("🔍 [SERVICE] Checking if technician exists: ID =", techID)

	tech, err := s.repo.FindByID(techID)
	if err != nil {
		log.Println("❌ [ERROR] Technician not found:", err)
		return err
	}

	log.Println("✅ [SERVICE] Found Technician:", tech)

	// อัปเดตข้อมูลใหม่
	tech.FirstName = req.FirstName
	tech.LastName = req.LastName
	tech.PhoneNumber = req.PhoneNumber
	tech.CompanyName = req.CompanyName
	tech.Department = req.Department

	log.Println("🛠️ [SERVICE] Updating Technician:", tech)

	err = s.repo.UpdateTechnician(tech)
	if err != nil {
		log.Println("❌ [ERROR] Database update failed:", err)
		return err
	}

	log.Println("✅ [SERVICE] Technician update success!")
	return nil
}

func (s *TechnicianService) GetAllTechnicians(peaCode string, isPrefix bool) ([]model.Technician, error) {
	return s.repo.GetAllTechnicians(peaCode, isPrefix)
}

func (s *TechnicianService) GetTechnicianByID(techID uint) (*model.Technician, error) {
	return s.repo.FindByID(techID)
}

// func (s *TechnicianService) UpdateTechnician(techID uint, req map[string]interface{}) error {
//     technician, err := s.repo.FindByID(techID)
//     if err != nil {
//         return err
//     }

//     // อัปเดตข้อมูลที่ส่งเข้ามา
//     if req["first_name"] != nil {
//         technician.FirstName = req["first_name"].(string)
//     }
//     if req["last_name"] != nil {
//         technician.LastName = req["last_name"].(string)
//     }
//     if req["phone_number"] != nil {
//         technician.PhoneNumber = req["phone_number"].(string)
//     }
//     if req["company_name"] != nil {
//         technician.CompanyName = req["company_name"].(string)
//     }
//     if req["department"] != nil {
//         technician.Department = req["department"].(string)
//     }

//	    return s.repo.UpdateTechnician(technician)
//	}
func (s *TechnicianService) DeleteTechnician(techID uint) error {
	return s.repo.DeleteTechnician(techID)
}

// UpdateTechnicianPassword updates only the password field for a technician
func (s *TechnicianService) UpdateTechnicianPassword(techID uint, hashedPassword string) error {
	return s.repo.UpdatePasswordByID(techID, hashedPassword)
}

// ✅ **อัปโหลดรูปภาพหลังจากติดตั้งซีล**
func (s *TechnicianService) UploadSealImages(sealNumber string, techID uint, image1, image2 string) error {
	seal, err := s.repo.FindSealByNumber(sealNumber)
	if err != nil {
		return errors.New("ไม่พบซีลในระบบ")
	}

	if seal.Status != "ติดตั้งแล้ว" {
		return errors.New("ซีลต้องอยู่ในสถานะ 'ติดตั้งแล้ว' เท่านั้นจึงจะอัปโหลดรูปได้")
	}

	if seal.UsedBy == nil || *seal.UsedBy != techID {
		return errors.New("คุณไม่มีสิทธิ์อัปโหลดรูปซีลนี้")
	}

	if image1 != "" {
		seal.Image1 = image1
	}
	if image2 != "" {
		seal.Image2 = image2
	}

	return s.repo.UpdateSeal(seal)
}

// UpdatePushToken updates the technician's Expo push token
func (s *TechnicianService) UpdatePushToken(techID uint, token string) error {
	return s.repo.UpdatePushTokenByID(techID, token)
}

// GetNotifications retrieves all logs for a specific technician
func (s *TechnicianService) GetNotifications(techID uint) ([]model.Log, error) {
	return s.repo.GetLogsByUserID(techID)
}

// ClearNotifications deletes all logs for a specific technician
func (s *TechnicianService) ClearNotifications(techID uint) error {
	return s.repo.DeleteLogsByUserID(techID)
}
