package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/mux"
	"github.com/joho/godotenv"
	"github.com/rs/cors"
	"golang.org/x/crypto/argon2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// User model with GORM tags
type User struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	Username  string    `gorm:"uniqueIndex;not null" json:"username"`
	Email     string    `gorm:"uniqueIndex;not null" json:"email"`
	Password  string    `gorm:"not null" json:"password"`
	FullName  string    `json:"fullName"`
	Role      string    `gorm:"default:user" json:"role"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Request/Response structs
type CreateUserRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"fullName"`
	Role     string `json:"role"`
}

type UpdateUserRequest struct {
	Username string `json:"username,omitempty"`
	Email    string `json:"email,omitempty"`
	Password string `json:"password,omitempty"`
	FullName string `json:"fullName,omitempty"`
	Role     string `json:"role,omitempty"`
}

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Message string      `json:"message,omitempty"`
	Error   string      `json:"error,omitempty"`
}

// Database connection
var db *gorm.DB

// Password hashing functions
func hashPasswordArgon2(password string) string {
	salt := []byte("unique_salt_per_user") // In production, use random salt per user
	hash := argon2.IDKey([]byte(password), salt, 1, 64*1024, 4, 32)
	return fmt.Sprintf("$argon2id$v=19$m=65536,t=1,p=4$%x", hash)
}

func hashPasswordBcrypt(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

func verifyPasswordBcrypt(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// Database initialization
func initDatabase() {
	// Load environment variables
	err := godotenv.Load()
	if err != nil {
		log.Println("No .env file found, using system environment variables")
	}

	// Database connection string
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "password")
	dbName := getEnv("DB_NAME", "user_crud_db")

	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		dbHost, dbUser, dbPassword, dbName, dbPort)

	db, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// Auto-migrate the schema
	err = db.AutoMigrate(&User{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Seed initial data if table is empty
	var count int64
	db.Model(&User{}).Count(&count)
	if count == 0 {
		seedInitialData()
	}

	log.Println("Database connected and migrated successfully")
}

func seedInitialData() {
	adminHash, _ := hashPasswordBcrypt("admin123")
	userHash := hashPasswordArgon2("user123")
	modHash, _ := hashPasswordBcrypt("mod123")

	users := []User{
		{
			Username:  "admin",
			Email:     "admin@example.com",
			Password:  adminHash,
			FullName:  "System Administrator",
			Role:      "admin",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			Username:  "jdoe",
			Email:     "john.doe@example.com",
			Password:  userHash,
			FullName:  "John Doe",
			Role:      "user",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
		{
			Username:  "moderator1",
			Email:     "mod@example.com",
			Password:  modHash,
			FullName:  "Jane Smith",
			Role:      "moderator",
			CreatedAt: time.Now(),
			UpdatedAt: time.Now(),
		},
	}

	for _, user := range users {
		db.Create(&user)
	}

	log.Println("Initial data seeded successfully")
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}

// API Handlers
func getAllUsers(w http.ResponseWriter, r *http.Request) {
	var users []User
	result := db.Find(&users)
	if result.Error != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch users", result.Error.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    users,
		Message: fmt.Sprintf("Retrieved %d users", len(users)),
	})
}

func getUserByID(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	var user User
	result := db.First(&user, id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			respondWithError(w, http.StatusNotFound, "User not found", "")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch user", result.Error.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    user,
		Message: "User retrieved successfully",
	})
}

