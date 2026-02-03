package config

import (
	"os"
	"strings"
)

type Config struct {
	Port           string
	Environment    string
	DatabaseURL    string
	RedisURL       string
	JWTSecret      string
	AllowedOrigins []string
	
	// Payment gateways
	ComgateShopID    string
	ComgateSecret    string
	ComgateTestMode  bool
	GoPayClientID    string
	GoPayClientSecret string
	GoPayTestMode    bool
	
	// Packeta
	PacketaAPIKey    string
	
	// Storage
	StoragePath      string
	CDNUrl           string
}

func Load() *Config {
	origins := os.Getenv("ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:3000"
	}

	return &Config{
		Port:           getEnv("PORT", "8080"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/megashop?sslmode=disable"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:      getEnv("JWT_SECRET", "your-super-secret-jwt-key-change-in-production"),
		AllowedOrigins: strings.Split(origins, ","),
		
		ComgateShopID:    os.Getenv("COMGATE_SHOP_ID"),
		ComgateSecret:    os.Getenv("COMGATE_SECRET"),
		ComgateTestMode:  os.Getenv("COMGATE_TEST_MODE") == "true",
		GoPayClientID:    os.Getenv("GOPAY_CLIENT_ID"),
		GoPayClientSecret: os.Getenv("GOPAY_CLIENT_SECRET"),
		GoPayTestMode:    os.Getenv("GOPAY_TEST_MODE") == "true",
		
		PacketaAPIKey:    os.Getenv("PACKETA_API_KEY"),
		
		StoragePath:      getEnv("STORAGE_PATH", "./storage"),
		CDNUrl:           getEnv("CDN_URL", ""),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
