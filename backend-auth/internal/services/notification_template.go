package services

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/yourusername/bus-booking-auth/internal/entities"
)

// NotificationTemplateEngine renders notification templates with data
// This provides a centralized way to generate notification content
type NotificationTemplateEngine struct {
	emailService *EmailService
}

// NewNotificationTemplateEngine creates a new template engine
func NewNotificationTemplateEngine(emailService *EmailService) *NotificationTemplateEngine {
	return &NotificationTemplateEngine{
		emailService: emailService,
	}
}

// BookingConfirmationData contains data for booking confirmation notification
type BookingConfirmationData struct {
	RecipientName    string
	BookingReference string
	TripOrigin       string
	TripDestination  string
	DepartureTime    string
	TotalSeats       int
	TotalAmount      float64
	SeatNumbers      string
}

// PaymentReceiptData contains data for payment receipt notification
type PaymentReceiptData struct {
	RecipientName    string
	BookingReference string
	Amount           float64
	TransactionID    string
	PaymentMethod    string
	PaymentDate      string
}

// TripReminderData contains data for trip reminder notification
type TripReminderData struct {
	RecipientName    string
	BookingReference string
	SeatNumbers      string
	DepartureTime    string
	Origin           string
	Destination      string
	PickupPoint      string
}

// CancellationData contains data for cancellation notification
type CancellationData struct {
	RecipientName    string
	BookingReference string
	Reason           string
	RefundAmount     float64
	RefundMethod     string
}

