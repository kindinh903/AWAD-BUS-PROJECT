package entities

import (
	"time"

	"github.com/google/uuid"
)

// Role represents user roles in the system
type Role string

const (
	RoleGuest     Role = "guest"
	RolePassenger Role = "passenger"
	RoleAdmin     Role = "admin"
)

// User represents a user in the system
type User struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Email         string     `json:"email" gorm:"uniqueIndex;not null"`
	Name          string     `json:"name" gorm:"not null"`
	Phone         string     `json:"phone" gorm:"index"`
	Role          Role       `json:"role" gorm:"type:varchar(20);not null;default:'passenger'"`
	PasswordHash  string     `json:"-" gorm:"column:password_hash"`
	OAuthID       *string    `json:"oauth_id,omitempty" gorm:"uniqueIndex"`
	OAuthProvider *string    `json:"oauth_provider,omitempty" gorm:"type:varchar(20)"` // google, github
	Avatar        *string    `json:"avatar,omitempty"`
	IsActive      bool       `json:"is_active" gorm:"default:true"`
	CreatedAt     time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// TableName overrides the table name
func (User) TableName() string {
	return "users"
}
