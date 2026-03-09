package model

import (
	"time"

	"gorm.io/gorm"
)

// MasCom represents ศูนย์งาน (บริษัทนอกที่มาทำงานให้ PEA)
type MasCom struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	ComCode   string         `gorm:"size:20;not null;uniqueIndex" json:"com_code"` // รหัสศูนย์งาน เช่น 46735206
	NameTh    string         `gorm:"size:255" json:"name_th"`                      // ชื่อภาษาไทย เช่น T.S.N.รุ่งเจริญกิจ-(สรน)
	NameEng   string         `gorm:"size:255" json:"name_eng"`                     // ชื่อภาษาอังกฤษ
	PeaCode   string         `gorm:"size:10;not null" json:"pea_code"`             // รหัสสังกัด กฟฟ. (FK ไปยัง MasPea)
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
