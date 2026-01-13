const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('.'));

// MySQL Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'supermarket_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promisePool = pool.promise();

// Test database connection
pool.getConnection((err, connection) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database');
    connection.release();
});

// ==================== PRODUCT ROUTES ====================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM products ORDER BY product_name');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Failed to fetch products' });
    }
});

// Get product by barcode
app.get('/api/products/barcode/:barcode', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM products WHERE barcode = ?', [req.params.barcode]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).json({ error: 'Failed to fetch product' });
    }
});

// Add new product
app.post('/api/products', async (req, res) => {
    const { barcode, product_name, category, quantity, cost_price, selling_price, expiry_date } = req.body;

    try {
        const [result] = await promisePool.query(
            'INSERT INTO products (barcode, product_name, category, quantity, cost_price, selling_price, expiry_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [barcode, product_name, category, quantity, cost_price, selling_price, expiry_date || null]
        );

        // Record in stock history
        await promisePool.query(
            'INSERT INTO stock_history (product_id, barcode, product_name, transaction_type, quantity_change, quantity_after, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [result.insertId, barcode, product_name, 'RECEIVE', quantity, quantity, 'Initial stock']
        );

        res.json({ success: true, id: result.insertId, message: 'Product added successfully' });
    } catch (error) {
        console.error('Error adding product:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ error: 'Product with this barcode already exists' });
        } else {
            res.status(500).json({ error: 'Failed to add product' });
        }
    }
});

