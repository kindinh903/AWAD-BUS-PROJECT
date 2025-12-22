# Redis Caching Implementation Plan

## Overview
Implement Redis caching to improve performance by caching expensive database queries and frequently accessed data.

---

## Phase 1: Infrastructure Setup (1 hour)

### Step 1.1: Update Docker Compose (15 min)
**Modify:** `backend-auth/docker-compose.yml`

**Add Redis service:**
```yaml
redis:
  image: redis:7-alpine
  container_name: bus_auth_redis
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
  networks:
    - bus-network
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 5
  command: redis-server --appendonly yes --maxmemory 512mb --maxmemory-policy allkeys-lru

volumes:
  postgres_data:
  redis_data:  # Add this
```

### Step 1.2: Environment Configuration (15 min)
**Modify:** `.env` and `docker-compose.yml` environment section

**Add Redis configuration:**
```bash
# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=                    # Empty for dev, set in production
REDIS_DB=0
REDIS_POOL_SIZE=10
REDIS_DEFAULT_TTL=300              # 5 minutes default
```

### Step 1.3: Install Dependencies (15 min)
**Update:** `backend-auth/go.mod`

```bash
cd backend-auth
go get github.com/redis/go-redis/v9
go mod tidy
```

### Step 1.4: Test Redis Connection (15 min)
```bash
docker-compose up redis -d
docker exec -it bus_auth_redis redis-cli ping
# Should return: PONG
```

---

## Phase 2: Redis Client Implementation (2 hours)

### Step 2.1: Create Redis Client (1 hour)
**New file:** `backend-auth/internal/cache/redis_client.go`

```go
package cache

import (
    "context"
    "encoding/json"
    "fmt"
    "os"
    "strconv"
    "time"

    "github.com/redis/go-redis/v9"
)

type RedisClient struct {
    client     *redis.Client
    enabled    bool
    defaultTTL time.Duration
}

func NewRedisClient() (*RedisClient, error) {
    enabled := os.Getenv("REDIS_ENABLED") == "true"
    
    if !enabled {
        return &RedisClient{enabled: false}, nil
    }

    host := getEnv("REDIS_HOST", "localhost")
    port := getEnv("REDIS_PORT", "6379")
    password := getEnv("REDIS_PASSWORD", "")
    db := getEnvInt("REDIS_DB", 0)
    poolSize := getEnvInt("REDIS_POOL_SIZE", 10)
    defaultTTL := getEnvDuration("REDIS_DEFAULT_TTL", 5*time.Minute)

    client := redis.NewClient(&redis.Options{
        Addr:         fmt.Sprintf("%s:%s", host, port),
        Password:     password,
        DB:           db,
        PoolSize:     poolSize,
        MinIdleConns: 5,
        MaxRetries:   3,
        DialTimeout:  5 * time.Second,
        ReadTimeout:  3 * time.Second,
        WriteTimeout: 3 * time.Second,
    })

    // Test connection
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := client.Ping(ctx).Err(); err != nil {
        return nil, fmt.Errorf("redis connection failed: %w", err)
    }

    return &RedisClient{
        client:     client,
        enabled:    true,
        defaultTTL: defaultTTL,
    }, nil
}

// Core methods
func (r *RedisClient) Get(ctx context.Context, key string, dest interface{}) error
func (r *RedisClient) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
func (r *RedisClient) Delete(ctx context.Context, keys ...string) error
func (r *RedisClient) DeletePattern(ctx context.Context, pattern string) error
func (r *RedisClient) Exists(ctx context.Context, key string) (bool, error)
func (r *RedisClient) TTL(ctx context.Context, key string) (time.Duration, error)
func (r *RedisClient) Close() error
```

### Step 2.2: Create Cache Interface (30 min)
**New file:** `backend-auth/internal/cache/cache.go`

