package main

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	err := godotenv.Load("./.env")
	if err != nil {
		fmt.Println("Error loading .env file, continuing with existing env vars")
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_PORT"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
	)

	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	err = db.Exec("ALTER TABLE technicians DROP COLUMN IF EXISTS profile_picture;").Error
	if err != nil {
		log.Fatalf("Failed to drop column: %v", err)
	}

	log.Println("Column profile_picture dropped successfully from technicians table")
}