// Update product
app.put('/api/products/:barcode', async (req, res) => {
    const { product_name, category, quantity, cost_price, selling_price, expiry_date } = req.body;

    try {
        // Get current quantity for history
        const [currentProduct] = await promisePool.query('SELECT * FROM products WHERE barcode = ?', [req.params.barcode]);

        if (currentProduct.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const [result] = await promisePool.query(
            'UPDATE products SET product_name = ?, category = ?, quantity = ?, cost_price = ?, selling_price = ?, expiry_date = ? WHERE barcode = ?',
            [product_name, category, quantity, cost_price, selling_price, expiry_date || null, req.params.barcode]
        );

        // Record quantity change in history if quantity changed
        if (currentProduct[0].quantity !== quantity) {
            const quantityChange = quantity - currentProduct[0].quantity;
            await promisePool.query(
                'INSERT INTO stock_history (product_id, barcode, product_name, transaction_type, quantity_change, quantity_after, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [currentProduct[0].id, req.params.barcode, product_name, 'ADJUSTMENT', quantityChange, quantity, 'Stock adjusted']
            );
        }

        res.json({ success: true, message: 'Product updated successfully' });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Failed to update product' });
    }
});

// Delete product
app.delete('/api/products/:barcode', async (req, res) => {
    try {
        const [result] = await promisePool.query('DELETE FROM products WHERE barcode = ?', [req.params.barcode]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Failed to delete product' });
    }
});

// ==================== SALES ROUTES ====================

// Create new sale
app.post('/api/sales', async (req, res) => {
    const { items, subtotal, tax, total, payment_amount, change_amount } = req.body;

    const connection = await promisePool.getConnection();

    try {
        await connection.beginTransaction();

        // Insert sale record
        const [saleResult] = await connection.query(
            'INSERT INTO sales (subtotal, tax, total, payment_amount, change_amount) VALUES (?, ?, ?, ?, ?)',
            [subtotal, tax, total, payment_amount, change_amount]
        );

        const saleId = saleResult.insertId;

        // Insert sale items and update stock
        for (const item of items) {
            // Insert sale item
            await connection.query(
                'INSERT INTO sale_items (sale_id, product_id, barcode, product_name, quantity, price, total, cost_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                [saleId, item.product_id, item.barcode, item.product_name, item.quantity, item.price, item.total, item.cost_price]
            );

            // Update product quantity
            await connection.query(
                'UPDATE products SET quantity = quantity - ? WHERE id = ?',
                [item.quantity, item.product_id]
            );

            // Get updated quantity
            const [updatedProduct] = await connection.query(
                'SELECT quantity FROM products WHERE id = ?',
                [item.product_id]
            );

            // Record in stock history
            await connection.query(
                'INSERT INTO stock_history (product_id, barcode, product_name, transaction_type, quantity_change, quantity_after, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [item.product_id, item.barcode, item.product_name, 'SALE', -item.quantity, updatedProduct[0].quantity, `Sale #${saleId}`]
            );
        }

        await connection.commit();
        res.json({ success: true, sale_id: saleId, message: 'Sale completed successfully' });

    } catch (error) {
        await connection.rollback();
        console.error('Error processing sale:', error);
        res.status(500).json({ error: 'Failed to process sale' });
    } finally {
        connection.release();
    }
});

// Get all sales
app.get('/api/sales', async (req, res) => {
    const { from_date, to_date } = req.query;

    try {
        let query = 'SELECT * FROM sales';
        const params = [];

        if (from_date && to_date) {
            query += ' WHERE sale_date BETWEEN ? AND ?';
            params.push(from_date, to_date + ' 23:59:59');
        }

        query += ' ORDER BY sale_date DESC';

        const [rows] = await promisePool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching sales:', error);
        res.status(500).json({ error: 'Failed to fetch sales' });
    }
});

// Get sale items for a specific sale
app.get('/api/sales/:id/items', async (req, res) => {
    try {
        const [rows] = await promisePool.query('SELECT * FROM sale_items WHERE sale_id = ?', [req.params.id]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching sale items:', error);
        res.status(500).json({ error: 'Failed to fetch sale items' });
    }
});

// ==================== REPORTS ROUTES ====================

// Sales report
app.get('/api/reports/sales', async (req, res) => {
    const { from_date, to_date } = req.query;

    try {
        let query = `
            SELECT
                s.id,
                s.sale_date,
                s.subtotal,
                s.tax,
                s.total,
                COUNT(si.id) as items_count,
                SUM(si.quantity) as total_items
            FROM sales s
            LEFT JOIN sale_items si ON s.id = si.sale_id
        `;

        const params = [];

        if (from_date && to_date) {
            query += ' WHERE s.sale_date BETWEEN ? AND ?';
            params.push(from_date, to_date + ' 23:59:59');
        }

        query += ' GROUP BY s.id ORDER BY s.sale_date DESC';

        const [rows] = await promisePool.query(query, params);

        // Calculate summary statistics
        const totalSales = rows.reduce((sum, row) => sum + parseFloat(row.total), 0);
        const totalTransactions = rows.length;
        const avgTransaction = totalTransactions > 0 ? totalSales / totalTransactions : 0;

        res.json({
            summary: {
                total_sales: totalSales,
                total_transactions: totalTransactions,
                average_transaction: avgTransaction
            },
            data: rows
        });
    } catch (error) {
        console.error('Error generating sales report:', error);
        res.status(500).json({ error: 'Failed to generate sales report' });
    }
});

// Inventory report
app.get('/api/reports/inventory', async (req, res) => {
    try {
        const [rows] = await promisePool.query(`
            SELECT
                barcode,
                product_name,
                category,
                quantity,
                cost_price,
                selling_price,
                (quantity * cost_price) as total_cost,
                (quantity * selling_price) as total_value,
                expiry_date
            FROM products
            ORDER BY category, product_name
        `);

        const totalCost = rows.reduce((sum, row) => sum + parseFloat(row.total_cost), 0);
        const totalValue = rows.reduce((sum, row) => sum + parseFloat(row.total_value), 0);
        const totalProducts = rows.length;
        const totalItems = rows.reduce((sum, row) => sum + row.quantity, 0);

        res.json({
            summary: {
                total_products: totalProducts,
                total_items: totalItems,
                total_cost: totalCost,
                total_value: totalValue,
                potential_profit: totalValue - totalCost
            },
            data: rows
        });
    } catch (error) {
        console.error('Error generating inventory report:', error);
        res.status(500).json({ error: 'Failed to generate inventory report' });
    }
});

// Low stock report
app.get('/api/reports/low-stock', async (req, res) => {
    try {
        const [rows] = await promisePool.query(`
            SELECT
                barcode,
                product_name,
                category,
                quantity,
                selling_price
            FROM products
            WHERE quantity < 10
            ORDER BY quantity ASC, product_name
        `);

        res.json({
            summary: {
                low_stock_items: rows.length,
                out_of_stock: rows.filter(r => r.quantity === 0).length
            },
            data: rows
        });
    } catch (error) {
        console.error('Error generating low stock report:', error);
        res.status(500).json({ error: 'Failed to generate low stock report' });
    }
});

// Profit analysis report
app.get('/api/reports/profit', async (req, res) => {
    const { from_date, to_date } = req.query;

    try {
        let query = `
            SELECT
                si.product_name,
                si.barcode,
                SUM(si.quantity) as total_sold,
                SUM(si.total) as revenue,
                SUM(si.quantity * si.cost_price) as cost,
                SUM(si.total - (si.quantity * si.cost_price)) as profit,
                AVG(si.price) as avg_selling_price
            FROM sale_items si
            JOIN sales s ON si.sale_id = s.id
        `;

        const params = [];

        if (from_date && to_date) {
            query += ' WHERE s.sale_date BETWEEN ? AND ?';
            params.push(from_date, to_date + ' 23:59:59');
        }

        query += ' GROUP BY si.product_name, si.barcode ORDER BY profit DESC';

        const [rows] = await promisePool.query(query, params);

        const totalRevenue = rows.reduce((sum, row) => sum + parseFloat(row.revenue), 0);
        const totalCost = rows.reduce((sum, row) => sum + parseFloat(row.cost), 0);
        const totalProfit = rows.reduce((sum, row) => sum + parseFloat(row.profit), 0);
        const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue * 100) : 0;

        res.json({
            summary: {
                total_revenue: totalRevenue,
                total_cost: totalCost,
                total_profit: totalProfit,
                profit_margin: profitMargin
            },
            data: rows
        });
    } catch (error) {
        console.error('Error generating profit report:', error);
        res.status(500).json({ error: 'Failed to generate profit report' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
