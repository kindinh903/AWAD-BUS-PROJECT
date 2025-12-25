package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	postgresDriver "gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	_ "github.com/yourusername/bus-booking-auth/docs" // Swagger generated docs
	"github.com/yourusername/bus-booking-auth/internal/delivery/http/handlers"
	"github.com/yourusername/bus-booking-auth/internal/delivery/http/middleware"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"github.com/yourusername/bus-booking-auth/internal/repositories/postgres"
	"github.com/yourusername/bus-booking-auth/internal/services"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

// @title Bus Booking Auth Service API
// @version 1.0
// @description Authentication and Authorization microservice for bus booking system
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@busbooking.com

// @license.name MIT
// @license.url https://opensource.org/licenses/MIT

// @host localhost:8080
// @BasePath /api/v1
// @schemes http https

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Debug: check if Google Client ID is loaded
	googleClientID := os.Getenv("GOOGLE_CLIENT_ID")
	log.Printf("Loaded GOOGLE_CLIENT_ID: %s", googleClientID)

	// Initialize database
	db, err := initDatabase()
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Run migrations
	if err := runMigrations(db); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Run seed data
	if err := postgres.SeedData(db); err != nil {
		log.Printf("Failed to seed data: %v", err)
	}

	// Initialize dependencies
	container := initDependencies(db)

	// Setup Gin router
	router := setupRouter(container)

	// Start background services
	log.Println("Starting background services...")
	go container.NotificationQueue.Start()
	go container.BackgroundJobScheduler.Start()
	log.Println("Background services started")

	// Start HTTP server
	port := getEnv("PORT", "8080")
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Run server in a goroutine
	go func() {
		log.Printf("Auth Service starting on port %s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Graceful shutdown of background services
	log.Println("Stopping background services...")
	container.NotificationQueue.Stop()
	container.BackgroundJobScheduler.Stop()
	log.Println("Background services stopped")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited")
}

func initDatabase() (*gorm.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", "postgres"),
		getEnv("DB_NAME", "bus_booking"),
		getEnv("DB_SSL_MODE", "disable"),
	)

	db, err := gorm.Open(postgresDriver.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}

func runMigrations(db *gorm.DB) error {
	return db.AutoMigrate(
		&entities.User{},
		&entities.RefreshToken{},
		&entities.Bus{},
		&entities.Route{},
		&entities.Trip{},
		&entities.RouteStop{},
		&entities.SeatMap{},
		&entities.Seat{},
		&entities.Booking{},
		&entities.Passenger{},
		&entities.SeatReservation{},
		&entities.Ticket{},
		// Payment entities
		&entities.Payment{},
		&entities.PaymentWebhookLog{},
		// Notification entities
		&entities.Notification{},
		&entities.NotificationPreference{},
		// Analytics entities
		&entities.BookingAnalytics{},
		&entities.RouteAnalytics{},
		// Review entity
		&entities.Review{},
	)
}

type Container struct {
	// Repositories
	UserRepo              repositories.UserRepository
	RefreshTokenRepo      repositories.RefreshTokenRepository
	BusRepo               repositories.BusRepository
	RouteRepo             repositories.RouteRepository
	TripRepo              repositories.TripRepository
	RouteStopRepo         repositories.RouteStopRepository
	SeatMapRepo           repositories.SeatMapRepository
	BookingRepo           repositories.BookingRepository
	PassengerRepo         repositories.PassengerRepository
	SeatReservationRepo   repositories.SeatReservationRepository
	TicketRepo            repositories.TicketRepository
	PaymentRepo           repositories.PaymentRepository
	PaymentWebhookLogRepo repositories.PaymentWebhookLogRepository
	NotificationRepo      repositories.NotificationRepository
	NotificationPrefRepo  repositories.NotificationPreferenceRepository
	BookingAnalyticsRepo  repositories.BookingAnalyticsRepository
	RouteAnalyticsRepo    repositories.RouteAnalyticsRepository
	ReviewRepo            repositories.ReviewRepository

	// Services
	CacheService            *services.CacheService
	PaymentProvider         services.PaymentProvider
	EmailService            *services.EmailService
	NotificationTemplateEng *services.NotificationTemplateEngine
	NotificationQueue       *services.NotificationQueue
	BackgroundJobScheduler  *services.BackgroundJobScheduler
	ChatbotService          *services.ChatbotService

	// Usecases
	AuthUsecase      *usecases.AuthUsecase
	TripUsecase      *usecases.TripUsecase
	RouteStopUsecase *usecases.RouteStopUsecase
	SeatMapUsecase   *usecases.SeatMapUsecase
	BookingUsecase   *usecases.BookingUsecase
	PaymentUsecase   *usecases.PaymentUsecase
	AnalyticsUsecase *usecases.AnalyticsUsecase
	ReviewUsecase    *usecases.ReviewUsecase

	// Configuration
	JWTSecret string
}

func initDependencies(db *gorm.DB) *Container {
	// Repositories
	userRepo := postgres.NewUserRepository(db)
	refreshTokenRepo := postgres.NewRefreshTokenRepository(db)
	busRepo := postgres.NewBusRepository(db)
	routeRepo := postgres.NewRouteRepository(db)
	tripRepo := postgres.NewTripRepository(db)
	routeStopRepo := postgres.NewRouteStopRepository(db)
	seatMapRepo := postgres.NewSeatMapRepository(db)
	bookingRepo := postgres.NewBookingRepository(db)
	passengerRepo := postgres.NewPassengerRepository(db)
	seatReservationRepo := postgres.NewSeatReservationRepository(db)
	ticketRepo := postgres.NewTicketRepository(db)
	paymentRepo := postgres.NewPaymentRepository(db)
	paymentWebhookLogRepo := postgres.NewPaymentWebhookLogRepository(db)
	notificationRepo := postgres.NewNotificationRepository(db)
	notificationPrefRepo := postgres.NewNotificationPreferenceRepository(db)
	bookingAnalyticsRepo := postgres.NewBookingAnalyticsRepository(db)
	routeAnalyticsRepo := postgres.NewRouteAnalyticsRepository(db)
	reviewRepo := postgres.NewReviewRepository(db)

	// Initialize Cache Service
	cacheService, err := services.NewCacheService()
	if err != nil {
		log.Printf("Warning: Failed to initialize cache service: %v", err)
		cacheService = &services.CacheService{} // Create disabled cache service
	} else if cacheService.IsEnabled() {
		log.Println("Cache service initialized successfully")
	}

	// Configuration
	jwtSecret := getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-this-in-production")

	accessTokenExpiry, err := time.ParseDuration(getEnv("JWT_ACCESS_EXPIRY", "15m"))
	if err != nil {
		log.Printf("Failed to parse JWT_ACCESS_EXPIRY, using default 15m: %v", err)
		accessTokenExpiry = 15 * time.Minute
	}

	refreshTokenExpiry, err := time.ParseDuration(getEnv("JWT_REFRESH_EXPIRY", "7d"))
	if err != nil {
		log.Printf("Failed to parse JWT_REFRESH_EXPIRY, using default 7d: %v", err)
		refreshTokenExpiry = 7 * 24 * time.Hour
	}

	log.Printf("Token expiry times - Access: %v, Refresh: %v", accessTokenExpiry, refreshTokenExpiry)

	// Payment provider (mock or real based on env)
	paymentProvider := getPaymentProvider()

	// Email and notification services
	emailService := services.NewEmailService()
	notificationTemplateEng := services.NewNotificationTemplateEngine(emailService)
	notificationQueue := services.NewNotificationQueue(
		3,   // workers
		100, // queue size
		notificationRepo,
		emailService,
		notificationTemplateEng,
	)

	// Usecases
	authUsecase := usecases.NewAuthUsecase(userRepo, refreshTokenRepo, jwtSecret, accessTokenExpiry, refreshTokenExpiry)
	tripUsecase := usecases.NewTripUsecase(tripRepo, busRepo, routeRepo, cacheService)
	routeStopUsecase := usecases.NewRouteStopUsecase(routeStopRepo, routeRepo)
	seatMapUsecase := usecases.NewSeatMapUsecase(seatMapRepo, busRepo)
	bookingUsecase := usecases.NewBookingUsecase(bookingRepo, passengerRepo, seatReservationRepo, ticketRepo, tripRepo, seatMapRepo)
	paymentUsecase := usecases.NewPaymentUsecase(
		paymentRepo,
		paymentWebhookLogRepo,
		bookingRepo,
		notificationRepo,
		paymentProvider,
		notificationQueue,
		notificationTemplateEng,
	)
	analyticsUsecase := usecases.NewAnalyticsUsecase(
		bookingRepo,
		bookingAnalyticsRepo,
		routeAnalyticsRepo,
		tripRepo,
		routeRepo,
	)

	reviewUsecase := usecases.NewReviewUsecase(
		reviewRepo,
		bookingRepo,
		tripRepo,
	)

	// Chatbot service
	chatbotService, err := services.NewChatbotService()
	if err != nil {
		log.Printf("Warning: Failed to initialize chatbot service: %v", err)
		log.Println("Chatbot features will be unavailable")
	}

	// Background job scheduler
	backgroundJobs := services.NewBackgroundJobScheduler(
		bookingRepo,
		paymentRepo,
		notificationRepo,
		notificationPrefRepo,
		bookingAnalyticsRepo,
		routeAnalyticsRepo,
		tripRepo,
		notificationQueue,
		notificationTemplateEng,
		emailService,
	)

	return &Container{
		UserRepo:                userRepo,
		RefreshTokenRepo:        refreshTokenRepo,
		BusRepo:                 busRepo,
		RouteRepo:               routeRepo,
		TripRepo:                tripRepo,
		RouteStopRepo:           routeStopRepo,
		SeatMapRepo:             seatMapRepo,
		BookingRepo:             bookingRepo,
		PassengerRepo:           passengerRepo,
		SeatReservationRepo:     seatReservationRepo,
		TicketRepo:              ticketRepo,
		PaymentRepo:             paymentRepo,
		PaymentWebhookLogRepo:   paymentWebhookLogRepo,
		NotificationRepo:        notificationRepo,
		NotificationPrefRepo:    notificationPrefRepo,
		BookingAnalyticsRepo:    bookingAnalyticsRepo,
		RouteAnalyticsRepo:      routeAnalyticsRepo,
		ReviewRepo:              reviewRepo,
		CacheService:            cacheService,
		PaymentProvider:         paymentProvider,
		EmailService:            emailService,
		NotificationTemplateEng: notificationTemplateEng,
		NotificationQueue:       notificationQueue,
		BackgroundJobScheduler:  backgroundJobs,
		ChatbotService:          chatbotService,
		AuthUsecase:             authUsecase,
		TripUsecase:             tripUsecase,
		RouteStopUsecase:        routeStopUsecase,
		SeatMapUsecase:          seatMapUsecase,
		BookingUsecase:          bookingUsecase,
		PaymentUsecase:          paymentUsecase,
		AnalyticsUsecase:        analyticsUsecase,
		ReviewUsecase:           reviewUsecase,
		JWTSecret:               jwtSecret,
	}
}

// getPaymentProvider returns the appropriate payment provider based on environment
func getPaymentProvider() services.PaymentProvider {
	useMock := os.Getenv("USE_MOCK_PAYMENT") == "true"

	if useMock {
		log.Println("Using mock payment provider")
		return services.NewMockPaymentService()
	}

	log.Println("Using PayOS payment provider")
	return services.NewPayOSService(
		os.Getenv("PAYOS_CLIENT_ID"),
		os.Getenv("PAYOS_API_KEY"),
		os.Getenv("PAYOS_CHECKSUM_KEY"),
	)
}

func setupRouter(container *Container) *gin.Engine {
	if getEnv("ENV", "development") == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(middleware.CORS())

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok", "service": "auth"})
	})

	// Swagger documentation
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// API v1
	v1 := router.Group("/api/v1")
	{
		// Auth routes (public)
		auth := v1.Group("/auth")
		{
			authHandler := handlers.NewAuthHandler(container.AuthUsecase)
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.POST("/refresh", authHandler.RefreshToken)
			auth.POST("/logout", authHandler.Logout)
			auth.GET("/google", authHandler.GoogleLogin)
			auth.POST("/google/callback", authHandler.GoogleCallback)
			auth.GET("/github", authHandler.GitHubLogin)
			auth.GET("/github/callback", authHandler.GitHubCallback)
		}

		// Protected routes (require authentication)
		authorized := v1.Group("")
		authorized.Use(middleware.AuthMiddleware(container.JWTSecret))
		{
			// User profile routes
			profile := authorized.Group("/profile")
			{
				profile.GET("", func(c *gin.Context) {
					userID, _ := c.Get("user_id")
					email, _ := c.Get("user_email")
					role, _ := c.Get("user_role")
					c.JSON(200, gin.H{
						"user_id": userID,
						"email":   email,
						"role":    role,
					})
				})
			}

			// Admin routes (require admin role)
			admin := authorized.Group("/admin")
			admin.Use(middleware.RequireRole("admin"))
			{
				adminHandler := handlers.NewAdminHandler(container.TripUsecase, container.BookingUsecase)
				busHandler := handlers.NewBusHandler(container.BusRepo)
				routeHandler := handlers.NewRouteHandler(container.RouteRepo)
				routeStopHandler := handlers.NewRouteStopHandler(container.RouteStopUsecase)
				seatMapHandler := handlers.NewSeatMapHandler(container.SeatMapUsecase)

				// Bus management
				admin.GET("/buses", busHandler.GetAllBuses)
				admin.POST("/buses", busHandler.CreateBus)
				admin.GET("/buses/:id", busHandler.GetBusByID)
				admin.PUT("/buses/:id", busHandler.UpdateBus)
				admin.DELETE("/buses/:id", busHandler.DeleteBus)
				admin.POST("/buses/assign-seat-map", seatMapHandler.AssignSeatMapToBus)

				// Route management
				admin.GET("/routes", routeHandler.GetAllRoutes)
				admin.POST("/routes", routeHandler.CreateRoute)
				admin.GET("/routes/:id", routeHandler.GetRouteByID)
				admin.PUT("/routes/:id", routeHandler.UpdateRoute)
				admin.DELETE("/routes/:id", routeHandler.DeleteRoute)
				admin.POST("/routes/:id/stops", routeStopHandler.CreateStop)
				admin.PUT("/routes/:id/stops/:stopId", routeStopHandler.UpdateStop)
				admin.DELETE("/routes/:id/stops/:stopId", routeStopHandler.DeleteStop)

				// Trip management
				admin.GET("/trips", adminHandler.GetAllTrips)
				admin.POST("/trips", adminHandler.CreateTrip)
				admin.PUT("/trips/:id", adminHandler.UpdateTrip)
				admin.DELETE("/trips/:id", adminHandler.DeleteTrip)
				admin.POST("/trips/assign-bus", adminHandler.AssignBus)

				// Seat map management
				admin.GET("/seat-maps", seatMapHandler.GetAllSeatMaps)
				admin.GET("/seat-maps/configs", seatMapHandler.GetSeatTypeConfigs)
				admin.POST("/seat-maps", seatMapHandler.CreateSeatMap)
				admin.GET("/seat-maps/:id", seatMapHandler.GetSeatMap)
				admin.PUT("/seat-maps/:id", seatMapHandler.UpdateSeatMap)
				admin.DELETE("/seat-maps/:id", seatMapHandler.DeleteSeatMap)
				admin.PUT("/seat-maps/:id/seats", seatMapHandler.BulkUpdateSeats)
				admin.POST("/seat-maps/:id/regenerate", seatMapHandler.RegenerateSeatLayout)

				// Analytics routes (admin only)
				analyticsHandler := handlers.NewAnalyticsHandler(container.AnalyticsUsecase)
				handlers.RegisterAnalyticsRoutes(admin, analyticsHandler, middleware.RequireRole("admin"))

				// User management (admin only)
				userMgmtHandler := handlers.NewUserManagementHandler(container.AuthUsecase)
				admin.GET("/users", userMgmtHandler.ListAdmins)
				admin.POST("/users", userMgmtHandler.CreateAdmin)
				admin.GET("/users/:id", userMgmtHandler.GetUser)
				admin.PUT("/users/:id", userMgmtHandler.UpdateUser)
				admin.DELETE("/users/:id", userMgmtHandler.DeactivateUser)

				// Trip operations (admin only)
				tripOpHandler := handlers.NewTripHandler(container.TripUsecase)
				admin.PUT("/trips/:id/status", tripOpHandler.UpdateTripStatus)
				admin.GET("/trips/:id/passengers", adminHandler.GetTripPassengers)
				admin.POST("/trips/:id/passengers/:passengerId/check-in", adminHandler.CheckInPassenger)
			}

			// Protected review routes (authenticated users)
			reviewHandler := handlers.NewReviewHandler(container.ReviewUsecase)
			authorized.POST("/trips/:id/reviews", reviewHandler.CreateReview)
			authorized.GET("/reviews/my-reviews", reviewHandler.GetUserReviews)
			authorized.PUT("/reviews/:id", reviewHandler.UpdateReview)
			authorized.DELETE("/reviews/:id", reviewHandler.DeleteReview)
		}

		// Payment routes (uses RegisterPaymentRoutes helper which handles auth internally)
		paymentHandler := handlers.NewPaymentHandler(container.PaymentUsecase)
		handlers.RegisterPaymentRoutes(v1, paymentHandler, middleware.AuthMiddleware(container.JWTSecret))

		// Public route endpoints (no auth required)
		routes := v1.Group("/routes")
		{
			routeStopHandler := handlers.NewRouteStopHandler(container.RouteStopUsecase)
			routes.GET("/:id", routeStopHandler.GetRouteWithStops)
		}

		// Public trip search
		trips := v1.Group("/trips")
		{
			tripHandler := handlers.NewTripHandler(container.TripUsecase)
			reviewHandler := handlers.NewReviewHandler(container.ReviewUsecase)

			trips.GET("/search", tripHandler.SearchTrips)
			trips.GET("/:id", tripHandler.GetTripByID)
			trips.GET("/:id/related", tripHandler.GetRelatedTrips)

			// Reviews (GET is public, POST requires auth)
			trips.GET("/:id/reviews", reviewHandler.GetTripReviews)

			// Booking-related trip endpoints
			bookingHandler := handlers.NewBookingHandler(container.BookingUsecase)
			trips.GET("/:id/seats", bookingHandler.GetAvailableSeats)
			trips.GET("/:id/seats/status", bookingHandler.GetSeatsWithStatus)
		}

		// Booking routes (public - supports guest checkout)
		bookings := v1.Group("/bookings")
		{
			bookingHandler := handlers.NewBookingHandler(container.BookingUsecase)
			bookings.POST("/reserve", bookingHandler.ReserveSeats)
			bookings.DELETE("/release", bookingHandler.ReleaseSeats)
			bookings.POST("", bookingHandler.CreateBooking)
			bookings.GET("/ref/:reference", bookingHandler.GetBookingByReference)
			bookings.GET("/guest", bookingHandler.GetGuestBookings)
			bookings.POST("/:id/confirm", bookingHandler.ConfirmBooking)
			bookings.POST("/:id/cancel", bookingHandler.CancelBooking)
			bookings.GET("/:id/tickets/download", bookingHandler.DownloadBookingTickets)
			bookings.POST("/:id/resend-tickets", bookingHandler.ResendTicketEmail)
		}

		// Ticket routes (public)
		tickets := v1.Group("/tickets")
		{
			bookingHandler := handlers.NewBookingHandler(container.BookingUsecase)
			tickets.GET("/:id/download", bookingHandler.DownloadTicket)
		}

		// Chatbot routes (public)
		if container.ChatbotService != nil && container.ChatbotService.IsEnabled() {
			chatbot := v1.Group("/chatbot")
			{
				chatbotHandler := handlers.NewChatbotHandler(container.ChatbotService)
				chatbot.POST("/message", chatbotHandler.SendMessage)
				chatbot.GET("/health", chatbotHandler.HealthCheck)
			}
		}

		// Protected booking routes (authenticated users)
		authorizedBookings := authorized.Group("/bookings")
		{
			bookingHandler := handlers.NewBookingHandler(container.BookingUsecase)
			authorizedBookings.GET("/my-bookings", bookingHandler.GetUserBookings)
		}
	}

	return router
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
