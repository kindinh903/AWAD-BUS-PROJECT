package services

import (
	"encoding/base64"
	"fmt"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

type SendGridEmailService struct {
	apiKey    string
	fromEmail string
	fromName  string
	client    *sendgrid.Client
	templates *EmailTemplates
}

func NewSendGridEmailService() *SendGridEmailService {
	apiKey := getEnv("SENDGRID_API_KEY", "")
	return &SendGridEmailService{
		apiKey:    apiKey,
		fromEmail: getEnv("FROM_EMAIL", "noreply@busbooking.com"),
		fromName:  getEnv("FROM_NAME", "Bus Booking System"),
		client:    sendgrid.NewSendClient(apiKey),
		templates: NewEmailTemplates(),
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

	from := mail.NewEmail(s.fromName, s.fromEmail)
	to := mail.NewEmail(toName, toEmail)
	subject := fmt.Sprintf("Your E-Ticket - Booking %s", bookingReference)
	htmlContent := s.templates.TicketEmail(toName, bookingReference, ticketNumber)

	message := mail.NewSingleEmail(from, subject, to, "", htmlContent)

	// Add PDF attachment
	attachment := mail.NewAttachment()
	encoded := base64.StdEncoding.EncodeToString(pdfBytes)
	attachment.SetContent(encoded)
	attachment.SetType("application/pdf")
	attachment.SetFilename(fmt.Sprintf("ticket-%s.pdf", ticketNumber))
	attachment.SetDisposition("attachment")
	message.AddAttachment(attachment)

	response, err := s.client.Send(message)
	if err != nil {
		return fmt.Errorf("failed to send email via SendGrid: %w", err)
	}

	if response.StatusCode >= 300 {
		return fmt.Errorf("SendGrid API error (status %d): %s", response.StatusCode, response.Body)
	}

	fmt.Printf("E-ticket sent successfully to %s via SendGrid\n", toEmail)
	return nil
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
	htmlBody := s.templates.BookingConfirmationEmail(toName, bookingReference)
	return s.SendHTMLEmail(toEmail, toName, subject, htmlBody)
}

// SendHTMLEmail sends a simple HTML email without attachments
func (s *SendGridEmailService) SendHTMLEmail(toEmail, toName, subject, htmlBody string) error {
	if s.apiKey == "" {
		fmt.Printf("SendGrid API key not configured - skipping email for %s\n", toEmail)
		return nil
	}

	from := mail.NewEmail(s.fromName, s.fromEmail)
	to := mail.NewEmail(toName, toEmail)
	message := mail.NewSingleEmail(from, subject, to, "", htmlBody)

	response, err := s.client.Send(message)
	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	if response.StatusCode >= 300 {
		return fmt.Errorf("SendGrid API error (status %d): %s", response.StatusCode, response.Body)
	}

	return nil
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
	htmlBody := s.templates.PaymentReceiptEmail(toName, bookingRef, amount, transactionID)
	return s.SendHTMLEmail(toEmail, toName, subject, htmlBody)
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
	htmlBody := s.templates.TripReminderEmail(toName, bookingRef, seatNumbers, departureTime, origin)
	return s.SendHTMLEmail(toEmail, toName, subject, htmlBody)
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
	htmlBody := s.templates.CancellationEmail(toName, bookingRef, reason)
	return s.SendHTMLEmail(toEmail, toName, subject, htmlBody)
}
