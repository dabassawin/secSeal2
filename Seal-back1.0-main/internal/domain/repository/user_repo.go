package repository

import (
	"errors"

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

	var user model.User
	err := r.db.Where("emp_id = ?", empID).First(&user).Error
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// ✅ ค้นหาผู้ใช้ตาม username
func (r *UserRepository) GetByUsername(username string) (*model.User, error) {

	var user model.User
	err := r.db.Where("username = ?", username).First(&user).Error
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// ✅ เพิ่มผู้ใช้ใหม่ (ป้องกัน duplicate username)
func (r *UserRepository) Create(user *model.User) error {

	// ✅ ตรวจสอบว่า username มีอยู่แล้วหรือไม่
	var existingUser model.User
	err := r.db.Where("username = ?", user.Username).First(&existingUser).Error
	if err == nil {
		return errors.New("username already exists")
	}

	// ✅ ถ้า username ยังไม่ซ้ำ ก็สร้างใหม่ได้
	if err := r.db.Create(user).Error; err != nil {
		return err
	}

	return nil
}

// ✅ อัปเดตข้อมูลผู้ใช้
func (r *UserRepository) Update(user *model.User) error {

	if err := r.db.Save(user).Error; err != nil {
		return err
	}

	return nil
}

// ✅ ดึงรายชื่อผู้ใช้ทั้งหมด
func (r *UserRepository) GetAll() ([]model.User, error) {

	var users []model.User
	if err := r.db.Order("id ASC").Find(&users).Error; err != nil {
		return nil, err
	}

	return users, nil
}

// ✅ ลบผู้ใช้ (Soft Delete)
func (r *UserRepository) Delete(username string) error {

	result := r.db.Where("username = ?", username).Delete(&model.User{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("user not found")
	}

	return nil
}
