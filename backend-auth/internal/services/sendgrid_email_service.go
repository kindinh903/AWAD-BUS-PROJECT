package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

type SendGridEmailService struct {
	apiKey    string
	fromEmail string
	fromName  string
	client    *http.Client
}

type sendGridEmail struct {
	Personalizations []sendGridPersonalization `json:"personalizations"`
	From             sendGridEmailAddress      `json:"from"`
	Subject          string                    `json:"subject"`
	Content          []sendGridContent         `json:"content"`
	Attachments      []sendGridAttachment      `json:"attachments,omitempty"`
}

type sendGridPersonalization struct {
	To []sendGridEmailAddress `json:"to"`
}

type sendGridEmailAddress struct {
	Email string `json:"email"`
	Name  string `json:"name,omitempty"`
}

type sendGridContent struct {
	Type  string `json:"type"`
	Value string `json:"value"`
}

type sendGridAttachment struct {
	Content     string `json:"content"`
	Type        string `json:"type"`
	Filename    string `json:"filename"`
	Disposition string `json:"disposition"`
}

func NewSendGridEmailService() *SendGridEmailService {
	return &SendGridEmailService{
		apiKey:    getEnv("SENDGRID_API_KEY", ""),
		fromEmail: getEnv("FROM_EMAIL", "noreply@busbooking.com"),
		fromName:  getEnv("FROM_NAME", "Bus Booking System"),
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// SendTicketEmail sends an e-ticket via email with PDF attachment
func (s *SendGridEmailService) SendTicketEmail(
	toEmail string,
	toName string,
	bookingReference string,
	ticketNumber string,
	pdfBytes []byte,
) error {
	// Skip sending if SendGrid API key not configured
	if s.apiKey == "" {
		fmt.Printf("SendGrid API key not configured - skipping email for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Your E-Ticket - Booking %s", bookingReference)
	body := s.createTicketEmailBody(toName, bookingReference, ticketNumber)

	// Encode PDF to base64
	encodedPDF := base64.StdEncoding.EncodeToString(pdfBytes)

	// Create SendGrid email with attachment
	email := sendGridEmail{
		Personalizations: []sendGridPersonalization{
			{
				To: []sendGridEmailAddress{
					{Email: toEmail, Name: toName},
				},
			},
		},
		From: sendGridEmailAddress{
			Email: s.fromEmail,
			Name:  s.fromName,
		},
		Subject: subject,
		Content: []sendGridContent{
			{
				Type:  "text/html",
				Value: body,
			},
		},
		Attachments: []sendGridAttachment{
			{
				Content:     encodedPDF,
				Type:        "application/pdf",
				Filename:    fmt.Sprintf("ticket-%s.pdf", ticketNumber),
				Disposition: "attachment",
			},
		},
	}

	err := s.sendEmail(email)
	if err != nil {
		return fmt.Errorf("failed to send email via SendGrid: %w", err)
	}

	fmt.Printf("E-ticket sent successfully to %s via SendGrid\n", toEmail)
	return nil
}

func (s *SendGridEmailService) createTicketEmailBody(toName, bookingRef, ticketNumber string) string {
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
        .button { display: inline-block; padding: 12px 30px; background-color: #27ae60; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
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
            
            <p>You can download your e-ticket from the attachment or access it anytime from your booking history.</p>
            
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

// SendBookingConfirmationEmail sends a simple confirmation without attachment
func (s *SendGridEmailService) SendBookingConfirmationEmail(
	toEmail string,
	toName string,
	bookingReference string,
) error {
	if s.apiKey == "" {
		fmt.Printf("SendGrid API key not configured - skipping confirmation email for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Booking Confirmation - %s", bookingReference)
	body := fmt.Sprintf(`
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

	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

// SendHTMLEmail sends a simple HTML email without attachments
func (s *SendGridEmailService) SendHTMLEmail(toEmail, toName, subject, htmlBody string) error {
	if s.apiKey == "" {
		fmt.Printf("SendGrid API key not configured - skipping email for %s\n", toEmail)
		return nil
	}

	email := sendGridEmail{
		Personalizations: []sendGridPersonalization{
			{
				To: []sendGridEmailAddress{
					{Email: toEmail, Name: toName},
				},
			},
		},
		From: sendGridEmailAddress{
			Email: s.fromEmail,
			Name:  s.fromName,
		},
		Subject: subject,
		Content: []sendGridContent{
			{
				Type:  "text/html",
				Value: htmlBody,
			},
		},
	}

	return s.sendEmail(email)
}

// SendPaymentReceiptEmail sends payment receipt email
func (s *SendGridEmailService) SendPaymentReceiptEmail(
	toEmail, toName, bookingRef string,
	amount float64,
	transactionID string,
) error {
	if s.apiKey == "" {
		fmt.Printf("SendGrid API key not configured - skipping payment receipt for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Payment Receipt - Booking %s", bookingRef)
	body := s.createPaymentReceiptTemplate(toName, bookingRef, amount, transactionID)

	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

func (s *SendGridEmailService) createPaymentReceiptTemplate(toName, bookingRef string, amount float64, txID string) string {
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
            
            <div class="amount">$%.2f</div>
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

// SendTripReminderEmail sends trip reminder email
func (s *SendGridEmailService) SendTripReminderEmail(
	toEmail, toName, bookingRef, seatNumbers, departureTime, origin string,
) error {
	if s.apiKey == "" {
		fmt.Printf("SendGrid API key not configured - skipping trip reminder for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Trip Reminder - %s", bookingRef)
	body := s.createTripReminderTemplate(toName, bookingRef, seatNumbers, departureTime, origin)

	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

func (s *SendGridEmailService) createTripReminderTemplate(toName, bookingRef, seats, departureTime, origin string) string {
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

// SendCancellationEmail sends booking cancellation email
func (s *SendGridEmailService) SendCancellationEmail(
	toEmail, toName, bookingRef, reason string,
) error {
	if s.apiKey == "" {
		fmt.Printf("SendGrid API key not configured - skipping cancellation email for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Booking Cancelled - %s", bookingRef)
	body := s.createCancellationTemplate(toName, bookingRef, reason)

	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

func (s *SendGridEmailService) createCancellationTemplate(toName, bookingRef, reason string) string {
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

// sendEmail is the core method that sends email via SendGrid API
func (s *SendGridEmailService) sendEmail(email sendGridEmail) error {
	// Marshal email to JSON
	jsonData, err := json.Marshal(email)
	if err != nil {
		return fmt.Errorf("failed to marshal email data: %w", err)
	}

	// Create request
	req, err := http.NewRequest("POST", "https://api.sendgrid.com/v3/mail/send", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", s.apiKey))
	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := s.client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body
	body, _ := io.ReadAll(resp.Body)

	// Check response status
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("SendGrid API error (status %d): %s", resp.StatusCode, string(body))
	}

	return nil
}
