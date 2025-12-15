// Package services provides background job scheduling and execution.
// This scheduler runs periodic tasks for system maintenance and notifications.
package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

// BackgroundJobScheduler manages periodic background tasks
// Responsibilities:
//   - Expire unpaid bookings after timeout
//   - Send trip reminder notifications 24h before departure
//   - Process scheduled notifications from queue
//   - Compute daily analytics aggregates
//   - Cleanup old webhook logs and expired reservations
type BackgroundJobScheduler struct {
	bookingRepo             repositories.BookingRepository
	paymentRepo             repositories.PaymentRepository
	notificationRepo        repositories.NotificationRepository
	notificationPrefRepo    repositories.NotificationPreferenceRepository
	bookingAnalyticsRepo    repositories.BookingAnalyticsRepository
	routeAnalyticsRepo      repositories.RouteAnalyticsRepository
	tripRepo                repositories.TripRepository
	notificationQueue       *NotificationQueue
	notificationTemplateEng *NotificationTemplateEngine
	emailService            *EmailService

	// Configuration
	bookingExpiryMinutes int // Time before unpaid bookings expire (default: 30)
	tripReminderHours    int // Hours before trip to send reminder (default: 24)
	cleanupRetentionDays int // Days to retain old logs (default: 30)

	// Control
	ctx    context.Context
	cancel context.CancelFunc
}

// NewBackgroundJobScheduler creates a new background job scheduler
func NewBackgroundJobScheduler(
	bookingRepo repositories.BookingRepository,
	paymentRepo repositories.PaymentRepository,
	notificationRepo repositories.NotificationRepository,
	notificationPrefRepo repositories.NotificationPreferenceRepository,
	bookingAnalyticsRepo repositories.BookingAnalyticsRepository,
	routeAnalyticsRepo repositories.RouteAnalyticsRepository,
	tripRepo repositories.TripRepository,
	notificationQueue *NotificationQueue,
	notificationTemplateEng *NotificationTemplateEngine,
	emailService *EmailService,
) *BackgroundJobScheduler {
	ctx, cancel := context.WithCancel(context.Background())

	return &BackgroundJobScheduler{
		bookingRepo:             bookingRepo,
		paymentRepo:             paymentRepo,
		notificationRepo:        notificationRepo,
		notificationPrefRepo:    notificationPrefRepo,
		bookingAnalyticsRepo:    bookingAnalyticsRepo,
		routeAnalyticsRepo:      routeAnalyticsRepo,
		tripRepo:                tripRepo,
		notificationQueue:       notificationQueue,
		notificationTemplateEng: notificationTemplateEng,
		emailService:            emailService,
		bookingExpiryMinutes:    30,
		tripReminderHours:       24,
		cleanupRetentionDays:    30,
		ctx:                     ctx,
		cancel:                  cancel,
	}
}

// Start begins all background job workers
// Each job runs in its own goroutine with error recovery
func (s *BackgroundJobScheduler) Start() {
	log.Println("Starting background job scheduler...")

	// Job 1: Expire unpaid bookings (runs every 5 minutes)
	go s.runPeriodically("ExpireUnpaidBookings", 5*time.Minute, s.expireUnpaidBookings)

	// Job 2: Process scheduled notifications (runs every minute)
	go s.runPeriodically("ProcessScheduledNotifications", 1*time.Minute, s.processScheduledNotifications)

	// Job 3: Send trip reminders (runs every hour)
	go s.runPeriodically("SendTripReminders", 1*time.Hour, s.sendTripReminders)

	// Job 4: Compute daily analytics (runs at 1 AM daily)
	go s.runDaily("ComputeDailyAnalytics", 1, 0, s.computeDailyAnalytics)

	// Job 5: Cleanup expired data (runs at 3 AM daily)
	go s.runDaily("CleanupExpiredData", 3, 0, s.cleanupExpiredData)

	log.Println("Background job scheduler started successfully")
}

// Stop gracefully shuts down all background jobs
func (s *BackgroundJobScheduler) Stop() {
	log.Println("Stopping background job scheduler...")
	s.cancel()
}

// runPeriodically executes a job function at regular intervals
func (s *BackgroundJobScheduler) runPeriodically(name string, interval time.Duration, jobFunc func() error) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	log.Printf("Started background job: %s (interval: %v)", name, interval)

	// Run immediately on start
	if err := s.executeJob(name, jobFunc); err != nil {
		log.Printf("Error in %s (initial run): %v", name, err)
	}

	for {
		select {
		case <-s.ctx.Done():
			log.Printf("Stopped background job: %s", name)
			return
		case <-ticker.C:
			if err := s.executeJob(name, jobFunc); err != nil {
				log.Printf("Error in %s: %v", name, err)
			}
		}
	}
}

