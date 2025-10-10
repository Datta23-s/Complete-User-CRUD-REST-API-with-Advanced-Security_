-- Create database
CREATE DATABASE user_crud_db;

-- Connect to the database
\c user_crud_db;

-- Enable pgcrypto extension for encryption functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create users table (GORM will auto-migrate, but this shows structure)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Insert sample data with encrypted passwords
-- Note: These will be replaced by GORM auto-migration and seeding
INSERT INTO users (username, email, password, full_name, role, created_at, updated_at) VALUES
('admin', 'admin@example.com', crypt('admin123', gen_salt('bf', 12)), 'System Administrator', 'admin', NOW(), NOW()),
('jdoe', 'john.doe@example.com', crypt('user123', gen_salt('bf', 12)), 'John Doe', 'user', NOW(), NOW()),
('moderator1', 'mod@example.com', crypt('mod123', gen_salt('bf', 12)), 'Jane Smith', 'moderator', NOW(), NOW())
ON CONFLICT (username) DO NOTHING;

-- Function to update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON DATABASE user_crud_db TO your_user;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_user;