```go
package cache

type Cache interface {
    Get(ctx context.Context, key string, dest interface{}) error
    Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
    Delete(ctx context.Context, keys ...string) error
    DeletePattern(ctx context.Context, pattern string) error
    Exists(ctx context.Context, key string) (bool, error)
    TTL(ctx context.Context, key string) (time.Duration, error)
    Close() error
}

// Null cache for when Redis is disabled
type NullCache struct{}

func (n *NullCache) Get(ctx context.Context, key string, dest interface{}) error {
    return ErrCacheMiss
}
// ... implement other methods as no-ops
```

### Step 2.3: Create Cache Key Generator (30 min)
**New file:** `backend-auth/internal/cache/keys.go`

```go
package cache

import (
    "fmt"
    "strings"
    "time"
)

// Cache key patterns
const (
    // Trip caching
    KeyTripSearch     = "trips:search:%s:%s:%s"        // origin:dest:date
    KeyTripByID       = "trip:%s"                       // tripID
    KeyTripSeats      = "trip:%s:seats"                 // tripID
    KeyRelatedTrips   = "trips:related:%s"              // tripID
    
    // Route caching
    KeyRoute          = "route:%s"                      // routeID
    KeyRouteList      = "routes:list:%d:%d"             // page:pageSize
    KeyRouteStops     = "route:%s:stops"                // routeID
    
    // Seat map caching
    KeySeatMap        = "seatmap:%s"                    // seatMapID
    KeySeatMapList    = "seatmaps:list"
    
    // Analytics caching
    KeyAnalytics      = "analytics:%s:%s:%s"            // type:start:end
    KeyTopRoutes      = "analytics:top-routes:%s:%s"    // start:end
    
    // Review caching
    KeyTripReviews    = "trip:%s:reviews:%d"            // tripID:page
)

func TripSearchKey(origin, destination, date string) string {
    return fmt.Sprintf(KeyTripSearch, 
        strings.ToLower(origin), 
        strings.ToLower(destination), 
        date)
}

func TripSeatsKey(tripID string) string {
    return fmt.Sprintf(KeyTripSeats, tripID)
}

// ... more key generator functions
```

---

## Phase 3: Repository Caching Layer (3-4 hours)

### Step 3.1: Cache Trip Search (1.5 hours) 🔥 **HIGH PRIORITY**
**Modify:** `backend-auth/internal/repositories/postgres/trip_repository.go`

**Add cache to struct:**
```go
type TripRepository struct {
    db    *gorm.DB
    cache cache.Cache  // Add this
}

func NewTripRepository(db *gorm.DB, cache cache.Cache) *TripRepository {
    return &TripRepository{
        db:    db,
        cache: cache,
    }
}
```

**Wrap SearchTrips method:**
```go
func (r *TripRepository) SearchTrips(ctx context.Context, params SearchParams) ([]Trip, int64, error) {
    // Generate cache key
    cacheKey := cache.TripSearchKey(
        params.Origin,
        params.Destination,
        params.DepartureDate.Format("2006-01-02"),
    )
    cacheKey += fmt.Sprintf(":%d:%d", params.Page, params.PageSize)
    
    // Try cache first
    var cached TripSearchResult
    if err := r.cache.Get(ctx, cacheKey, &cached); err == nil {
        return cached.Trips, cached.Total, nil
    }
    
    // Cache miss - query database
    trips, total, err := r.searchTripsFromDB(ctx, params)
    if err != nil {
        return nil, 0, err
    }
    
    // Cache for 5 minutes
    result := TripSearchResult{Trips: trips, Total: total}
    _ = r.cache.Set(ctx, cacheKey, result, 5*time.Minute)
    
    return trips, total, nil
}
```

### Step 3.2: Cache Seat Availability (1 hour) 🔥 **HIGH PRIORITY**
**Modify:** `backend-auth/internal/repositories/postgres/seat_reservation_repository.go`

