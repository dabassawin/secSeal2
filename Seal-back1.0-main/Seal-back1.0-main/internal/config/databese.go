package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() {
	dbPortStr := os.Getenv("DB_PORT")
	log.Printf("DB_PORT env value: '%s'", dbPortStr)
	port, err := strconv.Atoi(dbPortStr)
	if err != nil {
		log.Fatalf("Invalid database port: %v", err)
	}

	// SQL Server connection string format
	dsn := fmt.Sprintf("sqlserver://%s:%s@%s:%d?database=%s&encrypt=disable",
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_HOST"),
		port,
		os.Getenv("DB_NAME"),
	)

	DB, err = gorm.Open(sqlserver.Open(dsn), &gorm.Config{
		DisableForeignKeyConstraintWhenMigrating: true,
	})
	if err != nil {
		log.Fatalf("❌ Failed to connect to database: %v", err)
	}

	fmt.Println("✅ Database connected successfully!")
}
