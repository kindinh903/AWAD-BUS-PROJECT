package postgres

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/yourusername/bus-booking-auth/internal/entities"
)

// SeedData creates default admin and user accounts
func SeedData(db *gorm.DB) error {
	ctx := context.Background()
	
	// Check if admin user already exists
	var adminCount int64
	db.Model(&entities.User{}).Where("role = ?", entities.RoleAdmin).Count(&adminCount)
	if adminCount > 0 {
		log.Println("Admin user already exists, skipping seed")
		return nil
	}

	// Create admin user
	adminPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	adminUser := &entities.User{
		ID:           uuid.New(),
		Name:         "System Administrator",
		Email:        "admin@busproject.com",
		PasswordHash: string(adminPassword),
		Phone:        "+84901234567",
		Role:         entities.RoleAdmin,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := db.WithContext(ctx).Create(adminUser).Error; err != nil {
		return err
	}

	// Create regular user
	userPassword, err := bcrypt.GenerateFromPassword([]byte("user123"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	regularUser := &entities.User{
		ID:           uuid.New(),
		Name:         "John Doe",
		Email:        "user@busproject.com",
		PasswordHash: string(userPassword),
		Phone:        "+84907654321",
		Role:         entities.RolePassenger,
		IsActive:     true,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	if err := db.WithContext(ctx).Create(regularUser).Error; err != nil {
		return err
	}

	log.Println("Seed data created successfully:")
	log.Println("Admin: admin@busproject.com / admin123")
	log.Println("User: user@busproject.com / user123")

	return nil
}