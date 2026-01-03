// Package services provides background job scheduling and execution.
// This scheduler runs periodic tasks for system maintenance and notifications.
package services

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
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
	seatReservationRepo     repositories.SeatReservationRepository
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
	seatReservationRepo repositories.SeatReservationRepository,
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
		seatReservationRepo:     seatReservationRepo,
		notificationQueue:       notificationQueue,
		notificationTemplateEng: notificationTemplateEng,
		emailService:            emailService,
		bookingExpiryMinutes:    2, // Changed to 2 minutes
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
	ctx := context.Background()
	
	// Get all pending bookings
	pendingBookings, err := s.bookingRepo.GetByStatus(ctx, entities.BookingStatusPending)
	if err != nil {
		return fmt.Errorf("failed to get pending bookings: %w", err)
	}

	now := time.Now()
	expiryThreshold := now.Add(-time.Duration(s.bookingExpiryMinutes) * time.Minute)
	expiredCount := 0
	
	for _, booking := range pendingBookings {
		// Check if booking is older than expiry threshold (2 minutes)
		if booking.CreatedAt.Before(expiryThreshold) {
			// Update booking status to expired
			booking.Status = entities.BookingStatusExpired
			booking.PaymentStatus = entities.PaymentStatusFailed
			expiredAt := now
			booking.ExpiresAt = &expiredAt
			
			if err := s.bookingRepo.Update(ctx, booking); err != nil {
				log.Printf("Failed to expire booking %s: %v", booking.ID, err)
				continue
			}
			
			// Release seat reservations associated with this booking
			if err := s.seatReservationRepo.DeleteByBookingID(ctx, booking.ID); err != nil {
				log.Printf("Failed to delete seat reservations for booking %s: %v", booking.ID, err)
			}
			
			expiredCount++
			log.Printf("Expired booking %s (created at: %s, age: %v)", 
				booking.BookingReference, 
				booking.CreatedAt.Format("2006-01-02 15:04:05"),
				now.Sub(booking.CreatedAt))
		}
	}
	
	if expiredCount > 0 {
		log.Printf("Successfully expired %d unpaid bookings", expiredCount)
	}
	
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
	ctx := context.Background()

	// Get all confirmed bookings
	bookings, err := s.bookingRepo.GetByStatus(ctx, "confirmed")
	if err != nil {
		return fmt.Errorf("failed to get confirmed bookings: %w", err)
	}

	now := time.Now()
	reminderWindow := now.Add(time.Duration(s.tripReminderHours) * time.Hour)
	sentCount := 0

	for _, booking := range bookings {
		// Skip if no trip loaded
		if booking.Trip == nil {
			continue
		}

		// Check if trip departure is within reminder window (24h from now)
		if booking.Trip.StartTime.After(now) && booking.Trip.StartTime.Before(reminderWindow) {
			// Send trip reminder notification
			if err := s.sendTripReminderNotification(booking.ID); err != nil {
				log.Printf("Failed to send trip reminder for booking %s: %v", booking.ID, err)
				continue
			}
			sentCount++
		}
	}

	if sentCount > 0 {
		log.Printf("Sent %d trip reminder notifications", sentCount)
	}

	return nil
}

// computeDailyAnalytics aggregates previous day's booking and revenue data
func (s *BackgroundJobScheduler) computeDailyAnalytics() error {
	ctx := context.Background()

	// Compute for yesterday
	now := time.Now()
	startOfYesterday := time.Date(now.Year(), now.Month(), now.Day()-1, 0, 0, 0, 0, now.Location())
	endOfYesterday := startOfYesterday.Add(24 * time.Hour)

	// Get all bookings from yesterday
	bookings, err := s.bookingRepo.GetByDateRange(ctx, startOfYesterday, endOfYesterday)
	if err != nil {
		return fmt.Errorf("failed to get bookings for analytics: %w", err)
	}

	// Aggregate booking analytics
	var totalBookings, confirmedBookings, cancelledBookings int
	var totalRevenue float64
	routeStats := make(map[uuid.UUID]*routeAnalyticsData)

	for _, booking := range bookings {
		totalBookings++

		switch booking.Status {
		case "confirmed", "completed":
			confirmedBookings++
			totalRevenue += booking.TotalAmount
		case "cancelled":
			cancelledBookings++
		}

		// Aggregate by route
		if booking.Trip != nil && booking.Trip.RouteID != uuid.Nil {
			routeID := booking.Trip.RouteID
			if routeStats[routeID] == nil {
				routeStats[routeID] = &routeAnalyticsData{}
			}
			routeStats[routeID].totalBookings++
			if booking.Status == "confirmed" || booking.Status == "completed" {
				routeStats[routeID].totalRevenue += booking.TotalAmount
			}
		}
	}

	// Calculate conversion rate
	conversionRate := 0.0
	if totalBookings > 0 {
		conversionRate = float64(confirmedBookings) / float64(totalBookings) * 100
	}

	// Store booking analytics - use CreateOrUpdate to handle existing records
	bookingAnalytics := &entities.BookingAnalytics{
		Date:              startOfYesterday,
		TotalBookings:     totalBookings,
		ConfirmedBookings: confirmedBookings,
		CancelledBookings: cancelledBookings,
		TotalRevenue:      totalRevenue,
		ConversionRate:    conversionRate,
	}

	if err := s.bookingAnalyticsRepo.CreateOrUpdate(ctx, bookingAnalytics); err != nil {
		log.Printf("Error storing booking analytics: %v", err)
	}

	// Store route analytics
	for routeID, stats := range routeStats {
		routeAnalytics := &entities.RouteAnalytics{
			RouteID:       routeID,
			Date:          startOfYesterday,
			TotalBookings: stats.totalBookings,
			TotalRevenue:  stats.totalRevenue,
		}
		if err := s.routeAnalyticsRepo.CreateOrUpdate(ctx, routeAnalytics); err != nil {
			log.Printf("Error storing route analytics for route %s: %v", routeID, err)
		}
	}

	log.Printf("Daily analytics computed: %d bookings, %.2f revenue, %.1f%% conversion",
		totalBookings, totalRevenue, conversionRate)

	return nil
}

// routeAnalyticsData holds temporary aggregation data for route analytics
type routeAnalyticsData struct {
	totalBookings int
	totalRevenue  float64
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