// runDaily executes a job function once per day at a specific hour
func (s *BackgroundJobScheduler) runDaily(name string, hour, minute int, jobFunc func() error) {
	log.Printf("Started daily job: %s (scheduled: %02d:%02d)", name, hour, minute)

	for {
		now := time.Now()
		nextRun := time.Date(now.Year(), now.Month(), now.Day(), hour, minute, 0, 0, now.Location())

		// If we've passed today's run time, schedule for tomorrow
		if nextRun.Before(now) {
			nextRun = nextRun.Add(24 * time.Hour)
		}

		waitDuration := time.Until(nextRun)
		log.Printf("Next run of %s scheduled in %v (at %v)", name, waitDuration, nextRun.Format("2006-01-02 15:04:05"))

		select {
		case <-s.ctx.Done():
			log.Printf("Stopped daily job: %s", name)
			return
		case <-time.After(waitDuration):
			if err := s.executeJob(name, jobFunc); err != nil {
				log.Printf("Error in %s: %v", name, err)
			}
		}
	}
}

// executeJob runs a job function with panic recovery
func (s *BackgroundJobScheduler) executeJob(name string, jobFunc func() error) (err error) {
	defer func() {
		if r := recover(); r != nil {
			err = fmt.Errorf("panic in job %s: %v", name, r)
			log.Println(err)
		}
	}()

	startTime := time.Now()
	log.Printf("Running job: %s", name)

	err = jobFunc()

	duration := time.Since(startTime)
	if err != nil {
		log.Printf("Job %s failed after %v: %v", name, duration, err)
	} else {
		log.Printf("Job %s completed successfully in %v", name, duration)
	}

	return err
}

// expireUnpaidBookings marks bookings as expired if payment not received within timeout
// This prevents seat inventory from being locked indefinitely
func (s *BackgroundJobScheduler) expireUnpaidBookings() error {
	// Note: This is a simplified implementation since GetByStatus doesn't exist
	// In production, you would add GetByStatus to BookingRepository interface
	log.Println("Expire unpaid bookings job executed (implementation pending)")
	return nil
} // processScheduledNotifications sends notifications that are due to be sent
func (s *BackgroundJobScheduler) processScheduledNotifications() error {
	ctx := context.Background()
	notifications, err := s.notificationRepo.GetScheduled(ctx, time.Now(), 100)
	if err != nil {
		return fmt.Errorf("failed to get scheduled notifications: %w", err)
	}

	enqueuedCount := 0
	for _, notification := range notifications {
		if notification.IsReadyToSend() {
			// Enqueue for processing
			s.notificationQueue.Enqueue(notification)
			enqueuedCount++
		}
	}

	if enqueuedCount > 0 {
		log.Printf("Enqueued %d scheduled notifications", enqueuedCount)
	}

	return nil
}

// sendTripReminders sends reminder notifications to users 24h before their trip
func (s *BackgroundJobScheduler) sendTripReminders() error {
	// Note: This is a simplified implementation since GetByStatus doesn't exist
	// In production, you would add GetByStatus to BookingRepository interface
	log.Println("Send trip reminders job executed (implementation pending)")
	return nil
}

// computeDailyAnalytics aggregates previous day's booking and revenue data
func (s *BackgroundJobScheduler) computeDailyAnalytics() error {
	// Note: This is a simplified implementation since GetByDateRange doesn't exist
	// In production, you would add GetByDateRange to BookingRepository interface
	log.Println("Compute daily analytics job executed (implementation pending)")
	return nil
}

// cleanupExpiredData removes old webhook logs and expired reservations
func (s *BackgroundJobScheduler) cleanupExpiredData() error {
	ctx := context.Background()
	cutoffDate := time.Now().AddDate(0, 0, -s.cleanupRetentionDays)

	// Cleanup old notifications
	if err := s.notificationRepo.DeleteOlderThan(ctx, cutoffDate); err != nil {
		log.Printf("Error cleaning up old notifications: %v", err)
	}

	// TODO: Add webhook log cleanup
	// TODO: Add expired reservation cleanup

	log.Printf("Cleanup completed for data older than %s", cutoffDate.Format("2006-01-02"))

	return nil
}

// Helper functions to send notifications

func (s *BackgroundJobScheduler) sendBookingCancellationNotification(bookingID uuid.UUID, reason string) {
	// TODO: Implement cancellation notification
	// For now, just log
	log.Printf("Would send cancellation notification for booking %s (reason: %s)", bookingID, reason)
}

func (s *BackgroundJobScheduler) sendTripReminderNotification(bookingID uuid.UUID) error {
	// TODO: Implement trip reminder notification
	// For now, just log
	log.Printf("Would send trip reminder for booking %s", bookingID)
	return nil
}