**Cache seat availability:**
```go
func (r *SeatReservationRepository) GetAvailableSeats(ctx context.Context, tripID uuid.UUID) ([]Seat, error) {
    cacheKey := cache.TripSeatsKey(tripID.String())
    
    var cached []Seat
    if err := r.cache.Get(ctx, cacheKey, &cached); err == nil {
        return cached, nil
    }
    
    seats, err := r.getAvailableSeatsFromDB(ctx, tripID)
    if err != nil {
        return nil, err
    }
    
    // Cache for 2 minutes (shorter TTL for real-time data)
    _ = r.cache.Set(ctx, cacheKey, seats, 2*time.Minute)
    
    return seats, nil
}
```

**Invalidate cache on booking:**
```go
func (r *SeatReservationRepository) CreateReservation(ctx context.Context, reservation *SeatReservation) error {
    if err := r.db.Create(reservation).Error; err != nil {
        return err
    }
    
    // Invalidate seat cache for this trip
    cacheKey := cache.TripSeatsKey(reservation.TripID.String())
    _ = r.cache.Delete(ctx, cacheKey)
    
    return nil
}
```

### Step 3.3: Cache Routes (45 min)
**Modify:** `backend-auth/internal/repositories/postgres/route_repository.go`

```go
func (r *RouteRepository) GetByID(ctx context.Context, id uuid.UUID) (*Route, error) {
    cacheKey := cache.RouteKey(id.String())
    
    var cached Route
    if err := r.cache.Get(ctx, cacheKey, &cached); err == nil {
        return &cached, nil
    }
    
    route, err := r.getByIDFromDB(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Cache for 1 hour (routes rarely change)
    _ = r.cache.Set(ctx, cacheKey, route, 1*time.Hour)
    
    return route, nil
}
```

**Invalidate on update:**
```go
func (r *RouteRepository) Update(ctx context.Context, route *Route) error {
    if err := r.db.Save(route).Error; err != nil {
        return err
    }
    
    // Invalidate cache
    cacheKey := cache.RouteKey(route.ID.String())
    _ = r.cache.Delete(ctx, cacheKey)
    
    return nil
}
```

### Step 3.4: Cache Seat Maps (30 min)
**Modify:** `backend-auth/internal/repositories/postgres/seat_map_repository.go`

```go
func (r *SeatMapRepository) GetByID(ctx context.Context, id uuid.UUID) (*SeatMap, error) {
    cacheKey := cache.SeatMapKey(id.String())
    
    var cached SeatMap
    if err := r.cache.Get(ctx, cacheKey, &cached); err == nil {
        return &cached, nil
    }
    
    seatMap, err := r.getSeatMapFromDB(ctx, id)
    if err != nil {
        return nil, err
    }
    
    // Cache indefinitely (invalidate on update)
    _ = r.cache.Set(ctx, cacheKey, seatMap, 0) // 0 = no expiration
    
    return seatMap, nil
}
```

### Step 3.5: Cache Analytics (30 min)
**Modify:** `backend-auth/internal/repositories/postgres/booking_analytics_repository.go`

```go
func (r *BookingAnalyticsRepository) GetDailyRevenue(ctx context.Context, start, end time.Time) ([]Revenue, error) {
    cacheKey := cache.AnalyticsKey(
        "daily-revenue",
        start.Format("2006-01-02"),
        end.Format("2006-01-02"),
    )
    
    var cached []Revenue
    if err := r.cache.Get(ctx, cacheKey, &cached); err == nil {
        return cached, nil
    }
    
    revenue, err := r.getRevenueFromDB(ctx, start, end)
    if err != nil {
        return nil, err
    }
    
    // Cache for 15 minutes
    _ = r.cache.Set(ctx, cacheKey, revenue, 15*time.Minute)
    
    return revenue, nil
}
```

---

## Phase 4: Integration (1 hour)

### Step 4.1: Update Dependency Injection (30 min)
**Modify:** `backend-auth/cmd/api/main.go`

