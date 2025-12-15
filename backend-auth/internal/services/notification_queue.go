package services

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

// NotificationQueue is a lightweight in-memory queue for processing notifications
// For production, this can be swapped with Redis, RabbitMQ, or AWS SQS
// This implementation provides basic queuing with retry logic and graceful shutdown
type NotificationQueue struct {
	queue   chan *entities.Notification
	workers int
	mu      sync.RWMutex
	running bool
	wg      sync.WaitGroup
	ctx     context.Context
	cancel  context.CancelFunc

	// Dependencies
	notifRepo      repositories.NotificationRepository
	emailService   *EmailService
	templateEngine *NotificationTemplateEngine
}

// NewNotificationQueue creates a new notification queue
// workers: number of concurrent workers processing notifications
// queueSize: buffer size for the channel (0 for unbuffered)
func NewNotificationQueue(
	workers int,
	queueSize int,
	notifRepo repositories.NotificationRepository,
	emailService *EmailService,
	templateEngine *NotificationTemplateEngine,
) *NotificationQueue {
	ctx, cancel := context.WithCancel(context.Background())

	return &NotificationQueue{
		queue:          make(chan *entities.Notification, queueSize),
		workers:        workers,
		running:        false,
		ctx:            ctx,
		cancel:         cancel,
		notifRepo:      notifRepo,
		emailService:   emailService,
		templateEngine: templateEngine,
	}
}

// Start begins processing notifications with multiple workers
func (q *NotificationQueue) Start() {
	q.mu.Lock()
	if q.running {
		q.mu.Unlock()
		return
	}
	q.running = true
	q.mu.Unlock()

	log.Printf("[NotificationQueue] Starting with %d workers", q.workers)

	// Start worker goroutines
	for i := 0; i < q.workers; i++ {
		q.wg.Add(1)
		go q.worker(i)
	}

	// Start periodic cleanup of old notifications
	q.wg.Add(1)
	go q.cleanupWorker()
}

// Stop gracefully shuts down the queue
func (q *NotificationQueue) Stop() {
	q.mu.Lock()
	if !q.running {
		q.mu.Unlock()
		return
	}
	q.running = false
	q.mu.Unlock()

	log.Println("[NotificationQueue] Stopping...")

	// Signal cancellation
	q.cancel()

	// Close queue channel
	close(q.queue)

	// Wait for all workers to finish
	q.wg.Wait()

	log.Println("[NotificationQueue] Stopped")
}

// Enqueue adds a notification to the processing queue
func (q *NotificationQueue) Enqueue(notif *entities.Notification) error {
	q.mu.RLock()
	defer q.mu.RUnlock()

	if !q.running {
		return fmt.Errorf("queue is not running")
	}

	// Update status to queued
	notif.Status = entities.NotificationStatusQueued
	if err := q.notifRepo.Update(context.Background(), notif); err != nil {
		return fmt.Errorf("failed to update notification status: %w", err)
	}

	// Non-blocking send with timeout
	select {
	case q.queue <- notif:
		return nil
	case <-time.After(5 * time.Second):
		return fmt.Errorf("queue is full, notification enqueue timeout")
	case <-q.ctx.Done():
		return fmt.Errorf("queue is shutting down")
	}
}

// worker processes notifications from the queue
func (q *NotificationQueue) worker(id int) {
	defer q.wg.Done()

	log.Printf("[NotificationQueue] Worker %d started", id)

	for {
		select {
		case notif, ok := <-q.queue:
			if !ok {
				// Channel closed, worker should exit
				log.Printf("[NotificationQueue] Worker %d stopped", id)
				return
			}

			// Process notification
			q.processNotification(notif)

		case <-q.ctx.Done():
			log.Printf("[NotificationQueue] Worker %d cancelled", id)
			return
		}
	}
}

