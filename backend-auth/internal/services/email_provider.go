package services

// EmailProvider defines the interface for sending emails
type EmailProvider interface {
	SendTicketEmail(toEmail, toName, bookingReference, ticketNumber string, pdfBytes []byte) error
	SendBookingConfirmationEmail(toEmail, toName, bookingReference string) error
	SendHTMLEmail(toEmail, toName, subject, htmlBody string) error
	SendPaymentReceiptEmail(toEmail, toName, bookingRef string, amount float64, transactionID string) error
	SendTripReminderEmail(toEmail, toName, bookingRef, seatNumbers, departureTime, origin string) error
	SendCancellationEmail(toEmail, toName, bookingRef, reason string) error
}
