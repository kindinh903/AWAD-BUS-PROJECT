package entities

import (
	"time"

	"github.com/google/uuid"
)

// RefreshToken represents a refresh token for authentication
type RefreshToken struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    uuid.UUID  `json:"user_id" gorm:"type:uuid;not null;index"`
	Token     string     `json:"token" gorm:"uniqueIndex;not null"`
	ExpiresAt time.Time  `json:"expires_at" gorm:"not null;index"`
	IsRevoked bool       `json:"is_revoked" gorm:"default:false"`
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
	RevokedAt *time.Time `json:"revoked_at,omitempty"`

	// Associations
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName overrides the table name
func (RefreshToken) TableName() string {
	return "refresh_tokens"
}

// IsExpired checks if the token has expired
func (rt *RefreshToken) IsExpired() bool {
	return time.Now().After(rt.ExpiresAt)
}

// IsValid checks if the token is valid
func (rt *RefreshToken) IsValid() bool {
	return !rt.IsRevoked && !rt.IsExpired()
}
