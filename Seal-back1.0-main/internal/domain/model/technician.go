package model

import "time"

type Technician struct {
	ID             uint   `gorm:"primaryKey" json:"id"`
	TechnicianCode string `gorm:"not null;unique" json:"technician_code"`      // ✅ เพิ่มฟิลด์นี้
	PeaCode        string `gorm:"size:10;not null;default:''" json:"pea_code"` // รหัสกฟฟ.
	ComCode        string `gorm:"size:20;default:''" json:"com_code"`         // รหัสศูนย์งาน
	Username       string `gorm:"unique;not null" json:"username"`
	Password       string `gorm:"not null" json:"-"` // เก็บเป็น hashed password
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	Email          string `gorm:"unique;not null" json:"email"`
	PhoneNumber    string `gorm:"not null" json:"phone_number"` // ✅ เพิ่มเบอร์โทร
	ProfilePic     string `json:"profile_pic"` // รูปโปรไฟล์ช่าง

	// --- เพิ่มฟิลด์ใหม่ตามที่ต้องการ ---
	CompanyName string `json:"company_name"` // ชื่อบริษัท
	ExpoPushToken string `json:"expo_push_token"` // ✅ เก็บ Push Token ของช่าง

	IsCenter bool `gorm:"default:false" json:"is_center"` // ✅ Flag to identify Center Accounts

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
