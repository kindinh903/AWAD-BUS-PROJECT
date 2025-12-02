package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

type AuthHandler struct {
	authUsecase *usecases.AuthUsecase
}

func NewAuthHandler(authUsecase *usecases.AuthUsecase) *AuthHandler {
	return &AuthHandler{
		authUsecase: authUsecase,
	}
}

// setCrossSiteCookie sets a cookie with SameSite=None; Secure for cross-origin requests
func (h *AuthHandler) setCrossSiteCookie(c *gin.Context, name, value string, maxAge int) {
	cookie := &http.Cookie{
		Name:     name,
		Value:    value,
		MaxAge:   maxAge,
		Path:     "/",
		Domain:   "",
		Secure:   true, // Required for SameSite=None
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode, // Allow cross-origin
	}
	http.SetCookie(c.Writer, cookie)
}

// clearCrossSiteCookie clears a cookie with proper SameSite settings
func (h *AuthHandler) clearCrossSiteCookie(c *gin.Context, name string) {
	cookie := &http.Cookie{
		Name:     name,
		Value:    "",
		MaxAge:   -1,
		Path:     "/",
		Domain:   "",
		Secure:   true,
		HttpOnly: true,
		SameSite: http.SameSiteNoneMode,
	}
	http.SetCookie(c.Writer, cookie)
}

type RegisterRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Phone    string `json:"phone"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"` // Optional - can be from cookie
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"` // Optional - can be from body or cookie
}

type GoogleAuthRequest struct {
	IDToken string `json:"id_token" binding:"required"`
}

type AuthResponse struct {
	AccessToken string      `json:"access_token"`
	User        interface{} `json:"user"`
}

// Register godoc
// @Summary Register a new user
// @Description Create a new user account
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RegisterRequest true "Registration details"
// @Success 201 {object} AuthResponse
// @Failure 400 {object} ErrorResponse
// @Router /auth/register [post]
func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	tokens, err := h.authUsecase.Register(c.Request.Context(), usecases.RegisterInput{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
		Phone:    req.Phone,
	})
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Set refresh token as HttpOnly cookie with cross-site support
	h.setCrossSiteCookie(c, "refresh_token", tokens.RefreshToken, 7*24*60*60)

	// Return access token in response (don't include refresh token)
	c.JSON(http.StatusCreated, AuthResponse{
		AccessToken: tokens.AccessToken,
		User:        tokens.User,
	})
}

// Login godoc
// @Summary Login user
// @Description Authenticate user and return JWT tokens
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LoginRequest true "Login credentials"
// @Success 200 {object} AuthResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/login [post]
func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	tokens, err := h.authUsecase.Login(c.Request.Context(), usecases.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: err.Error()})
		return
	}

	// Set refresh token as HttpOnly cookie with cross-site support
	h.setCrossSiteCookie(c, "refresh_token", tokens.RefreshToken, 7*24*60*60)

	// Return access token in response (don't include refresh token)
	c.JSON(http.StatusOK, AuthResponse{
		AccessToken: tokens.AccessToken,
		User:        tokens.User,
	})
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Get a new access token using refresh token from cookie or body
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RefreshTokenRequest false "Refresh token (optional, can be from HttpOnly cookie)"
// @Success 200 {object} AuthResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	// Don't fail if body is empty - refresh token might be in cookie
	c.ShouldBindJSON(&req)

	// Get refresh token from body or cookie
	refreshToken := req.RefreshToken
	if refreshToken == "" {
		// Try to get from HttpOnly cookie
		var err error
		refreshToken, err = c.Cookie("refresh_token")
		if err != nil || refreshToken == "" {
			// No refresh token found
			c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "No refresh token provided"})
			return
		}
	}

	tokens, err := h.authUsecase.RefreshAccessToken(c.Request.Context(), refreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: err.Error()})
		return
	}

	// Set refresh token as HttpOnly cookie (update it) with cross-site support
	h.setCrossSiteCookie(c, "refresh_token", tokens.RefreshToken, 7*24*60*60)

	// Return access token in response (don't include refresh token)
	c.JSON(http.StatusOK, AuthResponse{
		AccessToken: tokens.AccessToken,
		User:        tokens.User,
	})
}

