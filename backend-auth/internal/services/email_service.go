package services

import (
	"bytes"
	"fmt"
	"net/smtp"
	"os"
)

type EmailService struct {
	smtpHost     string
	smtpPort     string
	smtpUsername string
	smtpPassword string
	fromEmail    string
	fromName     string
	templates    *EmailTemplates
}

func NewEmailService() *EmailService {
	return &EmailService{
		smtpHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		smtpPort:     getEnv("SMTP_PORT", "587"),
		smtpUsername: getEnv("SMTP_USERNAME", ""),
		smtpPassword: getEnv("SMTP_PASSWORD", ""),
		fromEmail:    getEnv("FROM_EMAIL", "noreply@busbooking.com"),
		fromName:     getEnv("FROM_NAME", "Bus Booking System"),
		templates:    NewEmailTemplates(),
	}
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}

// SendTicketEmail sends an e-ticket via email with PDF attachment
func (s *EmailService) SendTicketEmail(
	toEmail string,
	toName string,
	bookingReference string,
	ticketNumber string,
	pdfBytes []byte,
) error {
	// Skip sending if SMTP credentials not configured
	if s.smtpUsername == "" || s.smtpPassword == "" {
		fmt.Printf("SMTP not configured - skipping email for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Your E-Ticket - Booking %s", bookingReference)
	body := s.templates.TicketEmail(toName, bookingReference, ticketNumber)

	// Create message with attachment
	message := s.createEmailWithAttachment(
		toEmail,
		toName,
		subject,
		body,
		pdfBytes,
		fmt.Sprintf("ticket-%s.pdf", ticketNumber),
	)

	// Send email
	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	err := smtp.SendMail(
		addr,
		auth,
		s.fromEmail,
		[]string{toEmail},
		message,
	)

	if err != nil {
		return fmt.Errorf("failed to send email: %w", err)
	}

	fmt.Printf("E-ticket sent successfully to %s\n", toEmail)
	return nil
}

func (s *EmailService) createEmailWithAttachment(
	toEmail, toName, subject, htmlBody string,
	attachmentBytes []byte,
	attachmentName string,
) []byte {
	var buf bytes.Buffer

	boundary := "boundary-string-12345"

	// Email headers
	buf.WriteString(fmt.Sprintf("From: %s <%s>\r\n", s.fromName, s.fromEmail))
	buf.WriteString(fmt.Sprintf("To: %s <%s>\r\n", toName, toEmail))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString(fmt.Sprintf("Content-Type: multipart/mixed; boundary=%s\r\n", boundary))
	buf.WriteString("\r\n")

	// HTML body part
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	buf.WriteString("Content-Transfer-Encoding: quoted-printable\r\n")
	buf.WriteString("\r\n")
	buf.WriteString(htmlBody)
	buf.WriteString("\r\n")

	// PDF attachment part
	buf.WriteString(fmt.Sprintf("--%s\r\n", boundary))
	buf.WriteString("Content-Type: application/pdf\r\n")
	buf.WriteString(fmt.Sprintf("Content-Disposition: attachment; filename=\"%s\"\r\n", attachmentName))
	buf.WriteString("Content-Transfer-Encoding: base64\r\n")
	buf.WriteString("\r\n")

	// Encode PDF to base64
	b := make([]byte, len(attachmentBytes))
	copy(b, attachmentBytes)
	encoded := encodeBase64(b)
	buf.WriteString(encoded)
	buf.WriteString("\r\n")

	// Closing boundary
	buf.WriteString(fmt.Sprintf("--%s--\r\n", boundary))

	return buf.Bytes()
}

func encodeBase64(data []byte) string {
	const maxLineLength = 76
	encoded := ""

	// Simple base64 encoding
	alphabet := "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

	for i := 0; i < len(data); i += 3 {
		var b1, b2, b3 byte
		b1 = data[i]
		if i+1 < len(data) {
			b2 = data[i+1]
		}
		if i+2 < len(data) {
			b3 = data[i+2]
		}

		encoded += string(alphabet[(b1>>2)&0x3F])
		encoded += string(alphabet[((b1<<4)|(b2>>4))&0x3F])

		if i+1 < len(data) {
			encoded += string(alphabet[((b2<<2)|(b3>>6))&0x3F])
		} else {
			encoded += "="
		}

		if i+2 < len(data) {
			encoded += string(alphabet[b3&0x3F])
		} else {
			encoded += "="
		}

		// Add line breaks
		if len(encoded)%maxLineLength == 0 {
			encoded += "\r\n"
		}
	}

	return encoded
}

// SendBookingConfirmationEmail sends a simple confirmation without attachment
func (s *EmailService) SendBookingConfirmationEmail(
	toEmail string,
	toName string,
	bookingReference string,
) error {
	if s.smtpUsername == "" || s.smtpPassword == "" {
		fmt.Printf("SMTP not configured - skipping confirmation email for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Booking Confirmation - %s", bookingReference)
	body := s.templates.BookingConfirmationEmail(toName, bookingReference)

	message := s.createSimpleEmail(toEmail, toName, subject, body)

	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	return smtp.SendMail(addr, auth, s.fromEmail, []string{toEmail}, message)
}

func (s *EmailService) createSimpleEmail(toEmail, toName, subject, htmlBody string) []byte {
	var buf bytes.Buffer

	buf.WriteString(fmt.Sprintf("From: %s <%s>\r\n", s.fromName, s.fromEmail))
	buf.WriteString(fmt.Sprintf("To: %s <%s>\r\n", toName, toEmail))
	buf.WriteString(fmt.Sprintf("Subject: %s\r\n", subject))
	buf.WriteString("MIME-Version: 1.0\r\n")
	buf.WriteString("Content-Type: text/html; charset=UTF-8\r\n")
	buf.WriteString("\r\n")
	buf.WriteString(htmlBody)

	return buf.Bytes()
}

// SendHTMLEmail sends a simple HTML email without attachments
func (s *EmailService) SendHTMLEmail(toEmail, toName, subject, htmlBody string) error {
	if s.smtpUsername == "" || s.smtpPassword == "" {
		fmt.Printf("SMTP not configured - skipping email for %s\n", toEmail)
		return nil
	}

	message := s.createSimpleEmail(toEmail, toName, subject, htmlBody)

	auth := smtp.PlainAuth("", s.smtpUsername, s.smtpPassword, s.smtpHost)
	addr := fmt.Sprintf("%s:%s", s.smtpHost, s.smtpPort)

	return smtp.SendMail(addr, auth, s.fromEmail, []string{toEmail}, message)
}

// SendPaymentReceiptEmail sends payment receipt email
func (s *EmailService) SendPaymentReceiptEmail(
	toEmail, toName, bookingRef string,
	amount float64,
	transactionID string,
) error {
	if s.smtpUsername == "" || s.smtpPassword == "" {
		fmt.Printf("SMTP not configured - skipping payment receipt for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Payment Receipt - Booking %s", bookingRef)
	body := s.templates.PaymentReceiptEmail(toName, bookingRef, amount, transactionID)
	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

// SendTripReminderEmail sends trip reminder email
func (s *EmailService) SendTripReminderEmail(
	toEmail, toName, bookingRef, seatNumbers, departureTime, origin string,
) error {
	if s.smtpUsername == "" || s.smtpPassword == "" {
		fmt.Printf("SMTP not configured - skipping trip reminder for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Trip Reminder - %s", bookingRef)
	body := s.templates.TripReminderEmail(toName, bookingRef, seatNumbers, departureTime, origin)
	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

// SendCancellationEmail sends booking cancellation email
func (s *EmailService) SendCancellationEmail(
	toEmail, toName, bookingRef, reason string,
) error {
	if s.smtpUsername == "" || s.smtpPassword == "" {
		fmt.Printf("SMTP not configured - skipping cancellation email for %s\n", toEmail)
		return nil
	}

	subject := fmt.Sprintf("Booking Cancelled - %s", bookingRef)
	body := s.templates.CancellationEmail(toName, bookingRef, reason)
	return s.SendHTMLEmail(toEmail, toName, subject, body)
}