```go
func initDependencies(db *gorm.DB) *Container {
    // Initialize Redis cache
    redisCache, err := cache.NewRedisClient()
    if err != nil {
        log.Printf("Warning: Redis cache initialization failed: %v", err)
        log.Println("Falling back to null cache (no caching)")
        redisCache = &cache.NullCache{}
    } else {
        log.Println("Redis cache connected successfully")
    }

    // Pass cache to repositories
    tripRepo := postgres.NewTripRepository(db, redisCache)
    routeRepo := postgres.NewRouteRepository(db, redisCache)
    seatReservationRepo := postgres.NewSeatReservationRepository(db, redisCache)
    seatMapRepo := postgres.NewSeatMapRepository(db, redisCache)
    analyticsRepo := postgres.NewBookingAnalyticsRepository(db, redisCache)
    
    // ... rest of initialization
    
    return &Container{
        Cache: redisCache,
        // ... other fields
    }
}
```

### Step 4.2: Add Cache Health Check (30 min)
**New file:** `backend-auth/internal/delivery/http/handlers/health_handler.go`

```go
func (h *HealthHandler) CheckRedis(c *gin.Context) {
    ctx := c.Request.Context()
    
    // Test Redis connection
    testKey := "health:check"
    testValue := time.Now().Unix()
    
    if err := h.cache.Set(ctx, testKey, testValue, 10*time.Second); err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{
            "status": "unhealthy",
            "cache":  "redis",
            "error":  err.Error(),
        })
        return
    }
    
    var retrieved int64
    if err := h.cache.Get(ctx, testKey, &retrieved); err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{
            "status": "unhealthy",
            "cache":  "redis",
            "error":  "cache read failed",
        })
        return
    }
    
    c.JSON(http.StatusOK, gin.H{
        "status": "healthy",
        "cache":  "redis",
    })
}
```

---

## Phase 5: Cache Invalidation Strategy (1 hour)

### Step 5.1: Invalidation Patterns

**1. Time-based expiration:**
```go
// Short TTL for real-time data
cache.Set(ctx, key, data, 2*time.Minute)  // Seat availability

// Medium TTL for semi-static data
cache.Set(ctx, key, data, 15*time.Minute) // Analytics

// Long TTL for static data
cache.Set(ctx, key, data, 1*time.Hour)    // Routes, seat maps
```

**2. Event-based invalidation:**
```go
// When booking is created
func (uc *BookingUsecase) CreateBooking(...) {
    // ... create booking
    
    // Invalidate related caches
    cache.Delete(ctx, cache.TripSeatsKey(tripID))
    cache.DeletePattern(ctx, fmt.Sprintf("trips:search:*:%s", date))
}
```

**3. Cascade invalidation:**
```go
// When trip is updated
func (uc *TripUsecase) UpdateTrip(...) {
    // ... update trip
    
    // Invalidate trip caches
    cache.Delete(ctx, 
        cache.TripByID(tripID),
        cache.TripSeatsKey(tripID),
        cache.RelatedTripsKey(tripID),
    )
    
    // Invalidate search results containing this trip
    cache.DeletePattern(ctx, "trips:search:*")
}
```

### Step 5.2: Batch Invalidation
**New file:** `backend-auth/internal/cache/invalidation.go`

```go
type CacheInvalidator struct {
    cache Cache
}

func (ci *CacheInvalidator) InvalidateTrip(ctx context.Context, tripID string) error {
    keys := []string{
        cache.TripByID(tripID),
        cache.TripSeatsKey(tripID),
        cache.RelatedTripsKey(tripID),
    }
    return ci.cache.Delete(ctx, keys...)
}

func (ci *CacheInvalidator) InvalidateRoute(ctx context.Context, routeID string) error {
    keys := []string{
        cache.RouteKey(routeID),
        cache.RouteStopsKey(routeID),
    }
    
    if err := ci.cache.Delete(ctx, keys...); err != nil {
        return err
    }
    
    // Also invalidate trips on this route
    return ci.cache.DeletePattern(ctx, "trips:*")
}
```

