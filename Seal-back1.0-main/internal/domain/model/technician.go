package model

import "time"

type Technician struct {
	ID             uint   `gorm:"primaryKey" json:"id"`
	TechnicianCode string `gorm:"not null;unique" json:"technician_code"`      // ✅ เพิ่มฟิลด์นี้
	PeaCode        string `gorm:"size:10;not null;default:''" json:"pea_code"` // รหัสกฟฟ.
	Username       string `gorm:"unique;not null" json:"username"`
	Password       string `gorm:"not null" json:"-"` // เก็บเป็น hashed password
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	Email          string `gorm:"unique;not null" json:"email"`
	PhoneNumber    string `gorm:"not null" json:"phone_number"` // ✅ เพิ่มเบอร์โทร

	// --- เพิ่มฟิลด์ใหม่ตามที่ต้องการ ---
	CompanyName string `json:"company_name"` // ชื่อบริษัท
	Department  string `json:"department"`   // ชื่อหน่วยงาน

	ExpoPushToken string `json:"expo_push_token"` // ✅ เก็บ Push Token ของช่าง

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
