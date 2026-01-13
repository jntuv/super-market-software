-- Create Database
CREATE DATABASE IF NOT EXISTS supermarket_db;
USE supermarket_db;

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id INT AUTO_INCREMENT PRIMARY KEY,
    barcode VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    quantity INT DEFAULT 0,
    cost_price DECIMAL(10, 2) NOT NULL,
    selling_price DECIMAL(10, 2) NOT NULL,
    expiry_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_barcode (barcode),
    INDEX idx_category (category),
    INDEX idx_product_name (product_name)
);

-- Sales Table
CREATE TABLE IF NOT EXISTS sales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    payment_amount DECIMAL(10, 2) NOT NULL,
    change_amount DECIMAL(10, 2) NOT NULL,
    INDEX idx_sale_date (sale_date)
);

-- Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sale_id INT NOT NULL,
    product_id INT NOT NULL,
    barcode VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    cost_price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_sale_id (sale_id),
    INDEX idx_product_id (product_id)
);

-- Stock History Table (for tracking stock movements)
CREATE TABLE IF NOT EXISTS stock_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    product_id INT NOT NULL,
    barcode VARCHAR(50) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    transaction_type ENUM('RECEIVE', 'SALE', 'ADJUSTMENT') NOT NULL,
    quantity_change INT NOT NULL,
    quantity_after INT NOT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    INDEX idx_product_id (product_id),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_transaction_type (transaction_type)
);

-- Insert Sample Data
INSERT INTO products (barcode, product_name, category, quantity, cost_price, selling_price, expiry_date) VALUES
('1234567890001', 'Coca Cola 500ml', 'Beverages', 100, 0.75, 1.50, '2026-12-31'),
('1234567890002', 'White Bread', 'Bakery', 50, 1.20, 2.00, '2026-01-20'),
('1234567890003', 'Fresh Milk 1L', 'Dairy', 75, 2.00, 3.50, '2026-01-25'),
('1234567890004', 'Eggs (12 pack)', 'Dairy', 60, 3.00, 5.00, '2026-02-01'),
('1234567890005', 'Rice 5kg', 'Groceries', 40, 8.00, 12.00, NULL),
('1234567890006', 'Pasta 500g', 'Groceries', 80, 1.50, 2.50, '2027-06-30'),
('1234567890007', 'Shampoo 400ml', 'Personal Care', 45, 4.00, 7.00, NULL),
('1234567890008', 'Dish Soap', 'Household', 55, 2.50, 4.00, NULL),
('1234567890009', 'Orange Juice 1L', 'Beverages', 65, 2.50, 4.50, '2026-02-15'),
('1234567890010', 'Chocolate Bar', 'Groceries', 120, 0.80, 1.50, '2026-08-30');
