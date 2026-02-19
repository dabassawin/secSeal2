package model

import (
	"time"

	"gorm.io/gorm"
)

type MasPea struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	PeaCode      string         `gorm:"size:10;not null" json:"pea_code"` // รหัสกฟฟ.
	NameEng   string         `gorm:"size:255" json:"name_eng"`
	NameTh    string         `gorm:"size:255" json:"name_th"`
	Level     string         `gorm:"size:50" json:"level"` // Region, District, Sub
	ParentID  *string        `gorm:"index" json:"parent_id,omitempty"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}