// Logout godoc
// @Summary Logout user
// @Description Revoke refresh token and logout
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LogoutRequest true "Refresh token to revoke (optional, can be from cookie)"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	var req LogoutRequest
	// Don't fail if body is empty - refresh token might be in cookie
	c.ShouldBindJSON(&req)

	// Get refresh token from body or cookie
	refreshToken := req.RefreshToken
	if refreshToken == "" {
		// Try to get from HttpOnly cookie
		var err error
		refreshToken, err = c.Cookie("refresh_token")
		if err != nil && refreshToken == "" {
			// No token to revoke, just clear cookie
			h.clearCrossSiteCookie(c, "refresh_token")
			c.JSON(http.StatusOK, SuccessResponse{
				Message: "Logout successful",
			})
			return
		}
	}

	// Revoke the refresh token
	if refreshToken != "" {
		if err := h.authUsecase.RevokeToken(c.Request.Context(), refreshToken); err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
			return
		}
	}

	// Clear refresh token cookie
	h.clearCrossSiteCookie(c, "refresh_token")

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Logout successful",
	})
}

// GoogleLogin godoc
// @Summary OAuth login with Google
// @Description Redirect to Google OAuth
// @Tags auth
// @Success 302
// @Router /auth/google [get]
func (h *AuthHandler) GoogleLogin(c *gin.Context) {
	// TODO: Implement Google OAuth
	c.Redirect(http.StatusTemporaryRedirect, "https://accounts.google.com/o/oauth2/v2/auth")
}

// GoogleCallback godoc
// @Summary Google OAuth callback  
// @Description Handle Google OAuth callback with ID token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body GoogleAuthRequest true "Google ID Token"
// @Success 200 {object} AuthResponse
// @Failure 400 {object} ErrorResponse
// @Router /auth/google/callback [post]
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	var req GoogleAuthRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Verify Google ID token
	googleUser, err := h.VerifyGoogleIDToken(c.Request.Context(), req.IDToken)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: fmt.Sprintf("Invalid Google token: %v", err)})
		return
	}

	// Check if email domain is allowed (optional)
	if !h.IsValidGoogleDomain(googleUser.Email) {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Email domain not allowed"})
		return
	}

	// Check if user exists
	email := googleUser.Email
	existingUser, err := h.authUsecase.GetUserByEmail(c.Request.Context(), email)
	
	var user interface{}
	if err != nil || existingUser == nil {
		// Create new user
		tokens, createErr := h.authUsecase.RegisterOAuth(c.Request.Context(), usecases.OAuthUserInput{
			Email:    email,
			Name:     googleUser.Name,
			Provider: "google",
			Avatar:   googleUser.Picture,
		})
		if createErr != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: createErr.Error()})
			return
		}
		user = tokens.User
		
		// Set refresh token cookie with cross-site support
		h.setCrossSiteCookie(c, "refresh_token", tokens.RefreshToken, 7*24*60*60)
		
		c.JSON(http.StatusOK, AuthResponse{
			AccessToken: tokens.AccessToken,
			User:        user,
		})
		return
	}

	// User exists, login
	tokens, loginErr := h.authUsecase.LoginOAuth(c.Request.Context(), existingUser.ID)
	if loginErr != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: loginErr.Error()})
		return
	}

	// Set refresh token cookie with cross-site support
	h.setCrossSiteCookie(c, "refresh_token", tokens.RefreshToken, 7*24*60*60)

	c.JSON(http.StatusOK, AuthResponse{
		AccessToken: tokens.AccessToken,
		User:        tokens.User,
	})
}

// GitHubLogin godoc
// @Summary OAuth login with GitHub
// @Description Redirect to GitHub OAuth
// @Tags auth
// @Success 302
// @Router /auth/github [get]
func (h *AuthHandler) GitHubLogin(c *gin.Context) {
	c.Redirect(http.StatusTemporaryRedirect, "https://github.com/login/oauth/authorize")
}

// GitHubCallback godoc
// @Summary GitHub OAuth callback
// @Description Handle GitHub OAuth callback
// @Tags auth
// @Success 200 {object} AuthResponse
// @Router /auth/github/callback [get]
func (h *AuthHandler) GitHubCallback(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "GitHub auth successful"})
}
