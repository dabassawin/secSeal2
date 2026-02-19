package repository

import (
	"errors"
	"log"

	"github.com/Kev2406/PEA/internal/domain/model"
	"gorm.io/gorm"
)

type UserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) *UserRepository {
	return &UserRepository{db: db}
}

// ✅ ค้นหาผู้ใช้ตาม emp_id
func (r *UserRepository) GetByEmpID(empID uint) (*model.User, error) {
	log.Println("🔎 [GetByEmpID] empID =", empID)

	var user model.User
	err := r.db.Where("emp_id = ?", empID).First(&user).Error
	if err != nil {
		log.Println("❌ [GetByEmpID] Error:", err)
		return nil, err
	}

	log.Printf("✅ [GetByEmpID] Found user: %+v\n", user)
	return &user, nil
}

// ✅ ค้นหาผู้ใช้ตาม username
func (r *UserRepository) GetByUsername(username string) (*model.User, error) {
	log.Println("🔎 [GetByUsername] username =", username)

	var user model.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		log.Println("❌ [GetByUsername] Error:", err)
		return nil, err
	}

	log.Printf("✅ [GetByUsername] Found user: %+v\n", user)
	return &user, nil
}

// ✅ เพิ่มผู้ใช้ใหม่ (ป้องกัน duplicate username)
func (r *UserRepository) Create(user *model.User) error {
	log.Printf("🚀 [CreateUser] Creating user: %+v\n", user)

	// ✅ ตรวจสอบว่า username มีอยู่แล้วหรือไม่
	var existingUser model.User
	err := r.db.Where("username = ?", user.Username).First(&existingUser).Error
	if err == nil {
		log.Printf("🚨 [CreateUser] Username '%s' already exists!", user.Username)
		return errors.New("username already exists")
	}

	// ✅ ถ้า username ยังไม่ซ้ำ ก็สร้างใหม่ได้
	if err := r.db.Create(user).Error; err != nil {
		log.Println("❌ [CreateUser] Error:", err)
		return err
	}

	log.Printf("✅ [CreateUser] User created successfully: %+v\n", user)
	return nil
}

// ✅ อัปเดตข้อมูลผู้ใช้
func (r *UserRepository) Update(user *model.User) error {
	log.Printf("🔄 [UpdateUser] Updating user: %+v\n", user)

	if err := r.db.Save(user).Error; err != nil {
		log.Println("❌ [UpdateUser] Error:", err)
		return err
	}

	log.Println("✅ [UpdateUser] User updated successfully")
	return nil
}
