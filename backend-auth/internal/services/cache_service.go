package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

// CacheService provides caching functionality using Redis
type CacheService struct {
	client  *redis.Client
	enabled bool
	ttls    map[string]time.Duration
}

// NewCacheService creates a new cache service
func NewCacheService() (*CacheService, error) {
	enabled := os.Getenv("CACHE_ENABLED") == "true"
	if !enabled {
		log.Println("Cache is disabled")
		return &CacheService{enabled: false}, nil
	}

	host := getEnv("REDIS_HOST", "localhost")
	port := getEnv("REDIS_PORT", "6379")
	password := getEnv("REDIS_PASSWORD", "")
	db, _ := strconv.Atoi(getEnv("REDIS_DB", "0"))

	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: password,
		DB:       db,
		PoolSize: 10,
	})

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	// Load TTL configurations
	tripsTTL := getEnvInt("CACHE_TTL_TRIPS", 300) // 5 minutes default
	seatsTTL := getEnvInt("CACHE_TTL_SEATS", 120) // 2 minutes default

	ttls := map[string]time.Duration{
		"trips": time.Duration(tripsTTL) * time.Second,
		"seats": time.Duration(seatsTTL) * time.Second,
	}

	log.Printf("Redis cache initialized at %s:%s (Trips TTL: %ds, Seats TTL: %ds)",
		host, port, tripsTTL, seatsTTL)

	return &CacheService{
		client:  client,
		enabled: true,
		ttls:    ttls,
	}, nil
}

// IsEnabled returns whether caching is enabled
func (c *CacheService) IsEnabled() bool {
	return c.enabled
}

// Get retrieves a value from cache
func (c *CacheService) Get(ctx context.Context, key string, dest interface{}) error {
	if !c.enabled {
		return fmt.Errorf("cache is disabled")
	}

	val, err := c.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return fmt.Errorf("cache miss")
	}
	if err != nil {
		return fmt.Errorf("cache get error: %w", err)
	}

	if err := json.Unmarshal([]byte(val), dest); err != nil {
		return fmt.Errorf("cache unmarshal error: %w", err)
	}

	return nil
}

// Set stores a value in cache with TTL
func (c *CacheService) Set(ctx context.Context, key string, value interface{}, cacheType string) error {
	if !c.enabled {
		return nil
	}

	data, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("cache marshal error: %w", err)
	}

	ttl, ok := c.ttls[cacheType]
	if !ok {
		ttl = 5 * time.Minute // Default TTL
	}

	if err := c.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("cache set error: %w", err)
	}

	return nil
}

// Delete removes a key from cache
func (c *CacheService) Delete(ctx context.Context, keys ...string) error {
	if !c.enabled {
		return nil
	}

	if len(keys) == 0 {
		return nil
	}

	if err := c.client.Del(ctx, keys...).Err(); err != nil {
		return fmt.Errorf("cache delete error: %w", err)
	}

	return nil
}

// DeletePattern removes all keys matching a pattern
func (c *CacheService) DeletePattern(ctx context.Context, pattern string) error {
	if !c.enabled {
		return nil
	}

	iter := c.client.Scan(ctx, 0, pattern, 0).Iterator()
	var keys []string

	for iter.Next(ctx) {
		keys = append(keys, iter.Val())
	}

	if err := iter.Err(); err != nil {
		return fmt.Errorf("cache scan error: %w", err)
	}

	if len(keys) > 0 {
		if err := c.client.Del(ctx, keys...).Err(); err != nil {
			return fmt.Errorf("cache delete pattern error: %w", err)
		}
	}

	return nil
}

// Invalidate removes cache entries based on pattern
func (c *CacheService) Invalidate(ctx context.Context, patterns ...string) error {
	if !c.enabled {
		return nil
	}

	for _, pattern := range patterns {
		if err := c.DeletePattern(ctx, pattern); err != nil {
			log.Printf("Error invalidating cache pattern %s: %v", pattern, err)
		}
	}

	return nil
}

// Flush clears all cache entries
func (c *CacheService) Flush(ctx context.Context) error {
	if !c.enabled {
		return nil
	}

	if err := c.client.FlushDB(ctx).Err(); err != nil {
		return fmt.Errorf("cache flush error: %w", err)
	}

	return nil
}

// Close closes the Redis connection
func (c *CacheService) Close() error {
	if c.client != nil {
		return c.client.Close()
	}
	return nil
}

// GetStats returns cache statistics
func (c *CacheService) GetStats(ctx context.Context) (map[string]interface{}, error) {
	if !c.enabled {
		return map[string]interface{}{
			"enabled": false,
		}, nil
	}

	info, err := c.client.Info(ctx, "stats").Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get cache stats: %w", err)
	}

	dbSize, err := c.client.DBSize(ctx).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get DB size: %w", err)
	}

	return map[string]interface{}{
		"enabled": true,
		"keys":    dbSize,
		"info":    info,
		"ttls":    c.ttls,
	}, nil
}
