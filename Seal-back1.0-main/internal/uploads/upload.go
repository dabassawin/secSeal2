package uploads

import (
	"fmt"
	"log"
	"mime/multipart"
	"os"
	"path/filepath"
	"time"
)

func SaveImage(file *multipart.FileHeader) (string, error) {
	uploadDir := "./uploads"
	err := os.MkdirAll(uploadDir, os.ModePerm)
	if err != nil {
		log.Println("❌ [ERROR] Failed to create upload directory:", err)
		return "", err
	}

	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), filepath.Base(file.Filename))
	savePath := filepath.Join(uploadDir, filename)

	log.Println("📂 [DEBUG] Saving file to:", savePath)

	if err := saveFile(file, savePath); err != nil {
		log.Println("❌ [ERROR] Failed to save file:", err)
		return "", err
	}

	log.Println("✅ [SUCCESS] Image saved:", savePath)
	return "/uploads/" + filename, nil // 👈 path ที่ client ใช้ดูได้
}

func saveFile(file *multipart.FileHeader, path string) error {
	src, err := file.Open()
	if err != nil {
		log.Println("❌ [ERROR] Cannot open file:", err)
		return err
	}
	defer src.Close()

	dst, err := os.Create(path)
	if err != nil {
		log.Println("❌ [ERROR] Cannot create destination file:", err)
		return err
	}
	defer dst.Close()

	_, err = dst.ReadFrom(src)
	if err != nil {
		log.Println("❌ [ERROR] Failed to copy file data:", err)
	}
	return err
}
