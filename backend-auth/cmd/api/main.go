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

	"github.com/yourusername/bus-booking-auth/internal/delivery/http/handlers"
	"github.com/yourusername/bus-booking-auth/internal/delivery/http/middleware"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"github.com/yourusername/bus-booking-auth/internal/repositories/postgres"
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

	// Start HTTP server
	port := getEnv("PORT", "8080")
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", port),
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
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
	)
}

type Container struct {
	// Repositories
	UserRepo          repositories.UserRepository
	RefreshTokenRepo  repositories.RefreshTokenRepository

	// Usecases
	AuthUsecase *usecases.AuthUsecase

	// Configuration
	JWTSecret string
}

func initDependencies(db *gorm.DB) *Container {
	// Repositories
	userRepo := postgres.NewUserRepository(db)
	refreshTokenRepo := postgres.NewRefreshTokenRepository(db)

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

	// Usecases
	authUsecase := usecases.NewAuthUsecase(userRepo, refreshTokenRepo, jwtSecret, accessTokenExpiry, refreshTokenExpiry)

	return &Container{
		UserRepo:         userRepo,
		RefreshTokenRepo: refreshTokenRepo,
		AuthUsecase:      authUsecase,
		JWTSecret:        jwtSecret,
	}
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
			auth.GET("/google/callback", authHandler.GoogleCallback)
			auth.GET("/github", authHandler.GitHubLogin)
			auth.GET("/github/callback", authHandler.GitHubCallback)
		}

		// Protected routes (require authentication)
		authorized := v1.Group("")
		authorized.Use(middleware.AuthMiddleware(container.JWTSecret))
		{
			// User profile routes can be added here
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
