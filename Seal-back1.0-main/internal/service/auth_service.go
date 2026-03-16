package service

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/Kev2406/PEA/internal/domain/model"
	"github.com/golang-jwt/jwt/v5"
)

var secretKey = []byte("your-secret-key")

type AuthService struct{}

func NewAuthService() *AuthService {
	return &AuthService{}
}

// ✅ VerifyPEAToken ตรวจสอบ Token ผ่าน PEA API หรือ Mock JWT
func (s *AuthService) VerifyPEAToken(tokenString string) (*model.User, error) {
	var wg sync.WaitGroup
	var user *model.User
	var err error

	wg.Add(2)
	go func() {
		defer wg.Done()
		if u, e := s.VerifyMockJWT(tokenString); e == nil {
			user = u
			err = nil
		}
	}()

	go func() {
		defer wg.Done()
		if user == nil {
// log.Println("⚠️ [VerifyPEAToken] Mock JWT ไม่ถูกต้อง ลองตรวจสอบ PEA API...")
			if u, e := s.verifyWithPEAAPI(tokenString); e == nil {
				user = u
				err = nil
			}
		}
	}()

	wg.Wait()

	if user == nil {
		return nil, errors.New("invalid token or unauthorized")
	}
	return user, err
}

func (s *AuthService) verifyWithPEAAPI(tokenString string) (*model.User, error) {
	url := "http://localhost:4000/mock-verify"
	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		log.Println("❌ [VerifyPEAToken] NewRequest Error:", err)
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+tokenString)
	log.Printf("🔑 [VerifyPEAToken] ส่ง Request ไปที่ PEA API: %s\n", url)

	resp, err := client.Do(req)
	if err != nil {
		log.Println("❌ [VerifyPEAToken] Request Error:", err)
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		log.Printf("🚨 [VerifyPEAToken] API ตอบกลับ: Status=%d\n", resp.StatusCode)
		return nil, errors.New("invalid token or unauthorized")
	}

	var userFromAPI model.User
	if err := json.NewDecoder(resp.Body).Decode(&userFromAPI); err != nil {
		log.Println("❌ [VerifyPEAToken] Decode Error:", err)
		return nil, err
	}

	return &userFromAPI, nil
}

// ✅ VerifyMockJWT - ถอดรหัส JWT ที่ Mock ขึ้นมา
func (s *AuthService) VerifyMockJWT(tokenString string) (*model.User, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return secretKey, nil
	}, jwt.WithoutClaimsValidation())

	if err != nil {
		log.Println("❌ [VerifyMockJWT] Invalid JWT:", err)
		return nil, errors.New("invalid token")
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		empID, empOk := claims["emp_id"].(float64)
		firstName, firstOk := claims["first_name"].(string)
		lastName, lastOk := claims["last_name"].(string)
		email, emailOk := claims["email"].(string)
		role, roleOk := claims["role"].(string)
		peaCode, peaCodeOk := claims["pea_code"].(string)
		peaShort, peaShortOk := claims["pea_short"].(string)
		peaName, peaNameOk := claims["pea_name"].(string)

		if !empOk || !firstOk || !lastOk || !emailOk || !roleOk || !peaCodeOk || !peaShortOk || !peaNameOk {
			log.Println("❌ [VerifyMockJWT] Claims ไม่ครบ:", claims)
			return nil, errors.New("invalid token claims")
		}

		user := &model.User{
			EmpID:     uint(empID),
			FirstName: firstName,
			LastName:  lastName,
			Email:     email,
			Role:      role,
			PeaCode:   peaCode,
			PeaShort:  peaShort,
			PeaName:   peaName,
		}

// log.Println("✅ [VerifyMockJWT] สำเร็จ:", user)
		return user, nil
	}

	return nil, errors.New("invalid token claims")
}
