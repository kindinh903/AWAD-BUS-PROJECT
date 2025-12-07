package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/jung-kurt/gofpdf"
	"github.com/skip2/go-qrcode"
	"github.com/yourusername/bus-booking-auth/internal/entities"
)

type TicketService struct{}

func NewTicketService() *TicketService {
	return &TicketService{}
}

// GenerateQRCode creates a QR code containing ticket verification data
func (s *TicketService) GenerateQRCode(ticket *entities.Ticket) (string, error) {
	// QR code contains: TicketNumber|BookingID|PassengerName|TripID
	data := fmt.Sprintf("%s|%s|%s|%s",
		ticket.TicketNumber,
		ticket.BookingID.String(),
		ticket.PassengerName,
		ticket.TripID.String(),
	)

	// Generate QR code as PNG bytes
	qrBytes, err := qrcode.Encode(data, qrcode.Medium, 256)
	if err != nil {
		return "", fmt.Errorf("failed to generate QR code: %w", err)
	}

	// Encode to base64
	qrBase64 := base64.StdEncoding.EncodeToString(qrBytes)
	return qrBase64, nil
}

// GenerateBarcode creates a simple barcode representation (Code 128 format)
func (s *TicketService) GenerateBarcode(ticketNumber string) string {
	// Return ticket number as barcode data (can be enhanced with actual barcode generation)
	return ticketNumber
}

// GenerateTicketPDF creates a PDF ticket with all details
func (s *TicketService) GenerateTicketPDF(
	ticket *entities.Ticket,
	booking *entities.Booking,
	trip *entities.Trip,
	passenger *entities.Passenger,
) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Set up fonts
	pdf.SetFont("Arial", "B", 24)

	// Header - Company Name
	pdf.SetFillColor(41, 128, 185) // Blue background
	pdf.SetTextColor(255, 255, 255)
	pdf.CellFormat(190, 15, "BUS BOOKING SYSTEM", "", 1, "C", true, 0, "")
	pdf.Ln(5)

	// E-Ticket Title
	pdf.SetFont("Arial", "B", 18)
	pdf.SetTextColor(0, 0, 0)
	pdf.Cell(190, 10, "E-TICKET")
	pdf.Ln(15)

	// Ticket Number
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(50, 8, "Ticket Number:")
	pdf.SetFont("Arial", "", 14)
	pdf.Cell(140, 8, ticket.TicketNumber)
	pdf.Ln(10)

	// Booking Reference
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(50, 8, "Booking Ref:")
	pdf.SetFont("Arial", "", 14)
	pdf.Cell(140, 8, booking.BookingReference)
	pdf.Ln(15)

	// Trip Details Section
	pdf.SetFont("Arial", "B", 16)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(190, 10, "Trip Details", "", 1, "L", true, 0, "")
	pdf.Ln(5)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(50, 8, "Route:")
	pdf.SetFont("Arial", "", 12)
	routeInfo := fmt.Sprintf("%s to %s", trip.Route.Origin, trip.Route.Destination)
	if trip.Route != nil {
		pdf.Cell(140, 8, routeInfo)
	}
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(50, 8, "Departure:")
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(140, 8, trip.StartTime.Format("Mon, Jan 02, 2006 at 3:04 PM"))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(50, 8, "Arrival:")
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(140, 8, trip.EndTime.Format("Mon, Jan 02, 2006 at 3:04 PM"))
	pdf.Ln(8)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(50, 8, "Seat Number:")
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(140, 8, ticket.SeatNumber)
	pdf.Ln(15)

	// Passenger Details Section
	pdf.SetFont("Arial", "B", 16)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(190, 10, "Passenger Details", "", 1, "L", true, 0, "")
	pdf.Ln(5)

	pdf.SetFont("Arial", "B", 12)
	pdf.Cell(50, 8, "Name:")
	pdf.SetFont("Arial", "", 12)
	pdf.Cell(140, 8, passenger.FullName)
	pdf.Ln(8)

	if passenger.IDNumber != nil && *passenger.IDNumber != "" {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(50, 8, "ID Number:")
		pdf.SetFont("Arial", "", 12)
		pdf.Cell(140, 8, *passenger.IDNumber)
		pdf.Ln(8)
	}

	if passenger.Phone != nil && *passenger.Phone != "" {
		pdf.SetFont("Arial", "B", 12)
		pdf.Cell(50, 8, "Phone:")
		pdf.SetFont("Arial", "", 12)
		pdf.Cell(140, 8, *passenger.Phone)
		pdf.Ln(8)
	}

	pdf.Ln(10)

	// QR Code Section
	if ticket.QRCode != nil && *ticket.QRCode != "" {
		pdf.SetFont("Arial", "B", 14)
		pdf.Cell(190, 8, "Scan this QR code for verification:")
		pdf.Ln(10)

		// Decode base64 QR code
		qrBytes, err := base64.StdEncoding.DecodeString(*ticket.QRCode)
		if err == nil {
			// Create temporary image from bytes
			imgReader := bytes.NewReader(qrBytes)
			imgOptions := gofpdf.ImageOptions{
				ImageType: "PNG",
				ReadDpi:   true,
			}
			pdf.RegisterImageOptionsReader("qrcode", imgOptions, imgReader)
			pdf.ImageOptions("qrcode", 70, pdf.GetY(), 50, 50, false, imgOptions, 0, "")
			pdf.Ln(55)
		}
	}

	// Footer - Important Information
	pdf.Ln(10)
	pdf.SetFont("Arial", "I", 10)
	pdf.SetTextColor(100, 100, 100)
	pdf.MultiCell(190, 5, "IMPORTANT: Please arrive at the departure point at least 15 minutes before departure time. This ticket is non-transferable and must be presented along with a valid ID.", "", "L", false)
	pdf.Ln(5)
	pdf.Cell(190, 5, fmt.Sprintf("Generated on: %s", time.Now().Format("Jan 02, 2006 at 3:04 PM")))

	// Generate PDF bytes
	var buf bytes.Buffer
	err := pdf.Output(&buf)
	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return buf.Bytes(), nil
}
