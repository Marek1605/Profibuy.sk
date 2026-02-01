package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Redis struct {
	client *redis.Client
}

func NewRedis(url string) (*Redis, error) {
	opt, err := redis.ParseURL(url)
	if err != nil {
		return nil, fmt.Errorf("parse redis url: %w", err)
	}

	client := redis.NewClient(opt)

	// Test connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("ping redis: %w", err)
	}

	return &Redis{client: client}, nil
}

func (r *Redis) Close() error {
	return r.client.Close()
}

// Cache keys
const (
	KeyProduct       = "product:%s"       // product:{id}
	KeyProductSlug   = "product:slug:%s"  // product:slug:{slug}
	KeyCategory      = "category:%s"      // category:{slug}
	KeyCategories    = "categories:all"
	KeyFilters       = "filters:%s"       // filters:{category_id or "all"}
	KeyProductList   = "products:list:%s" // products:list:{hash of filter}
	KeyCart          = "cart:%s"          // cart:{id}
	KeySettings      = "settings:%s"      // settings:{key}
	KeyDashboard     = "dashboard:stats"
)

// TTLs
const (
	TTLProduct    = 15 * time.Minute
	TTLCategory   = 30 * time.Minute
	TTLFilters    = 10 * time.Minute
	TTLProductList = 5 * time.Minute
	TTLCart       = 24 * time.Hour
	TTLSettings   = 1 * time.Hour
	TTLDashboard  = 1 * time.Minute
)

// Get retrieves a value from cache
func (r *Redis) Get(ctx context.Context, key string, dest interface{}) error {
	val, err := r.client.Get(ctx, key).Bytes()
	if err == redis.Nil {
		return nil
	}
	if err != nil {
		return err
	}

	return json.Unmarshal(val, dest)
}

// Set stores a value in cache
func (r *Redis) Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error {
	data, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return r.client.Set(ctx, key, data, ttl).Err()
}

// Delete removes a key from cache
func (r *Redis) Delete(ctx context.Context, keys ...string) error {
	if len(keys) == 0 {
		return nil
	}
	return r.client.Del(ctx, keys...).Err()
}

// DeletePattern removes keys matching a pattern
func (r *Redis) DeletePattern(ctx context.Context, pattern string) error {
	var cursor uint64
	for {
		keys, nextCursor, err := r.client.Scan(ctx, cursor, pattern, 100).Result()
		if err != nil {
			return err
		}

		if len(keys) > 0 {
			if err := r.client.Del(ctx, keys...).Err(); err != nil {
				return err
			}
		}

		cursor = nextCursor
		if cursor == 0 {
			break
		}
	}

	return nil
}

// Exists checks if a key exists
func (r *Redis) Exists(ctx context.Context, key string) (bool, error) {
	n, err := r.client.Exists(ctx, key).Result()
	return n > 0, err
}

// GetProduct gets a product from cache
func (r *Redis) GetProduct(ctx context.Context, id string) ([]byte, error) {
	return r.client.Get(ctx, fmt.Sprintf(KeyProduct, id)).Bytes()
}

// SetProduct caches a product
func (r *Redis) SetProduct(ctx context.Context, id string, data []byte) error {
	return r.client.Set(ctx, fmt.Sprintf(KeyProduct, id), data, TTLProduct).Err()
}

// InvalidateProduct removes product from cache
func (r *Redis) InvalidateProduct(ctx context.Context, id string) error {
	return r.Delete(ctx, fmt.Sprintf(KeyProduct, id))
}

// InvalidateProductLists removes all product list caches
func (r *Redis) InvalidateProductLists(ctx context.Context) error {
	return r.DeletePattern(ctx, "products:list:*")
}

// InvalidateAll clears entire cache
func (r *Redis) InvalidateAll(ctx context.Context) error {
	return r.client.FlushDB(ctx).Err()
}

// GetOrSet gets from cache or sets using factory function
func (r *Redis) GetOrSet(ctx context.Context, key string, dest interface{}, ttl time.Duration, factory func() (interface{}, error)) error {
	// Try cache first
	err := r.Get(ctx, key, dest)
	if err == nil {
		return nil
	}

	// Not in cache, get from factory
	value, err := factory()
	if err != nil {
		return err
	}

	// Store in cache
	if err := r.Set(ctx, key, value, ttl); err != nil {
		// Log but don't fail
		fmt.Printf("cache set error: %v\n", err)
	}

	// Copy to dest
	data, _ := json.Marshal(value)
	return json.Unmarshal(data, dest)
}

// IncrementCounter increments a counter
func (r *Redis) IncrementCounter(ctx context.Context, key string) (int64, error) {
	return r.client.Incr(ctx, key).Result()
}

// GetCounter gets a counter value
func (r *Redis) GetCounter(ctx context.Context, key string) (int64, error) {
	val, err := r.client.Get(ctx, key).Int64()
	if err == redis.Nil {
		return 0, nil
	}
	return val, err
}

// RateLimit implements simple rate limiting
func (r *Redis) RateLimit(ctx context.Context, key string, limit int64, window time.Duration) (bool, error) {
	count, err := r.client.Incr(ctx, key).Result()
	if err != nil {
		return false, err
	}

	if count == 1 {
		r.client.Expire(ctx, key, window)
	}

	return count <= limit, nil
}
