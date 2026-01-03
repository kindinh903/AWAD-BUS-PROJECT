package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

type NotificationHandler struct {
	notificationRepo repositories.NotificationRepository
}

func NewNotificationHandler(notificationRepo repositories.NotificationRepository) *NotificationHandler {
	return &NotificationHandler{
		notificationRepo: notificationRepo,
	}
}

// GetUserNotifications godoc
// @Summary Get user notifications
// @Description Get paginated list of notifications for authenticated user
// @Tags notifications
// @Accept json
// @Produce json
// @Param limit query int false "Limit" default(20)
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Notifications list"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /notifications [get]
func (h *NotificationHandler) GetUserNotifications(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))

	notifications, err := h.notificationRepo.GetByUserID(c.Request.Context(), userID.(uuid.UUID), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	// Count unread
	unreadCount := 0
	for _, n := range notifications {
		if n.Status != entities.NotificationStatusRead {
			unreadCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"notifications": notifications,
		"unread_count":  unreadCount,
		"total":         len(notifications),
	})
}

// GetUnreadCount godoc
// @Summary Get unread notification count
// @Description Get count of unread notifications for authenticated user
// @Tags notifications
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Unread count"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /notifications/unread-count [get]
func (h *NotificationHandler) GetUnreadCount(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	notifications, err := h.notificationRepo.GetByUserID(c.Request.Context(), userID.(uuid.UUID), 100)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	unreadCount := 0
	for _, n := range notifications {
		if n.Status != entities.NotificationStatusRead {
			unreadCount++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"count": unreadCount,
	})
}

// MarkAsRead godoc
// @Summary Mark notification as read
// @Description Mark a specific notification as read
// @Tags notifications
// @Accept json
// @Produce json
// @Param id path string true "Notification ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 400 {object} map[string]interface{} "Invalid ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Notification not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /notifications/{id}/read [put]
func (h *NotificationHandler) MarkAsRead(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	notificationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	// Get notification to verify ownership
	notification, err := h.notificationRepo.GetByID(c.Request.Context(), notificationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	// Verify user owns this notification
	if *notification.UserID != userID.(uuid.UUID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Mark as read
	notification.Status = entities.NotificationStatusRead
	if err := h.notificationRepo.Update(c.Request.Context(), notification); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification marked as read",
	})
}

// MarkAllAsRead godoc
// @Summary Mark all notifications as read
// @Description Mark all user's notifications as read
// @Tags notifications
// @Accept json
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /notifications/mark-all-read [put]
func (h *NotificationHandler) MarkAllAsRead(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	notifications, err := h.notificationRepo.GetByUserID(c.Request.Context(), userID.(uuid.UUID), 100)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch notifications"})
		return
	}

	// Update all unread notifications
	count := 0
	for _, n := range notifications {
		if n.Status != entities.NotificationStatusRead {
			n.Status = entities.NotificationStatusRead
			if err := h.notificationRepo.Update(c.Request.Context(), n); err == nil {
				count++
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "All notifications marked as read",
		"count":   count,
	})
}

// DeleteNotification godoc
// @Summary Delete notification
// @Description Delete a specific notification
// @Tags notifications
// @Accept json
// @Produce json
// @Param id path string true "Notification ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 400 {object} map[string]interface{} "Invalid ID"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Notification not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /notifications/{id} [delete]
func (h *NotificationHandler) DeleteNotification(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	notificationID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid notification ID"})
		return
	}

	// Get notification to verify ownership
	notification, err := h.notificationRepo.GetByID(c.Request.Context(), notificationID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Notification not found"})
		return
	}

	// Verify user owns this notification
	if *notification.UserID != userID.(uuid.UUID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		return
	}

	// Delete notification
	if err := h.notificationRepo.Delete(c.Request.Context(), notificationID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Notification deleted",
	})
}

// RegisterNotificationRoutes registers notification routes
func RegisterNotificationRoutes(router *gin.RouterGroup, handler *NotificationHandler, authMiddleware gin.HandlerFunc) {
	notifications := router.Group("/notifications")
	notifications.Use(authMiddleware)
	{
		notifications.GET("", handler.GetUserNotifications)
		notifications.GET("/unread-count", handler.GetUnreadCount)
		notifications.PUT("/:id/read", handler.MarkAsRead)
		notifications.PUT("/mark-all-read", handler.MarkAllAsRead)
		notifications.DELETE("/:id", handler.DeleteNotification)
	}
}