// processNotification sends a notification through the appropriate channel
func (q *NotificationQueue) processNotification(notif *entities.Notification) {
	ctx := context.Background()

	// Update status to sending
	notif.Status = entities.NotificationStatusSending
	if err := q.notifRepo.Update(ctx, notif); err != nil {
		log.Printf("[NotificationQueue] Failed to update notification %s: %v", notif.ID, err)
		return
	}

	var err error

	switch notif.Channel {
	case entities.NotificationChannelEmail:
		err = q.sendEmail(notif)
	case entities.NotificationChannelSMS:
		err = q.sendSMS(notif)
	default:
		err = fmt.Errorf("unsupported notification channel: %s", notif.Channel)
	}

	// Update notification status based on result
	if err != nil {
		log.Printf("[NotificationQueue] Failed to send notification %s: %v", notif.ID, err)

		notif.Status = entities.NotificationStatusFailed
		now := time.Now()
		notif.FailedAt = &now
		errMsg := err.Error()
		notif.ErrorMessage = &errMsg
		notif.RetryCount++

		// If can retry, re-enqueue after delay
		if notif.CanRetry() {
			time.AfterFunc(time.Duration(notif.RetryCount)*time.Minute, func() {
				log.Printf("[NotificationQueue] Retrying notification %s (attempt %d)", notif.ID, notif.RetryCount+1)
				if err := q.Enqueue(notif); err != nil {
					log.Printf("[NotificationQueue] Failed to re-enqueue notification %s: %v", notif.ID, err)
				}
			})
		}
	} else {
		log.Printf("[NotificationQueue] Successfully sent notification %s via %s", notif.ID, notif.Channel)

		notif.Status = entities.NotificationStatusSent
		now := time.Now()
		notif.SentAt = &now
	}

	// Save final status
	if err := q.notifRepo.Update(ctx, notif); err != nil {
		log.Printf("[NotificationQueue] Failed to update notification status %s: %v", notif.ID, err)
	}
}

// sendEmail sends notification via email
func (q *NotificationQueue) sendEmail(notif *entities.Notification) error {
	if notif.RecipientEmail == nil || *notif.RecipientEmail == "" {
		return fmt.Errorf("recipient email is required")
	}

	// Use HTML body if available, otherwise plain text
	body := notif.Body
	if notif.HTMLBody != nil && *notif.HTMLBody != "" {
		body = *notif.HTMLBody
	}

	return q.emailService.SendHTMLEmail(
		*notif.RecipientEmail,
		notif.RecipientName,
		notif.Subject,
		body,
	)
}

// sendSMS sends notification via SMS (placeholder for future implementation)
func (q *NotificationQueue) sendSMS(notif *entities.Notification) error {
	if notif.RecipientPhone == nil || *notif.RecipientPhone == "" {
		return fmt.Errorf("recipient phone is required")
	}

	// SMS integration would go here (Twilio, AWS SNS, etc.)
	log.Printf("[NotificationQueue] SMS sending not implemented: %s -> %s", *notif.RecipientPhone, notif.Body)

	// For now, just log and mark as sent
	return nil
}

// cleanupWorker periodically cleans up old sent notifications
func (q *NotificationQueue) cleanupWorker() {
	defer q.wg.Done()

	ticker := time.NewTicker(24 * time.Hour)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			// Delete sent notifications older than 30 days
			cutoff := time.Now().AddDate(0, 0, -30)
			if err := q.notifRepo.DeleteOlderThan(context.Background(), cutoff); err != nil {
				log.Printf("[NotificationQueue] Cleanup failed: %v", err)
			} else {
				log.Println("[NotificationQueue] Cleanup completed")
			}

		case <-q.ctx.Done():
			log.Println("[NotificationQueue] Cleanup worker stopped")
			return
		}
	}
}

// LoadPendingNotifications loads pending/scheduled notifications from DB and enqueues them
// This should be called on application startup to resume processing
func (q *NotificationQueue) LoadPendingNotifications(ctx context.Context) error {
	notifications, err := q.notifRepo.GetPending(ctx, 100)
	if err != nil {
		return fmt.Errorf("failed to load pending notifications: %w", err)
	}

	log.Printf("[NotificationQueue] Loading %d pending notifications", len(notifications))

	for _, notif := range notifications {
		// Check if notification is ready to send
		if notif.IsReadyToSend() {
			if err := q.Enqueue(notif); err != nil {
				log.Printf("[NotificationQueue] Failed to enqueue notification %s: %v", notif.ID, err)
			}
		}
	}

	return nil
}
