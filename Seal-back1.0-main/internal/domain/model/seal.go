package model

import (
	"time"

	"gorm.io/gorm"
)

type Seal struct {
	ID                      uint           `gorm:"primaryKey" json:"id"`
	SealNumber              string         `gorm:"unique;not null" json:"seal_number"`
	PeaCode                 string         `gorm:"size:10;not null;default:''" json:"pea_code"` // รหัสกฟฟ.
	InventoryDepartment     string         `gorm:"size:20;not null;default:'accounting'" json:"inventory_department"`
	Status                  string         `gorm:"not null" json:"status"`
	IssuedBy                *uint          `json:"issued_by,omitempty"`
	IssuedTo                *uint          `json:"issued_to,omitempty"`
	ReturnedBy              *uint          `json:"returned_by,omitempty"`
	ReturnedByTechnician    *uint          `json:"returned_by_technician,omitempty"`
	UsedBy                  *uint          `json:"used_by,omitempty"`
	IssuedAt                *time.Time     `json:"issued_at,omitempty"`
	UsedAt                  *time.Time     `json:"used_at,omitempty"`
	ReturnedAt              *time.Time     `json:"returned_at,omitempty"`
	CreatedAt               time.Time      `json:"created_at"`
	UpdatedAt               time.Time      `json:"updated_at"`
	DeletedAt               gorm.DeletedAt `gorm:"index" json:"-"`
	InstalledSerial         string         `json:"installed_serial,omitempty"`
	ReturnRemarks           string         `json:"return_remarks,omitempty"`
	EmployeeCode            string         `json:"employee_code,omitempty"`
	IssueRemark             string         `json:"issue_remark,omitempty"`
	AssignedToTechnician    *uint          `json:"assigned_to_technician,omitempty"`
	CreateRemarks           string         `json:"create_remarks,omitempty"`
	PendingPeaCode          string         `gorm:"size:10" json:"pending_pea_code,omitempty"` // รหัสกฟฟ. ปลายทางที่รอการยืนยัน
	TransferredByTechnician *uint          `json:"transferred_by_technician,omitempty"`       // ✅ เก็บ ID ของศูนย์งาน/ช่างที่โอนซีลต่อให้ช่างคนสุดท้าย

	// ✅ เพิ่มฟิลด์เก็บลิงก์รูปภาพ
	// image1 = รูปซีลที่ติดตั้ง, image2 = รูปซีลที่คืน, image3 = รูปมิเตอร์
	Image1 string `json:"image1,omitempty"`
	Image2 string `json:"image2,omitempty"`
	Image3 string `json:"image3,omitempty"`
}
