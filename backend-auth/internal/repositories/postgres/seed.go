package postgres

import (
	"context"
	"log"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"github.com/yourusername/bus-booking-auth/internal/entities"
)

// SeedData creates default admin and user accounts, and sample buses, routes, and trips
func SeedData(db *gorm.DB) error {
	ctx := context.Background()
	
	// Check if admin user already exists
	var adminCount int64
	db.Model(&entities.User{}).Where("role = ?", entities.RoleAdmin).Count(&adminCount)
	if adminCount > 0 {
		log.Println("Admin user already exists, skipping user seed")
	} else {
		// Create admin user
		adminPassword, err := bcrypt.GenerateFromPassword([]byte("admin123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		adminUser := &entities.User{
			ID:           uuid.New(),
			Name:         "System Administrator",
			Email:        "admin@busproject.com",
			PasswordHash: string(adminPassword),
			Phone:        "+84901234567",
			Role:         entities.RoleAdmin,
			IsActive:     true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := db.WithContext(ctx).Create(adminUser).Error; err != nil {
			return err
		}

		// Create regular user
		userPassword, err := bcrypt.GenerateFromPassword([]byte("user123"), bcrypt.DefaultCost)
		if err != nil {
			return err
		}

		regularUser := &entities.User{
			ID:           uuid.New(),
			Name:         "John Doe",
			Email:        "user@busproject.com",
			PasswordHash: string(userPassword),
			Phone:        "+84907654321",
			Role:         entities.RolePassenger,
			IsActive:     true,
			CreatedAt:    time.Now(),
			UpdatedAt:    time.Now(),
		}

		if err := db.WithContext(ctx).Create(regularUser).Error; err != nil {
			return err
		}

		log.Println("User seed data created:")
		log.Println("Admin: admin@busproject.com / admin123")
		log.Println("User: user@busproject.com / user123")
	}

	// Seed Seat Maps first (needed for buses)
	var seatMapCount int64
	db.Model(&entities.SeatMap{}).Count(&seatMapCount)
	
	var seatMaps []entities.SeatMap
	if seatMapCount == 0 {
		seatMaps = []entities.SeatMap{
			{
				ID:          uuid.New(),
				Name:        "Standard 40-Seater",
				Description: stringPtr("Standard bus layout with 10 rows x 4 columns"),
				Rows:        10,
				Columns:     4,
				TotalSeats:  40,
				BusType:     "Standard",
				IsActive:    true,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "VIP 32-Seater",
				Description: stringPtr("VIP bus with extra legroom, 8 rows x 4 columns"),
				Rows:        8,
				Columns:     4,
				TotalSeats:  32,
				BusType:     "VIP",
				IsActive:    true,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "Sleeper 24-Bed",
				Description: stringPtr("Sleeper bus with lie-flat beds, 6 rows x 4 columns"),
				Rows:        6,
				Columns:     4,
				TotalSeats:  24,
				BusType:     "Sleeper",
				IsActive:    true,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
		}

		for i := range seatMaps {
			if err := db.WithContext(ctx).Create(&seatMaps[i]).Error; err != nil {
				return err
			}
			
			// Generate seats for each seat map
			seats := generateSeatsForMap(&seatMaps[i])
			for _, seat := range seats {
				if err := db.WithContext(ctx).Create(seat).Error; err != nil {
					return err
				}
			}
		}
		log.Printf("Seat map seed data created: %d seat maps with seats", len(seatMaps))
	} else {
		// Load existing seat maps
		db.Find(&seatMaps)
	}

	// Seed Buses
	var busCount int64
	db.Model(&entities.Bus{}).Count(&busCount)
	
	var buses []entities.Bus
	if busCount == 0 {
		// Get seat map IDs
		var standardMapID, vipMapID, sleeperMapID *uuid.UUID
		for i := range seatMaps {
			switch seatMaps[i].BusType {
			case "Standard":
				standardMapID = &seatMaps[i].ID
			case "VIP":
				vipMapID = &seatMaps[i].ID
			case "Sleeper":
				sleeperMapID = &seatMaps[i].ID
			}
		}

		buses = []entities.Bus{
			{
				ID:          uuid.New(),
				Name:        "VIP Express 01",
				PlateNumber: "29B-123.45",
				TotalSeats:  32,
				BusType:     "VIP",
				SeatMapID:   vipMapID,
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "Standard Bus A1",
				PlateNumber: "30A-456.78",
				TotalSeats:  40,
				BusType:     "Standard",
				SeatMapID:   standardMapID,
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "Sleeper Luxury 05",
				PlateNumber: "51C-789.01",
				TotalSeats:  24,
				BusType:     "Sleeper",
				SeatMapID:   sleeperMapID,
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "VIP Express 02",
				PlateNumber: "29B-234.56",
				TotalSeats:  32,
				BusType:     "VIP",
				SeatMapID:   vipMapID,
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "Standard Bus B2",
				PlateNumber: "51D-345.67",
				TotalSeats:  40,
				BusType:     "Standard",
				SeatMapID:   standardMapID,
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
		}

		for i := range buses {
			if err := db.WithContext(ctx).Create(&buses[i]).Error; err != nil {
				return err
			}
		}
		log.Printf("Bus seed data created: %d buses", len(buses))
	} else {
		db.Find(&buses)
	}

	// Seed Routes with VND prices
	var routeCount int64
	db.Model(&entities.Route{}).Count(&routeCount)
	
	var routes []entities.Route
	if routeCount == 0 {
		routes = []entities.Route{
			{
				ID:              uuid.New(),
				Origin:          "Ho Chi Minh City",
				Destination:     "Da Nang",
				DurationMinutes: 720, // 12 hours
				BasePrice:       350000, // 350,000 VND
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Hanoi",
				Destination:     "Hai Phong",
				DurationMinutes: 150, // 2.5 hours
				BasePrice:       120000, // 120,000 VND
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Da Nang",
				Destination:     "Hue",
				DurationMinutes: 180, // 3 hours
				BasePrice:       80000, // 80,000 VND
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Ho Chi Minh City",
				Destination:     "Vung Tau",
				DurationMinutes: 120, // 2 hours
				BasePrice:       90000, // 90,000 VND
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Hanoi",
				Destination:     "Ha Long",
				DurationMinutes: 240, // 4 hours
				BasePrice:       150000, // 150,000 VND
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Ho Chi Minh City",
				Destination:     "Can Tho",
				DurationMinutes: 210, // 3.5 hours
				BasePrice:       130000, // 130,000 VND
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Ho Chi Minh City",
				Destination:     "Da Lat",
				DurationMinutes: 420, // 7 hours
				BasePrice:       200000, // 200,000 VND
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Ho Chi Minh City",
				Destination:     "Nha Trang",
				DurationMinutes: 540, // 9 hours
				BasePrice:       280000, // 280,000 VND
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
		}

		for i := range routes {
			if err := db.WithContext(ctx).Create(&routes[i]).Error; err != nil {
				return err
			}
		}
		log.Printf("Route seed data created: %d routes", len(routes))
	} else {
		db.Find(&routes)
	}

	// Seed Trips
	var tripCount int64
	db.Model(&entities.Trip{}).Count(&tripCount)
	if tripCount == 0 {
		if len(routes) == 0 || len(buses) == 0 {
			log.Println("No routes or buses found, skipping trip seed")
			return nil
		}

		// Create trips for today, tomorrow, and next week
		now := time.Now()
		today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())
		
		var trips []entities.Trip
		
		// Create multiple trips per route
		departureHours := []int{6, 8, 10, 14, 18, 22} // Different departure times
		
		for _, route := range routes {
			for dayOffset := 0; dayOffset <= 7; dayOffset++ {
				tripDate := today.AddDate(0, 0, dayOffset)
				
				for i, hour := range departureHours {
					// Assign buses in rotation
					busIndex := (i + dayOffset) % len(buses)
					busID := buses[busIndex].ID
					
					startTime := tripDate.Add(time.Duration(hour) * time.Hour)
					endTime := startTime.Add(time.Duration(route.DurationMinutes) * time.Minute)
					
					// Add price variation based on bus type
					priceMultiplier := 1.0
					switch buses[busIndex].BusType {
					case "VIP":
						priceMultiplier = 1.5
					case "Sleeper":
						priceMultiplier = 2.0
					}
					
					trip := entities.Trip{
						ID:        uuid.New(),
						RouteID:   route.ID,
						BusID:     &busID,
						StartTime: startTime,
						EndTime:   endTime,
						Price:     route.BasePrice * priceMultiplier,
						Status:    entities.TripStatusScheduled,
						CreatedAt: time.Now(),
						UpdatedAt: time.Now(),
					}
					trips = append(trips, trip)
				}
			}
		}

		for i := range trips {
			if err := db.WithContext(ctx).Create(&trips[i]).Error; err != nil {
				return err
			}
		}
		log.Printf("Trip seed data created: %d trips", len(trips))
	}

	// Seed Route Stops
	var routeStopCount int64
	db.Model(&entities.RouteStop{}).Count(&routeStopCount)
	if routeStopCount == 0 && len(routes) > 0 {
		routeStops := []entities.RouteStop{}
		
		for _, route := range routes {
			// Add pickup and dropoff stops for each route
			routeStops = append(routeStops, entities.RouteStop{
				ID:         uuid.New(),
				RouteID:    route.ID,
				Name:       "Ben Xe " + route.Origin,
				Type:       entities.RouteStopTypePickup,
				OrderIndex: 1,
				Address:    stringPtr("Central Bus Station, " + route.Origin),
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			})
			routeStops = append(routeStops, entities.RouteStop{
				ID:         uuid.New(),
				RouteID:    route.ID,
				Name:       "Ben Xe " + route.Destination,
				Type:       entities.RouteStopTypeDropoff,
				OrderIndex: 1,
				Address:    stringPtr("Central Bus Station, " + route.Destination),
				CreatedAt:  time.Now(),
				UpdatedAt:  time.Now(),
			})
		}

		for i := range routeStops {
			if err := db.WithContext(ctx).Create(&routeStops[i]).Error; err != nil {
				return err
			}
		}
		log.Printf("Route stop seed data created: %d stops", len(routeStops))
	}

	log.Println("Seed data initialization complete")
	return nil
}

// generateSeatsForMap creates seats for a seat map
func generateSeatsForMap(sm *entities.SeatMap) []*entities.Seat {
	seats := make([]*entities.Seat, 0)

	for row := 1; row <= sm.Rows; row++ {
		for col := 0; col < sm.Columns; col++ {
			// Determine position based on column
			var position entities.SeatPosition
			if sm.Columns == 4 {
				switch col {
				case 0:
					position = entities.SeatPositionLeft
				case 1:
					position = entities.SeatPositionMiddle
				case 2:
					position = entities.SeatPositionMiddle
				case 3:
					position = entities.SeatPositionRight
				}
			} else {
				position = entities.SeatPositionMiddle
			}

			// Generate seat label (e.g., "1A", "1B")
			seatLabel := generateSeatLabel(row, col)

			// Determine seat type and price multiplier
			seatType := entities.SeatTypeStandard
			priceMultiplier := 1.0
			
			// First row gets premium pricing
			if row == 1 {
				seatType = entities.SeatTypeVIP
				priceMultiplier = 1.2
			}
			// Window seats get slight premium
			if col == 0 || col == sm.Columns-1 {
				priceMultiplier += 0.1
			}

			seat := &entities.Seat{
				ID:              uuid.New(),
				SeatMapID:       sm.ID,
				SeatNumber:      seatLabel,
				Row:             row,
				Column:          col,
				SeatType:        seatType,
				Position:        position,
				PriceMultiplier: priceMultiplier,
				IsBookable:      true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			}

			seats = append(seats, seat)
		}
	}

	return seats
}

// generateSeatLabel creates a seat label like "1A", "2B"
func generateSeatLabel(row, col int) string {
	colLabels := []string{"A", "B", "C", "D", "E", "F"}
	if col < len(colLabels) {
		return string(rune('0'+row)) + colLabels[col]
	}
	return string(rune('0'+row)) + string(rune('A'+col))
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}
