package services

import (
	"fmt"
	"time"
)

// EmailTemplates provides centralized HTML email templates
type EmailTemplates struct{}

// NewEmailTemplates creates a new email templates instance
func NewEmailTemplates() *EmailTemplates {
	return &EmailTemplates{}
}

// TicketEmail generates the HTML for e-ticket emails
func (t *EmailTemplates) TicketEmail(toName, bookingRef, ticketNumber string) string {
	return fmt.Sprintf(`
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2980b9; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
        .content { background-color: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
        .ticket-info { background-color: white; padding: 15px; margin: 20px 0; border-left: 4px solid #2980b9; }
        .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #777; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚌 Bus Booking System</h1>
            <p>Your E-Ticket is Ready!</p>
        </div>
        <div class="content">
            <p>Dear %s,</p>
            
            <p>Thank you for booking with us! Your e-ticket has been generated and is attached to this email.</p>
            
            <div class="ticket-info">
                <h3>Booking Details</h3>
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Ticket Number:</strong> %s</p>
            </div>
            
            <p><strong>Important Information:</strong></p>
            <ul>
                <li>Please arrive at the departure point at least 15 minutes before departure time</li>
                <li>Bring a valid ID along with this e-ticket</li>
                <li>This ticket is non-transferable</li>
                <li>Keep this email for your records</li>
            </ul>
            
            <p>Have a safe journey!</p>
            
            <div class="footer">
                <p>This is an automated message, please do not reply to this email.</p>
                <p>&copy; 2025 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, bookingRef, ticketNumber)
}

// BookingConfirmationEmail generates the HTML for booking confirmation emails
func (t *EmailTemplates) BookingConfirmationEmail(toName, bookingReference string) string {
	return fmt.Sprintf(`
<html>
<body style="font-family: Arial, sans-serif;">
    <h2>Booking Confirmed!</h2>
    <p>Dear %s,</p>
    <p>Your booking has been confirmed.</p>
    <p><strong>Booking Reference:</strong> %s</p>
    <p>Your e-tickets will be sent to you shortly.</p>
    <p>Thank you for choosing Bus Booking System!</p>
</body>
</html>
`, toName, bookingReference)
}

// PaymentReceiptEmail generates the HTML for payment receipt emails
func (t *EmailTemplates) PaymentReceiptEmail(toName, bookingRef string, amount float64, txID string) string {
	return fmt.Sprintf(`
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
            
            <div class="amount">%.0f ₫</div>
            <p style="text-align: center; color: #666;">Payment Details</p>
            
            <div class="payment-details">
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Transaction ID:</strong> %s</p>
                <p><strong>Payment Method:</strong> bank_transfer</p>
                <p><strong>Payment Date:</strong> %s</p>
                <p><strong>Status:</strong> <span style="color: #27ae60;">✓ COMPLETED</span></p>
            </div>
            
            <p>Your e-tickets have been sent to your email. You can also download them from your booking history.</p>
            
            <p>Have a safe journey!</p>
            
            <div class="footer">
                <p>This is your official payment receipt. Please keep it for your records.</p>
                <p>&copy; 2025 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, amount, bookingRef, txID, time.Now().Format("January 2, 2006 at 3:04 PM"))
}

// TripReminderEmail generates the HTML for trip reminder emails
func (t *EmailTemplates) TripReminderEmail(toName, bookingRef, seats, departureTime, origin string) string {
	return fmt.Sprintf(`
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
                <strong>Your trip is coming up soon!</strong>
            </div>
            
            <div class="trip-info">
                <h3>Trip Details</h3>
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Seat(s):</strong> %s</p>
                <p><strong>Departure Time:</strong> %s</p>
                <p><strong>Departure Point:</strong> %s</p>
            </div>
            
            <p><strong>Important Reminders:</strong></p>
            <ul>
                <li>Please arrive at least 15 minutes before departure</li>
                <li>Bring a valid ID and your e-ticket</li>
                <li>Keep your e-ticket handy for scanning</li>
            </ul>
            
            <p>Have a safe journey!</p>
            
            <div class="footer">
                <p>This is an automated reminder.</p>
                <p>&copy; 2025 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, bookingRef, seats, departureTime, origin)
}

// CancellationEmail generates the HTML for cancellation emails
func (t *EmailTemplates) CancellationEmail(toName, bookingRef, reason string) string {
	return fmt.Sprintf(`
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
            
            <p>Your booking has been cancelled as requested.</p>
            
            <div class="cancellation-info">
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Reason:</strong> %s</p>
            </div>
            
            <p>If this was not requested by you, please contact us immediately.</p>
            
            <p>Thank you for using Bus Booking System.</p>
            
            <div class="footer">
                <p>This is an automated notification.</p>
                <p>&copy; 2025 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, bookingRef, reason)
}
