package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
	"golang.org/x/crypto/bcrypt"
)

// UserManagementHandler handles admin user management operations
type UserManagementHandler struct {
	authUsecase *usecases.AuthUsecase
}

// NewUserManagementHandler creates a new user management handler
func NewUserManagementHandler(authUsecase *usecases.AuthUsecase) *UserManagementHandler {
	return &UserManagementHandler{
		authUsecase: authUsecase,
	}
}

// CreateAdminRequest represents the request for creating an admin user
type CreateAdminRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
	Phone    string `json:"phone"`
}

// UpdateUserRequest represents the request for updating a user
type UpdateUserRequest struct {
	Name     *string `json:"name"`
	Phone    *string `json:"phone"`
	IsActive *bool   `json:"is_active"`
	Role     *string `json:"role"`
}

// ListAdmins godoc
// @Summary List admin users
// @Description Get list of all admin users or filter by role
// @Tags admin-users
// @Produce json
// @Security BearerAuth
// @Param role query string false "Filter by role: admin, user, or empty for all"
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /admin/users [get]
func (h *UserManagementHandler) ListAdmins(c *gin.Context) {
	roleFilter := c.Query("role")

	var users []*entities.User
	var err error

	if roleFilter == "" {
		// Get all users if no filter
		users, err = h.authUsecase.GetAllUsers(c.Request.Context())
	} else {
		// Filter by specific role
		var role entities.Role
		switch roleFilter {
		case "admin":
			role = entities.RoleAdmin
		case "user":
			role = entities.RolePassenger
		default:
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid role. Must be 'admin' or 'user'",
			})
			return
		}
		users, err = h.authUsecase.GetUsersByRole(c.Request.Context(), role)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get users",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    users,
		"count":   len(users),
	})
}

// CreateAdmin godoc
// @Summary Create admin user
// @Description Create a new admin user account
// @Tags admin-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param request body CreateAdminRequest true "Admin user data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse
// @Router /admin/users [post]
func (h *UserManagementHandler) CreateAdmin(c *gin.Context) {
	var req CreateAdminRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	user, err := h.authUsecase.CreateAdminUser(c.Request.Context(), usecases.CreateAdminInput{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
		Phone:    req.Phone,
	})
	if err != nil {
		// Check for duplicate email
		if containsStr(err.Error(), "already exists") || containsStr(err.Error(), "duplicate") {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Email already in use",
				"details": err.Error(),
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create admin user",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    user,
		"message": "Admin user created successfully",
	})
}

// GetUser godoc
// @Summary Get user details
// @Description Get detailed information about a specific user
// @Tags admin-users
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/users/{id} [get]
func (h *UserManagementHandler) GetUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID format",
		})
		return
	}

	user, err := h.authUsecase.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "User not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
	})
}

// UpdateUser godoc
// @Summary Update user
// @Description Update an existing user's information
// @Tags admin-users
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Param request body UpdateUserRequest true "Updated user data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/users/{id} [put]
func (h *UserManagementHandler) UpdateUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID format",
		})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate role if provided
	var rolePtr *entities.Role
	if req.Role != nil {
		var role entities.Role
		switch *req.Role {
		case "admin":
			role = entities.RoleAdmin
		case "user":
			role = entities.RolePassenger
		default:
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid role. Must be 'admin' or 'user'",
			})
			return
		}
		rolePtr = &role
	}

	user, err := h.authUsecase.UpdateUser(c.Request.Context(), userID, usecases.UpdateUserInput{
		Name:     req.Name,
		Phone:    req.Phone,
		IsActive: req.IsActive,
		Role:     rolePtr,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update user",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    user,
		"message": "User updated successfully",
	})
}

// DeactivateUser godoc
// @Summary Deactivate user
// @Description Deactivate a user account
// @Tags admin-users
// @Produce json
// @Security BearerAuth
// @Param id path string true "User ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /admin/users/{id} [delete]
func (h *UserManagementHandler) DeactivateUser(c *gin.Context) {
	userIDStr := c.Param("id")
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid user ID format",
		})
		return
	}

	// Don't allow deactivating self
	currentUserID, exists := c.Get("user_id")
	if exists {
		if currentID, ok := currentUserID.(string); ok {
			if currentID == userIDStr {
				c.JSON(http.StatusBadRequest, gin.H{
					"error": "Cannot deactivate your own account",
				})
				return
			}
		}
	}

	if err := h.authUsecase.DeactivateUser(c.Request.Context(), userID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to deactivate user",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User deactivated successfully",
	})
}

// Helper function to check if string contains substring
func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Unused import placeholder for bcrypt
var _ = bcrypt.MinCost

// Unused import placeholder for entities
var _ = entities.RoleAdmin