// RenderBookingConfirmation renders booking confirmation notification
func (e *NotificationTemplateEngine) RenderBookingConfirmation(data BookingConfirmationData) (string, string, error) {
	subject := fmt.Sprintf("Booking Confirmed - %s", data.BookingReference)

	body := fmt.Sprintf(`
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2980b9; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .booking-info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #2980b9; }
        .success { background-color: #d4edda; border: 1px solid #c3e6cb; padding: 15px; border-radius: 5px; margin: 20px 0; color: #155724; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✓ Booking Confirmed!</h1>
        </div>
        <div class="content">
            <p>Dear %s,</p>
            
            <div class="success">
                <strong>Your booking has been confirmed successfully!</strong>
            </div>
            
            <div class="booking-info">
                <h3>Booking Details</h3>
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Route:</strong> %s → %s</p>
                <p><strong>Departure:</strong> %s</p>
                <p><strong>Seat(s):</strong> %s (%d seat(s))</p>
                <p><strong>Total Amount:</strong> $%.2f</p>
            </div>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
                <li>Complete payment to receive your e-tickets</li>
                <li>Your booking will expire in 30 minutes if payment is not completed</li>
                <li>E-tickets will be sent to your email after payment confirmation</li>
            </ul>
            
            <p>Thank you for choosing Bus Booking System!</p>
            
            <div class="footer">
                <p>This is an automated confirmation.</p>
                <p>&copy; 2024 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, data.RecipientName, data.BookingReference, data.TripOrigin, data.TripDestination,
		data.DepartureTime, data.SeatNumbers, data.TotalSeats, data.TotalAmount)

	return subject, body, nil
}

// RenderPaymentReceipt renders payment receipt notification
func (e *NotificationTemplateEngine) RenderPaymentReceipt(data PaymentReceiptData) (string, string, error) {
	subject := fmt.Sprintf("Payment Receipt - %s", data.BookingReference)

	body := fmt.Sprintf(`
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #27ae60; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .payment-details { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #27ae60; }
        .amount { font-size: 32px; font-weight: bold; color: #27ae60; text-align: center; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💳 Payment Successful!</h1>
        </div>
        <div class="content">
            <p>Dear %s,</p>
            
            <p>We have successfully received your payment.</p>
            
            <div class="amount">$%.2f</div>
            
            <div class="payment-details">
                <h3>Payment Details</h3>
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Transaction ID:</strong> %s</p>
                <p><strong>Payment Method:</strong> %s</p>
                <p><strong>Payment Date:</strong> %s</p>
                <p><strong>Status:</strong> <span style="color: #27ae60;">✓ COMPLETED</span></p>
            </div>
            
            <p>Your e-tickets have been sent to your email. You can also download them from your booking history.</p>
            
            <p>Have a safe journey!</p>
            
            <div class="footer">
                <p>This is your official payment receipt. Please keep it for your records.</p>
                <p>&copy; 2024 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, data.RecipientName, data.Amount, data.BookingReference, data.TransactionID,
		data.PaymentMethod, data.PaymentDate)

	return subject, body, nil
}

// RenderTripReminder renders trip reminder notification
func (e *NotificationTemplateEngine) RenderTripReminder(data TripReminderData) (string, string, error) {
	subject := fmt.Sprintf("Trip Reminder - Your trip is tomorrow!")

	body := fmt.Sprintf(`
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #e67e22; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .trip-info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #e67e22; }
        .reminder { background-color: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⏰ Trip Reminder</h1>
        </div>
        <div class="content">
            <p>Dear %s,</p>
            
            <div class="reminder">
                <strong>🚌 Your trip is coming up soon!</strong>
            </div>
            
            <div class="trip-info">
                <h3>Trip Details</h3>
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Seat(s):</strong> %s</p>
                <p><strong>Route:</strong> %s → %s</p>
                <p><strong>Departure Time:</strong> %s</p>
                <p><strong>Pickup Point:</strong> %s</p>
            </div>
            
            <p><strong>⚠️ Important Reminders:</strong></p>
            <ul>
                <li>Arrive at least <strong>15 minutes</strong> before departure</li>
                <li>Bring a <strong>valid ID</strong> and your <strong>e-ticket</strong></li>
                <li>Keep your e-ticket ready for scanning</li>
                <li>Check traffic conditions before leaving</li>
            </ul>
            
            <p>Have a safe and pleasant journey!</p>
            
            <div class="footer">
                <p>This is an automated reminder.</p>
                <p>&copy; 2024 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, data.RecipientName, data.BookingReference, data.SeatNumbers, data.Origin,
		data.Destination, data.DepartureTime, data.PickupPoint)

	return subject, body, nil
}

// RenderCancellation renders cancellation notification
func (e *NotificationTemplateEngine) RenderCancellation(data CancellationData) (string, string, error) {
	subject := fmt.Sprintf("Booking Cancelled - %s", data.BookingReference)

	refundInfo := ""
	if data.RefundAmount > 0 {
		refundInfo = fmt.Sprintf(`
            <p><strong>Refund Information:</strong></p>
            <ul>
                <li>Refund Amount: $%.2f</li>
                <li>Refund Method: %s</li>
                <li>Processing Time: 5-7 business days</li>
            </ul>
        `, data.RefundAmount, data.RefundMethod)
	}

	body := fmt.Sprintf(`
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #c0392b; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .cancellation-info { background-color: white; padding: 20px; margin: 20px 0; border-left: 4px solid #c0392b; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Booking Cancelled</h1>
        </div>
        <div class="content">
            <p>Dear %s,</p>
            
            <p>Your booking has been cancelled.</p>
            
            <div class="cancellation-info">
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Cancellation Reason:</strong> %s</p>
            </div>
            
            %s
            
            <p>If you did not request this cancellation, please contact us immediately.</p>
            
            <p>Thank you for using Bus Booking System.</p>
            
            <div class="footer">
                <p>This is an automated notification.</p>
                <p>&copy; 2024 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, data.RecipientName, data.BookingReference, data.Reason, refundInfo)

	return subject, body, nil
}

// ParseTemplateData parses JSON template data from notification
func (e *NotificationTemplateEngine) ParseTemplateData(notif *entities.Notification) (interface{}, error) {
	if notif.TemplateData == nil {
		return nil, fmt.Errorf("no template data")
	}

	var data interface{}
	if err := json.Unmarshal([]byte(*notif.TemplateData), &data); err != nil {
		return nil, fmt.Errorf("failed to parse template data: %w", err)
	}

	return data, nil
}

// SerializeTemplateData converts template data to JSON string
func SerializeTemplateData(data interface{}) (*string, error) {
	bytes, err := json.Marshal(data)
	if err != nil {
		return nil, fmt.Errorf("failed to serialize template data: %w", err)
	}

	str := string(bytes)
	return &str, nil
}

// FormatTime formats time for display in notifications
func FormatTime(t time.Time) string {
	return t.Format("Monday, January 2, 2006 at 3:04 PM")
}

// FormatDate formats date for display in notifications
func FormatDate(t time.Time) string {
	return t.Format("January 2, 2006")
}
