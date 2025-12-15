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
}

func NewEmailService() *EmailService {
	return &EmailService{
		smtpHost:     getEnv("SMTP_HOST", "smtp.gmail.com"),
		smtpPort:     getEnv("SMTP_PORT", "587"),
		smtpUsername: getEnv("SMTP_USERNAME", ""),
		smtpPassword: getEnv("SMTP_PASSWORD", ""),
		fromEmail:    getEnv("FROM_EMAIL", "noreply@busbooking.com"),
		fromName:     getEnv("FROM_NAME", "Bus Booking System"),
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

	// Create email body
	body := s.createTicketEmailBody(toName, bookingReference, ticketNumber)

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

func (s *EmailService) createTicketEmailBody(toName, bookingRef, ticketNumber string) string {
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
            <h1>Bus Booking System</h1>
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
                <p>&copy; 2024 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, bookingRef, ticketNumber)
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
	body := s.createPaymentReceiptTemplate(toName, bookingRef, amount, transactionID)

	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

func (s *EmailService) createPaymentReceiptTemplate(toName, bookingRef string, amount float64, txID string) string {
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
            <h1>Payment Successful!</h1>
        </div>
        <div class="content">
            <p>Dear %s,</p>
            
            <p>We have successfully received your payment. Thank you for your booking!</p>
            
            <div class="amount">$%.2f USD</div>
            
            <div class="payment-details">
                <h3>Payment Details</h3>
                <p><strong>Booking Reference:</strong> %s</p>
                <p><strong>Transaction ID:</strong> %s</p>
                <p><strong>Payment Status:</strong> <span style="color: #27ae60;">COMPLETED</span></p>
            </div>
            
            <p>Your e-tickets have been sent to your email. You can also download them from your booking history.</p>
            
            <p>Have a safe journey!</p>
            
            <div class="footer">
                <p>This is an automated receipt. Please keep it for your records.</p>
                <p>&copy; 2024 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, amount, bookingRef, txID)
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
	body := s.createTripReminderTemplate(toName, bookingRef, seatNumbers, departureTime, origin)

	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

func (s *EmailService) createTripReminderTemplate(toName, bookingRef, seats, departureTime, origin string) string {
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
                <p>&copy; 2024 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, bookingRef, seats, departureTime, origin)
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
	body := s.createCancellationTemplate(toName, bookingRef, reason)

	return s.SendHTMLEmail(toEmail, toName, subject, body)
}

func (s *EmailService) createCancellationTemplate(toName, bookingRef, reason string) string {
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
                <p>&copy; 2024 Bus Booking System. All rights reserved.</p>
            </div>
        </div>
    </div>
</body>
</html>
`, toName, bookingRef, reason)
}
