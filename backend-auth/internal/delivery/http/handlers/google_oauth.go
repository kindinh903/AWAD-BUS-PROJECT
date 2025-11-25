package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
)

// GoogleTokenResponse represents the raw response from Google tokeninfo API
type GoogleTokenResponse struct {
	ID            string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified string `json:"email_verified"` // Google returns this as string "true"/"false"
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
	Audience      string `json:"aud"`
}

// GoogleUserInfo represents user info from Google (processed)
type GoogleUserInfo struct {
	ID            string `json:"sub"`
	Email         string `json:"email"`
	EmailVerified bool   `json:"email_verified"`
	Name          string `json:"name"`
	Picture       string `json:"picture"`
	GivenName     string `json:"given_name"`
	FamilyName    string `json:"family_name"`
}

// VerifyGoogleIDToken verifies a Google ID token and returns user info
func (h *AuthHandler) VerifyGoogleIDToken(ctx context.Context, idToken string) (*GoogleUserInfo, error) {
	// Google's tokeninfo endpoint
	url := fmt.Sprintf("https://oauth2.googleapis.com/tokeninfo?id_token=%s", idToken)
	
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to verify token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token verification failed: %s", string(body))
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	log.Printf("[Google OAuth] Raw response from Google: %s", string(body))

	var tokenResponse GoogleTokenResponse
	if err := json.Unmarshal(body, &tokenResponse); err != nil {
		return nil, fmt.Errorf("failed to parse user info: %w", err)
	}

	log.Printf("[Google OAuth] Parsed user info: email=%s, verified=%s, name=%s", 
		tokenResponse.Email, tokenResponse.EmailVerified, tokenResponse.Name)

	// Verify the audience (client ID)
	expectedClientID := os.Getenv("GOOGLE_CLIENT_ID")
	if expectedClientID == "" || expectedClientID == "your-google-client-id" {
		// Fallback to the actual client ID if env var is not set
		expectedClientID = "899319379692-06c1gm0bgk4ngkg56j77qguonmu86m9u.apps.googleusercontent.com"
		log.Printf("[Google OAuth] Using fallback client ID: %s", expectedClientID)
	}
	
	log.Printf("[Google OAuth] Expected client ID: %s, Token audience: %s", expectedClientID, tokenResponse.Audience)

	// Verify the audience matches our client ID
	if tokenResponse.Audience != expectedClientID {
		return nil, fmt.Errorf("token audience mismatch: expected %s, got %s", expectedClientID, tokenResponse.Audience)
	}

	// Convert string email_verified to bool
	emailVerified := tokenResponse.EmailVerified == "true"
	if !emailVerified {
		return nil, fmt.Errorf("email not verified by Google")
	}

	if tokenResponse.Email == "" {
		return nil, fmt.Errorf("no email provided by Google")
	}

	// Convert to our processed struct
	userInfo := &GoogleUserInfo{
		ID:            tokenResponse.ID,
		Email:         tokenResponse.Email,
		EmailVerified: emailVerified,
		Name:          tokenResponse.Name,
		Picture:       tokenResponse.Picture,
		GivenName:     tokenResponse.GivenName,
		FamilyName:    tokenResponse.FamilyName,
	}

	return userInfo, nil
}

// IsValidGoogleDomain checks if email is from a valid domain (optional security check)
func (h *AuthHandler) IsValidGoogleDomain(email string) bool {
	// You can add domain restrictions here if needed
	// For now, accept all emails
	return strings.Contains(email, "@")
}