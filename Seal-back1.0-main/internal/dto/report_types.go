package dto

import "time"

// SealReportRow represents a single row from the v_seal_report VIEW
type SealReportRow struct {
	ID                 uint       `json:"id"`
	SealNumber         string     `json:"seal_number"`
	Status             string     `json:"status"`
	PeaCode            string     `json:"pea_code"`
	InstalledSerial    string     `json:"installed_serial"`
	IssueRemark        string     `json:"issue_remark"`
	CreateRemarks      string     `json:"create_remarks"`
	EmployeeCode       string     `json:"employee_code"`
	CreatedAt          time.Time  `json:"created_at"`
	IssuedAt           *time.Time `json:"issued_at"`
	UsedAt             *time.Time `json:"used_at"`
	ReturnedAt         *time.Time `json:"returned_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
	IssuedByName       string     `json:"issued_by_name"`
	TechnicianName     string     `json:"technician_name"`
	TechnicianCompany  string     `json:"technician_company"`
	UsedByName                string     `json:"used_by_name"`
	ReturnedByTechnicianName  string     `json:"returned_by_technician_name"`
	ReturnedByName            string     `json:"returned_by_name"`
}

// SealReportResponse is the JSON response for the report API
type SealReportResponse struct {
	Success bool            `json:"success"`
	Total   int             `json:"total"`
	Items   []SealReportRow `json:"items"`
}
