package constants

type SealStatus string

const (
	StatusReady         SealStatus = "พร้อมใช้งาน"
	StatusIssued        SealStatus = "จ่าย"
	StatusInstalled     SealStatus = "ติดตั้งแล้ว"
	StatusUsed          SealStatus = "ใช้งานแล้ว"
	StatusDamaged       SealStatus = "เสียหาย"
	StatusLost          SealStatus = "สูญหาย"
	StatusPendingReturn SealStatus = "รอตรวจสอบคืน"
	StatusWaitConfirmation SealStatus = "รอยืนยัน"
)

// GetAllSealStatuses returns a slice of all valid seal statuses
func GetAllSealStatuses() []SealStatus {
	return []SealStatus{
		StatusReady,
		StatusIssued,
		StatusInstalled,
		StatusUsed,
		StatusDamaged,
		StatusLost,
		StatusPendingReturn,
		StatusWaitConfirmation,
	}
}

// IsValidStatus checks if a given string is a valid SealStatus
func IsValidStatus(status string) bool {
	validStatuses := GetAllSealStatuses()
	for _, s := range validStatuses {
		if string(s) == status {
			return true
		}
	}
	return false
}
