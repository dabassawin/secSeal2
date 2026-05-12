package main

import (
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load(".env")
	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable TimeZone=Asia/Bangkok",
		os.Getenv("DB_HOST"), os.Getenv("DB_PORT"), os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"), os.Getenv("DB_NAME"))

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		log.Fatal(err)
	}

	var logs []struct {
		ID uint
		UserID uint
		Action string
		Timestamp string
	}
	db.Raw("SELECT id, user_id, action, timestamp FROM logs ORDER BY id DESC LIMIT 5").Scan(&logs)

	fmt.Println("Latest 5 logs:")
	for _, l := range logs {
		fmt.Printf("- ID: %v, UserID: %v, Action: %v, Time: %v\n", l.ID, l.UserID, l.Action, l.Timestamp)
	}
}
