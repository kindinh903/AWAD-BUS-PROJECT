# Quick Reference: New Files Created

## Backend Files Created (17 files)

### Entities (Data Models)
1. **`backend-auth/internal/entities/payment.go`**
   - Payment entity with status tracking
   - PaymentWebhookLog for idempotency
   - Helper methods: IsExpired(), CanBeRefunded(), IsSuccessful()

2. **`backend-auth/internal/entities/notification.go`**
   - Notification entity with retry tracking
   - NotificationPreference for user settings
   - Helper methods: CanRetry(), IsReadyToSend(), ShouldSendNotification()

3. **`backend-auth/internal/entities/analytics.go`**
   - BookingAnalytics for daily metrics
   - RouteAnalytics for route performance

### Services (Business Services)
4. **`backend-auth/internal/services/payment_service.go`**
   - PaymentProvider interface (swappable)
   - PayOSService (real PayOS API integration)
   - MockPaymentService (development/testing)
   - HMAC-SHA256 signature verification

5. **`backend-auth/internal/services/notification_queue.go`**
   - NotificationQueue with 3 workers
   - Retry logic with exponential backoff
   - Periodic cleanup of old notifications
   - Graceful shutdown support

6. **`backend-auth/internal/services/notification_template.go`**
   - NotificationTemplateEngine
   - HTML templates for booking confirmation, payment receipt, trip reminder, cancellation
   - Date/time formatting helpers

7. **`backend-auth/internal/services/email_service.go`** (Enhanced)
   - SendHTMLEmail()
   - SendPaymentReceiptEmail()
   - SendTripReminderEmail()
   - SendCancellationEmail()

8. **`backend-auth/internal/services/background_jobs.go`** (NEW)
   - BackgroundJobScheduler with 5 periodic jobs
   - ExpireUnpaidBookings (every 5 min)
   - ProcessScheduledNotifications (every min)
   - SendTripReminders (hourly)
   - ComputeDailyAnalytics (daily at 1 AM)
   - CleanupExpiredData (daily at 3 AM)

### Repositories (Data Access)
9. **`backend-auth/internal/repositories/interfaces.go`** (Updated)
   - Added PaymentRepository interface
   - Added PaymentWebhookLogRepository interface
   - Added NotificationRepository interface
   - Added NotificationPreferenceRepository interface
   - Added BookingAnalyticsRepository interface
   - Added RouteAnalyticsRepository interface

10. **`backend-auth/internal/repositories/postgres/payment_repository.go`**
    - CRUD for Payment entity
    - GetByBookingID(), GetByExternalID(), GetByOrderCode()
    - GetPendingPayments(), GetExpiredPayments()
    - CRUD for PaymentWebhookLog
    - GetPendingLogs() for retry processing

11. **`backend-auth/internal/repositories/postgres/notification_repository.go`**
    - CRUD for Notification entity
    - GetPending(), GetScheduled()
    - MarkAsSent(), MarkAsFailed()
    - DeleteOlderThan() for cleanup
    - NotificationPreferenceRepository with CreateDefault()

12. **`backend-auth/internal/repositories/postgres/analytics_repository.go`**
    - BookingAnalyticsRepository with CreateOrUpdate() (upsert)
    - GetByDateRange() for trends
    - RouteAnalyticsRepository
    - GetTopRoutesByRevenue(), GetTopRoutesByBookings()

### Use Cases (Business Logic)
13. **`backend-auth/internal/usecases/payment_usecase.go`** (NEW)
    - CreatePayment() - generates payment links with 30-min expiry
    - ProcessWebhook() - idempotent webhook processing
    - handlePaymentSuccess() - confirms booking, sends notification
    - handlePaymentFailure/Cancellation/Expiry()
    - Webhook deduplication via PaymentWebhookLog table

14. **`backend-auth/internal/usecases/analytics_usecase.go`** (NEW)
    - GetBookingTrends() - time series data
    - GetRevenueSummary() - revenue metrics
    - GetConversionRate() - booking conversion
    - GetPopularRoutes() - top routes by revenue/bookings
    - GetRoutePerformance() - detailed route metrics
    - GetRevenueByTimeOfDay() - time-based analysis
    - ComparePeriods() - period-over-period comparison
    - GetDashboardSummary() - overview metrics

15. **`backend-auth/internal/usecases/booking_usecase.go`** (Enhanced)
    - UpdatePassengerInfo() - edit passenger details after booking
    - ChangeSeat() - reassign seats with availability check + price adjustment
    - AddPassengerToBooking() - add passengers to existing confirmed booking

