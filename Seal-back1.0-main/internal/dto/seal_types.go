package dto

// SealCheckResult represents the result of checking a single seal's availability
type SealCheckResult struct {
	SealNumber  string `json:"seal_number"`
	IsAvailable bool   `json:"is_available"`
	Status      string `json:"status"`
	Reason      string `json:"reason"`
}