---

## Phase 6: Monitoring & Optimization (1 hour)

### Step 6.1: Add Cache Metrics
**New file:** `backend-auth/internal/cache/metrics.go`

```go
type CacheMetrics struct {
    Hits        int64
    Misses      int64
    Errors      int64
    TotalTime   time.Duration
}

func (r *RedisClient) GetStats(ctx context.Context) (*CacheMetrics, error) {
    info := r.client.Info(ctx, "stats")
    // Parse Redis INFO output
    return metrics, nil
}
```

### Step 6.2: Add Cache Monitoring Endpoint
```go
// GET /api/v1/admin/cache/stats
func (h *AdminHandler) GetCacheStats(c *gin.Context) {
    stats, err := h.cache.GetStats(c.Request.Context())
    if err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(200, gin.H{
        "hits":      stats.Hits,
        "misses":    stats.Misses,
        "hit_rate":  float64(stats.Hits) / float64(stats.Hits + stats.Misses),
        "errors":    stats.Errors,
    })
}
```

### Step 6.3: Add Cache Clear Endpoint (Admin)
```go
// POST /api/v1/admin/cache/clear
func (h *AdminHandler) ClearCache(c *gin.Context) {
    var req struct {
        Pattern string `json:"pattern"`
    }
    
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    
    if req.Pattern == "" {
        req.Pattern = "*"
    }
    
    if err := h.cache.DeletePattern(c.Request.Context(), req.Pattern); err != nil {
        c.JSON(500, gin.H{"error": err.Error()})
        return
    }
    
    c.JSON(200, gin.H{"message": "Cache cleared successfully"})
}
```

---

## Phase 7: Testing (1.5 hours)

### Step 7.1: Unit Tests
**New file:** `backend-auth/internal/cache/redis_client_test.go`

```go
func TestRedisClient_GetSet(t *testing.T) {
    // Setup test Redis
    client := setupTestRedis(t)
    defer client.Close()
    
    // Test set and get
    key := "test:key"
    value := "test_value"
    
    err := client.Set(context.Background(), key, value, 1*time.Minute)
    assert.NoError(t, err)
    
    var retrieved string
    err = client.Get(context.Background(), key, &retrieved)
    assert.NoError(t, err)
    assert.Equal(t, value, retrieved)
}
```

### Step 7.2: Integration Tests
**Test cache hit/miss scenarios:**
```go
func TestTripRepository_SearchWithCache(t *testing.T) {
    repo := setupTripRepoWithRedis(t)
    
    // First call - cache miss
    trips1, _, err := repo.SearchTrips(ctx, params)
    assert.NoError(t, err)
    
    // Second call - cache hit (should be faster)
    start := time.Now()
    trips2, _, err := repo.SearchTrips(ctx, params)
    duration := time.Since(start)
    
    assert.NoError(t, err)
    assert.Equal(t, trips1, trips2)
    assert.Less(t, duration, 10*time.Millisecond) // Much faster
}
```

### Step 7.3: Performance Testing
```go
func BenchmarkTripSearch_WithCache(b *testing.B) {
    repo := setupTripRepoWithRedis(b)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _, _ = repo.SearchTrips(ctx, params)
    }
}

func BenchmarkTripSearch_WithoutCache(b *testing.B) {
    repo := setupTripRepoWithoutRedis(b)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        _, _, _ = repo.SearchTrips(ctx, params)
    }
}
```

---

## Configuration Summary

### Environment Variables
```bash
# Redis Configuration
REDIS_ENABLED=true
REDIS_HOST=redis              # "localhost" for local dev
REDIS_PORT=6379
REDIS_PASSWORD=               # Empty for dev, set in production
REDIS_DB=0
REDIS_POOL_SIZE=10
REDIS_DEFAULT_TTL=300         # 5 minutes

# Cache TTLs (optional, override defaults)
CACHE_TTL_TRIP_SEARCH=300     # 5 minutes
CACHE_TTL_SEATS=120           # 2 minutes
CACHE_TTL_ROUTES=3600         # 1 hour
CACHE_TTL_ANALYTICS=900       # 15 minutes
```