func createUser(w http.ResponseWriter, r *http.Request) {
	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	// Validate required fields
	if req.Username == "" || req.Email == "" || req.Password == "" {
		respondWithError(w, http.StatusBadRequest, "Username, email, and password are required", "")
		return
	}

	// Hash password using Argon2 (default) or bcrypt
	var hashedPassword string
	if req.Role == "admin" {
		// Use bcrypt for admin users
		hash, err := hashPasswordBcrypt(req.Password)
		if err != nil {
			respondWithError(w, http.StatusInternalServerError, "Failed to hash password", err.Error())
			return
		}
		hashedPassword = hash
	} else {
		// Use Argon2 for regular users
		hashedPassword = hashPasswordArgon2(req.Password)
	}

	// Set default role if not provided
	if req.Role == "" {
		req.Role = "user"
	}

	user := User{
		Username:  req.Username,
		Email:     req.Email,
		Password:  hashedPassword,
		FullName:  req.FullName,
		Role:      req.Role,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result := db.Create(&user)
	if result.Error != nil {
		respondWithError(w, http.StatusConflict, "Failed to create user", result.Error.Error())
		return
	}

	respondWithJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data:    user,
		Message: "User created successfully",
	})
}

func updateUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	var user User
	result := db.First(&user, id)
	if result.Error != nil {
		if result.Error == gorm.ErrRecordNotFound {
			respondWithError(w, http.StatusNotFound, "User not found", "")
			return
		}
		respondWithError(w, http.StatusInternalServerError, "Failed to fetch user", result.Error.Error())
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid request body", err.Error())
		return
	}

	// Update fields if provided
	if req.Username != "" {
		user.Username = req.Username
	}
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Password != "" {
		// Re-hash password if updated
		if req.Role == "admin" || user.Role == "admin" {
			hash, err := hashPasswordBcrypt(req.Password)
			if err != nil {
				respondWithError(w, http.StatusInternalServerError, "Failed to hash password", err.Error())
				return
			}
			user.Password = hash
		} else {
			user.Password = hashPasswordArgon2(req.Password)
		}
	}
	if req.FullName != "" {
		user.FullName = req.FullName
	}
	if req.Role != "" {
		user.Role = req.Role
	}

	user.UpdatedAt = time.Now()

	result = db.Save(&user)
	if result.Error != nil {
		respondWithError(w, http.StatusConflict, "Failed to update user", result.Error.Error())
		return
	}

	respondWithJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    user,
		Message: "User updated successfully",
	})
}

func deleteUser(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	id, err := strconv.Atoi(vars["id"])
	if err != nil {
		respondWithError(w, http.StatusBadRequest, "Invalid user ID", err.Error())
		return
	}

	result := db.Delete(&User{}, id)
	if result.Error != nil {
		respondWithError(w, http.StatusInternalServerError, "Failed to delete user", result.Error.Error())
		return
	}

	if result.RowsAffected == 0 {
		respondWithError(w, http.StatusNotFound, "User not found", "")
		return
	}

	respondWithJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Message: "User deleted successfully",
	})
}

// Helper functions
func respondWithJSON(w http.ResponseWriter, status int, payload interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(payload)
}

func respondWithError(w http.ResponseWriter, status int, message, error string) {
	respondWithJSON(w, status, APIResponse{
		Success: false,
		Message: message,
		Error:   error,
	})
}

// Routes setup
func setupRoutes() *mux.Router {
	r := mux.NewRouter()

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/users", getAllUsers).Methods("GET")
	api.HandleFunc("/users/{id}", getUserByID).Methods("GET")
	api.HandleFunc("/users", createUser).Methods("POST")
	api.HandleFunc("/users/{id}", updateUser).Methods("PUT")
	api.HandleFunc("/users/{id}", deleteUser).Methods("DELETE")

	// Health check
	api.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		respondWithJSON(w, http.StatusOK, APIResponse{
			Success: true,
			Message: "API is running",
		})
	}).Methods("GET")

	// Serve static files (for the frontend)
	r.PathPrefix("/").Handler(http.FileServer(http.Dir("./static/")))

	return r
}

func main() {
	// Initialize database
	initDatabase()

	// Setup routes
	router := setupRoutes()

	// Setup CORS
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"*"}, // In production, specify exact origins
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	handler := c.Handler(router)

	// Start server
	port := getEnv("PORT", "8080")
	log.Printf("Server starting on port %s", port)
	log.Printf("API available at: http://localhost:%s/api/", port)
	log.Printf("Health check: http://localhost:%s/api/health", port)

	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}