### HTTP Handlers (API Endpoints)
16. **`backend-auth/internal/delivery/http/handlers/payment_handler.go`** (NEW)
    - CreatePayment - POST /api/v1/payments
    - GetPayment - GET /api/v1/payments/:id
    - CheckPaymentStatus - GET /api/v1/payments/:id/status
    - GetPaymentsByBooking - GET /api/v1/bookings/:id/payments
    - ProcessPayOSWebhook - POST /api/v1/webhooks/payos
    - MockPaymentCallback - POST /api/v1/webhooks/mock-payment
    - RegisterPaymentRoutes() helper

17. **`backend-auth/internal/delivery/http/handlers/analytics_handler.go`** (NEW)
    - GetDashboardSummary - GET /admin/analytics/dashboard
    - GetBookingTrends - GET /admin/analytics/bookings/trends
    - GetRevenueSummary - GET /admin/analytics/revenue
    - GetRevenueByTimeOfDay - GET /admin/analytics/revenue/time-of-day
    - GetConversionRate - GET /admin/analytics/conversion-rate
    - GetPopularRoutes - GET /admin/analytics/routes/popular
    - GetRoutePerformance - GET /admin/analytics/routes/:id/performance
    - ComparePeriods - GET /admin/analytics/compare
    - RegisterAnalyticsRoutes() helper

18. **`backend-auth/internal/delivery/http/handlers/booking_handler.go`** (Enhanced)
    - UpdatePassengerInfo - PUT /bookings/:id/passengers/:passenger_id
    - ChangeSeat - PUT /bookings/:id/passengers/:passenger_id/seat
    - AddPassenger - POST /bookings/:id/passengers

## Documentation Files Created (3 files)

19. **`IMPLEMENTATION_SUMMARY.md`**
    - Complete feature breakdown
    - What's done vs what remains
    - Architecture decisions explained
    - Estimated completion times

20. **`WIRING_GUIDE.md`**
    - Step-by-step main.go integration guide
    - Environment variables reference
    - Testing guide with examples
    - API endpoints summary
    - Deployment checklist

21. **`QUICK_REFERENCE.md`** (this file)
    - File-by-file breakdown
    - Purpose of each component

## File Naming Conventions

- **Entities**: `{domain}.go` (e.g., `payment.go`, `notification.go`)
- **Services**: `{domain}_service.go` (e.g., `payment_service.go`)
- **Repositories**: `{domain}_repository.go` (e.g., `payment_repository.go`)
- **Use Cases**: `{domain}_usecase.go` (e.g., `payment_usecase.go`)
- **Handlers**: `{domain}_handler.go` (e.g., `payment_handler.go`)

## Key Design Patterns Used

1. **Repository Pattern** - Abstracts data access
2. **Service Layer Pattern** - External integrations encapsulated
3. **Provider Interface** - Swappable payment providers
4. **Queue Pattern** - Async notification processing
5. **Template Method** - Notification template rendering
6. **Cron Pattern** - Background job scheduling

## Lines of Code Statistics

| Category | Files | Approx Lines |
|----------|-------|--------------|
| Entities | 3 | ~400 |
| Services | 5 | ~1500 |
| Repositories | 3 | ~800 |
| Use Cases | 3 | ~1300 |
| Handlers | 3 | ~800 |
| **Total** | **17** | **~4800 LOC** |

## Feature Coverage

✅ Payment Processing (PayOS + Mock)
✅ Webhook Handling (Idempotent)
✅ Notification System (Email + Queue)
✅ Analytics & Reporting (8 endpoints)
✅ Booking Modifications (3 operations)
✅ Background Jobs (5 periodic tasks)

## Integration Points

### Payment Flow
```
User → CreatePayment → PaymentProvider → PayOS API
PayOS → Webhook → ProcessWebhook → Confirm Booking → Send Email
```

### Notification Flow
```
Event → NotificationQueue → Workers → EmailService → SMTP
```

### Analytics Flow
```
Daily Job → Compute Metrics → Save to Analytics Tables
Dashboard → Query Analytics Tables → Display Charts
```

### Booking Modification Flow
```
User → UpdatePassenger/ChangeSeat/AddPassenger → Validate → Update DB → Regenerate Ticket
```

## Testing Strategy

1. **Unit Tests** - Payment webhook processing, template rendering
2. **Integration Tests** - End-to-end payment flow, notification delivery
3. **Manual Testing** - Use mock payment service, verify background jobs

## Next Steps After Wiring

1. Add missing repositories to main.go (copy-paste from WIRING_GUIDE.md)
2. Register routes (use RegisterPaymentRoutes, RegisterAnalyticsRoutes)
3. Start background services (notificationQueue.Start(), backgroundJobs.Start())
4. Test payment flow end-to-end
5. Build frontend components
6. Deploy to staging

## Support

For questions or issues:
1. Check WIRING_GUIDE.md for integration instructions
2. Review IMPLEMENTATION_SUMMARY.md for architecture decisions
3. Read inline code comments for implementation details
4. Check error logs for troubleshooting