### Cache Key Strategy
```
Pattern: <entity>:<id>:<subresource>

Examples:
- trip:123e4567-e89b-12d3-a456-426614174000
- trip:123e4567-e89b-12d3-a456-426614174000:seats
- trips:search:hanoi:danang:2025-12-25
- route:456e4567-e89b-12d3-a456-426614174001
- analytics:daily-revenue:2025-12-01:2025-12-31
```

---

## Expected Performance Improvements

| Query Type | Without Cache | With Cache | Improvement |
|------------|---------------|------------|-------------|
| Trip search | 150-300ms | 2-5ms | **30-60x faster** |
| Seat availability | 50-100ms | 1-3ms | **20-50x faster** |
| Route details | 20-50ms | 1-2ms | **10-25x faster** |
| Analytics | 500-1000ms | 5-10ms | **50-100x faster** |

---

## Estimated Time Breakdown

| Phase | Task | Time |
|-------|------|------|
| 1 | Infrastructure setup | 1 hour |
| 2 | Redis client implementation | 2 hours |
| 3 | Repository caching | 4 hours |
| 4 | Integration | 1 hour |
| 5 | Invalidation strategy | 1 hour |
| 6 | Monitoring | 1 hour |
| 7 | Testing | 1.5 hours |
| **Total** | | **~11.5 hours** |

**Minimum viable:** ~6 hours (Phase 1-3 only)

---

## Success Criteria

- ✅ Redis connected in docker-compose
- ✅ Cache abstraction layer works
- ✅ Trip search cached with 5min TTL
- ✅ Seat availability cached with 2min TTL
- ✅ Cache invalidates on updates
- ✅ Graceful fallback if Redis unavailable
- ✅ 20-50x performance improvement on cached queries
- ✅ Cache hit rate >70% after warmup

---

## Priority Implementation Order

### Phase 1: Critical (4 hours)
1. ✅ Infrastructure setup (Docker, env)
2. ✅ Redis client + interface
3. ✅ Cache trip search (biggest impact)

### Phase 2: High Value (3 hours)
4. ✅ Cache seat availability
5. ✅ Cache routes
6. ✅ Invalidation on booking/updates

### Phase 3: Nice to Have (4.5 hours)
7. ✅ Cache seat maps
8. ✅ Cache analytics
9. ✅ Monitoring endpoints
10. ✅ Testing

---

## Common Pitfalls & Solutions

### Pitfall 1: Cache Stampede
**Problem:** Many requests hit DB when cache expires

**Solution:** Use cache warming + stale-while-revalidate
```go
// If cache is about to expire, refresh in background
if ttl < 1*time.Minute {
    go refreshCache(ctx, key)
}
return cachedData
```

### Pitfall 2: Stale Data
**Problem:** Users see old seat availability

**Solution:** Short TTL (2min) + invalidation on booking

### Pitfall 3: Memory Usage
**Problem:** Redis runs out of memory

**Solution:** Set maxmemory + LRU eviction policy
```bash
redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
```

### Pitfall 4: Cache Key Collisions
**Problem:** Different queries share same cache key

**Solution:** Include all relevant params in key
```go
key := fmt.Sprintf("trips:search:%s:%s:%s:%s:%d:%d", 
    origin, dest, date, busType, page, pageSize)
```

---

## Next Steps

1. Start with Phase 1 (infrastructure)
2. Test Redis connection
3. Implement Phase 2 (client)
4. Add caching to trip search (Phase 3.1)
5. Measure performance improvement
6. Add remaining cache layers
7. Implement monitoring

Ready to start implementing? Let me know which phase to begin with!
