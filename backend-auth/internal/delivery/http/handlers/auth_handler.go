package handlers

import (
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
	RefreshToken string `json:"refresh_token" binding:"required"`
}

type LogoutRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type AuthResponse struct {
	AccessToken  string      `json:"access_token"`
	RefreshToken string      `json:"refresh_token"`
	User         interface{} `json:"user"`
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

	c.JSON(http.StatusCreated, AuthResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User:         tokens.User,
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

	c.JSON(http.StatusOK, AuthResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User:         tokens.User,
	})
}

// RefreshToken godoc
// @Summary Refresh access token
// @Description Get a new access token using refresh token
// @Tags auth
// @Accept json
// @Produce json
// @Param request body RefreshTokenRequest true "Refresh token"
// @Success 200 {object} AuthResponse
// @Failure 401 {object} ErrorResponse
// @Router /auth/refresh [post]
func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshTokenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	tokens, err := h.authUsecase.RefreshAccessToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, AuthResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		User:         tokens.User,
	})
}

// Logout godoc
// @Summary Logout user
// @Description Revoke refresh token and logout
// @Tags auth
// @Accept json
// @Produce json
// @Param request body LogoutRequest true "Refresh token to revoke"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Router /auth/logout [post]
func (h *AuthHandler) Logout(c *gin.Context) {
	var req LogoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if req.RefreshToken != "" {
		if err := h.authUsecase.RevokeToken(c.Request.Context(), req.RefreshToken); err != nil {
			c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
			return
		}
	}

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
// @Description Handle Google OAuth callback
// @Tags auth
// @Success 200 {object} AuthResponse
// @Router /auth/google/callback [get]
func (h *AuthHandler) GoogleCallback(c *gin.Context) {
	// TODO: Implement callback
	c.JSON(http.StatusOK, gin.H{"message": "Google auth successful"})
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
