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

	// Seed Buses
	var busCount int64
	db.Model(&entities.Bus{}).Count(&busCount)
	if busCount == 0 {
		buses := []entities.Bus{
			{
				ID:          uuid.New(),
				Name:        "VIP Express 01",
				PlateNumber: "29B-123.45",
				TotalSeats:  40,
				BusType:     "VIP",
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "Standard Bus A1",
				PlateNumber: "30A-456.78",
				TotalSeats:  45,
				BusType:     "Standard",
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "Sleeper Luxury 05",
				PlateNumber: "51C-789.01",
				TotalSeats:  36,
				BusType:     "Sleeper",
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
			{
				ID:          uuid.New(),
				Name:        "VIP Express 02",
				PlateNumber: "29B-234.56",
				TotalSeats:  40,
				BusType:     "VIP",
				Status:      entities.BusStatusActive,
				CreatedAt:   time.Now(),
				UpdatedAt:   time.Now(),
			},
		}

		for _, bus := range buses {
			if err := db.WithContext(ctx).Create(&bus).Error; err != nil {
				return err
			}
		}
		log.Println("Bus seed data created: 4 buses")
	}

	// Seed Routes
	var routeCount int64
	db.Model(&entities.Route{}).Count(&routeCount)
	if routeCount == 0 {
		routes := []entities.Route{
			{
				ID:              uuid.New(),
				Origin:          "Ho Chi Minh City",
				Destination:     "Da Nang",
				DurationMinutes: 720, // 12 hours
				BasePrice:       25.0,
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Hanoi",
				Destination:     "Hai Phong",
				DurationMinutes: 150, // 2.5 hours
				BasePrice:       10.0,
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
			{
				ID:              uuid.New(),
				Origin:          "Da Nang",
				Destination:     "Hue",
				DurationMinutes: 180, // 3 hours
				BasePrice:       12.0,
				IsActive:        true,
				CreatedAt:       time.Now(),
				UpdatedAt:       time.Now(),
			},
		}

		for _, route := range routes {
			if err := db.WithContext(ctx).Create(&route).Error; err != nil {
				return err
			}
		}
		log.Println("Route seed data created: 3 routes")
	}

	// Seed Trips
	var tripCount int64
	db.Model(&entities.Trip{}).Count(&tripCount)
	if tripCount == 0 {
		// Get first route and bus for assignment
		var firstRoute entities.Route
		var firstBus entities.Bus
		db.First(&firstRoute)
		db.First(&firstBus)

		// Create trips - some with buses assigned, some without
		now := time.Now()
		tomorrow := now.AddDate(0, 0, 1)
		nextWeek := now.AddDate(0, 0, 7)

		trips := []entities.Trip{
			{
				ID:        uuid.New(),
				RouteID:   firstRoute.ID,
				BusID:     &firstBus.ID, // Assigned
				StartTime: tomorrow.Add(8 * time.Hour),  // Tomorrow 8 AM
				EndTime:   tomorrow.Add(20 * time.Hour), // Tomorrow 8 PM
				Price:     25.0,
				Status:    entities.TripStatusScheduled,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			{
				ID:        uuid.New(),
				RouteID:   firstRoute.ID,
				BusID:     nil, // Not assigned yet
				StartTime: nextWeek.Add(9 * time.Hour),  // Next week 9 AM
				EndTime:   nextWeek.Add(21 * time.Hour), // Next week 9 PM
				Price:     25.0,
				Status:    entities.TripStatusScheduled,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
			{
				ID:        uuid.New(),
				RouteID:   firstRoute.ID,
				BusID:     nil, // Not assigned yet
				StartTime: nextWeek.Add(2 * 24 * time.Hour).Add(10 * time.Hour), // Next week + 2 days, 10 AM
				EndTime:   nextWeek.Add(2 * 24 * time.Hour).Add(22 * time.Hour), // Next week + 2 days, 10 PM
				Price:     25.0,
				Status:    entities.TripStatusScheduled,
				CreatedAt: time.Now(),
				UpdatedAt: time.Now(),
			},
		}

		for _, trip := range trips {
			if err := db.WithContext(ctx).Create(&trip).Error; err != nil {
				return err
			}
		}
		log.Println("Trip seed data created: 3 trips")
	}

	// Seed Route Stops
	var routeStopCount int64
	db.Model(&entities.RouteStop{}).Count(&routeStopCount)
	if routeStopCount == 0 {
		// Get routes to add stops
		var routes []entities.Route
		db.Find(&routes)

		if len(routes) > 0 {
			// HCM -> Da Nang route stops
			hcmDanangRoute := routes[0]
			routeStops := []entities.RouteStop{
				// Pickup points for HCM -> Da Nang
				{
					ID:         uuid.New(),
					RouteID:    hcmDanangRoute.ID,
					Name:       "Ben Xe Mien Dong",
					Type:       entities.RouteStopTypePickup,
					OrderIndex: 1,
					Address:    stringPtr("292 Dinh Bo Linh, Binh Thanh, Ho Chi Minh City"),
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				},
				{
					ID:         uuid.New(),
					RouteID:    hcmDanangRoute.ID,
					Name:       "Ben Xe Mien Tay",
					Type:       entities.RouteStopTypePickup,
					OrderIndex: 2,
					Address:    stringPtr("395 Kinh Duong Vuong, Binh Tan, Ho Chi Minh City"),
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				},
				// Dropoff points for HCM -> Da Nang
				{
					ID:         uuid.New(),
					RouteID:    hcmDanangRoute.ID,
					Name:       "Ben Xe Trung Tam Da Nang",
					Type:       entities.RouteStopTypeDropoff,
					OrderIndex: 1,
					Address:    stringPtr("200 Dien Bien Phu, Da Nang"),
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				},
				{
					ID:         uuid.New(),
					RouteID:    hcmDanangRoute.ID,
					Name:       "My Khe Beach Area",
					Type:       entities.RouteStopTypeDropoff,
					OrderIndex: 2,
					Address:    stringPtr("My Khe Beach, Ngu Hanh Son, Da Nang"),
					CreatedAt:  time.Now(),
					UpdatedAt:  time.Now(),
				},
			}

			// Add stops for second route if exists
			if len(routes) > 1 {
				hanoiHaiphongRoute := routes[1]
				routeStops = append(routeStops, []entities.RouteStop{
					// Pickup points for Hanoi -> Hai Phong
					{
						ID:         uuid.New(),
						RouteID:    hanoiHaiphongRoute.ID,
						Name:       "My Dinh Bus Station",
						Type:       entities.RouteStopTypePickup,
						OrderIndex: 1,
						Address:    stringPtr("My Dinh, Tu Liem, Hanoi"),
						CreatedAt:  time.Now(),
						UpdatedAt:  time.Now(),
					},
					{
						ID:         uuid.New(),
						RouteID:    hanoiHaiphongRoute.ID,
						Name:       "Giap Bat Bus Station",
						Type:       entities.RouteStopTypePickup,
						OrderIndex: 2,
						Address:    stringPtr("Giap Bat, Hoang Mai, Hanoi"),
						CreatedAt:  time.Now(),
						UpdatedAt:  time.Now(),
					},
					// Dropoff points for Hanoi -> Hai Phong
					{
						ID:         uuid.New(),
						RouteID:    hanoiHaiphongRoute.ID,
						Name:       "Hai Phong Central Station",
						Type:       entities.RouteStopTypeDropoff,
						OrderIndex: 1,
						Address:    stringPtr("Tam Bac, Hai Phong"),
						CreatedAt:  time.Now(),
						UpdatedAt:  time.Now(),
					},
					{
						ID:         uuid.New(),
						RouteID:    hanoiHaiphongRoute.ID,
						Name:       "Cat Bi Airport Area",
						Type:       entities.RouteStopTypeDropoff,
						OrderIndex: 2,
						Address:    stringPtr("Cat Bi, Hai An, Hai Phong"),
						CreatedAt:  time.Now(),
						UpdatedAt:  time.Now(),
					},
				}...)
			}

			for _, stop := range routeStops {
				if err := db.WithContext(ctx).Create(&stop).Error; err != nil {
					return err
				}
			}
			log.Printf("Route stop seed data created: %d stops", len(routeStops))
		}
	}

	log.Println("Seed data initialization complete")
	return nil
}

// Helper function to create string pointer
func stringPtr(s string) *string {
	return &s
}