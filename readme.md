# Supermarket Management System

A comprehensive supermarket management system with MySQL database, barcode scanner support, and export capabilities to Excel/CSV/PDF.

## Features

### 1. Home Dashboard
- Clean, modern UI with 4 main tiles:
  - **Receiving**: Add new products and manage inventory intake
  - **Billing**: Process sales with barcode scanner support
  - **Stock**: View and manage inventory levels
  - **Reports**: Generate and export various reports

### 2. Receiving Module
- Add new products to inventory
- Track product details:
  - Barcode
  - Product name
  - Category
  - Quantity
  - Cost price
  - Selling price
  - Expiry date (optional)
- Automatic stock history tracking

### 3. Billing Module
- Barcode scanner input support (keyboard/USB scanner)
- Real-time cart management
- Quantity adjustment for cart items
- Automatic stock deduction
- Tax calculation (5%)
- Payment processing with change calculation
- Transaction history

### 4. Stock Management
- View all products in inventory
- Search and filter by:
  - Product name or barcode
  - Category
  - Stock level (All, Low Stock, Out of Stock)
- Edit product details
- Delete products
- Visual stock status indicators
- Low stock alerts

### 5. Reports Module
- **Sales Report**: Total sales, transactions, average transaction value
- **Inventory Report**: Product valuation, total items, potential profit
- **Low Stock Report**: Items running low or out of stock
- **Profit Analysis**: Revenue, cost, profit margins by product
- Date range filtering
- Export to:
  - Excel (.xlsx)
  - CSV (.csv)
  - PDF (.pdf)

## Technology Stack

### Backend
- Node.js
- Express.js
- MySQL 2
- Body Parser
- CORS

### Frontend
- HTML5
- CSS3 (Modern responsive design)
- JavaScript (ES6+)
- jsPDF (PDF generation)
- jsPDF AutoTable (PDF tables)
- SheetJS/XLSX (Excel export)

## Installation

### Prerequisites
- Node.js (v14 or higher)
- MySQL Server (v5.7 or higher)
- npm or yarn package manager

### Step 1: Clone or Download the Project
```bash
cd c:\Users\SantoshM\Desktop\SCIS
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Setup MySQL Database

1. Start MySQL server
2. Create a database and import the schema:

```bash
mysql -u root -p < database.sql
```

Or manually in MySQL:
```sql
source database.sql
```

### Step 4: Configure Environment Variables

1. Copy `.env.example` to `.env`:
```bash
copy .env.example .env
```

2. Edit `.env` file with your MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=supermarket_db
DB_PORT=3306
PORT=3000
```

### Step 5: Start the Application

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### Step 6: Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Database Schema

### Tables

1. **products**
   - Product information and inventory
   - Barcode (unique identifier)
   - Pricing and stock levels
   - Expiry dates

2. **sales**
   - Sales transactions
   - Subtotal, tax, total amounts
   - Payment and change

3. **sale_items**
   - Individual items in each sale
   - Links sales to products
   - Quantity and pricing details

4. **stock_history**
   - Tracks all stock movements
   - Receives, sales, adjustments
   - Audit trail

## Usage Guide

### Adding Products (Receiving)

1. Navigate to **Receiving** tile
2. Fill in product details:
   - Product name
   - Barcode (can be scanned)
   - Category
   - Quantity
   - Cost and selling prices
   - Expiry date (optional)
3. Click "Add Product"

### Processing Sales (Billing)

1. Navigate to **Billing** tile
2. Scan or enter product barcode
3. Press Enter or click "Add Item"
4. Adjust quantities using +/- buttons
5. Enter payment amount
6. Click "Complete Sale"

### Managing Stock

1. Navigate to **Stock** tile
2. Use search bar to find products
3. Filter by category or stock level
4. Click "Edit" to modify product details
5. Click "Delete" to remove products

### Generating Reports

1. Navigate to **Reports** tile
2. Select report type
3. Choose date range (optional)
4. View report preview
5. Click export button for desired format:
   - Export to Excel
   - Export to CSV
   - Export to PDF

## Barcode Scanner Setup

### USB Barcode Scanners
- Most USB barcode scanners work as keyboard input
- Simply plug in and scan
- The barcode will be entered automatically
- Ensure cursor is in the barcode input field

### Testing Without Scanner
- Use sample barcodes from database:
  - 1234567890001 - Coca Cola
  - 1234567890002 - White Bread
  - 1234567890003 - Fresh Milk
  - etc.

## API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/barcode/:barcode` - Get product by barcode
- `POST /api/products` - Add new product
- `PUT /api/products/:barcode` - Update product
- `DELETE /api/products/:barcode` - Delete product

### Sales
- `POST /api/sales` - Create new sale
- `GET /api/sales` - Get all sales
- `GET /api/sales/:id/items` - Get sale items

### Reports
- `GET /api/reports/sales` - Sales report
- `GET /api/reports/inventory` - Inventory report
- `GET /api/reports/low-stock` - Low stock report
- `GET /api/reports/profit` - Profit analysis

## Troubleshooting

### Cannot connect to MySQL
- Verify MySQL server is running
- Check credentials in `.env` file
- Ensure database `supermarket_db` exists
- Check firewall settings

### Port already in use
- Change PORT in `.env` file
- Or stop the process using port 3000:
  ```bash
  netstat -ano | findstr :3000
  taskkill /PID <process_id> /F
  ```

### Products not loading
- Check browser console for errors
- Verify API is running on `http://localhost:3000`
- Check network tab in browser dev tools

### Barcode scanner not working
- Ensure scanner is in keyboard emulation mode
- Check if cursor is in barcode input field
- Test by manually typing barcode

## Sample Data

The system comes with 10 sample products:
- Beverages (Coca Cola, Orange Juice)
- Bakery (White Bread)
- Dairy (Milk, Eggs)
- Groceries (Rice, Pasta, Chocolate)
- Personal Care (Shampoo)
- Household (Dish Soap)

## Security Notes

- Change default MySQL credentials
- Use strong passwords
- Consider adding authentication for production
- Implement HTTPS for production deployment
- Regular database backups recommended

## Future Enhancements

- User authentication and authorization
- Multiple user roles (Admin, Cashier, Manager)
- Customer management
- Supplier management
- Purchase orders
- Barcode label printing
- Receipt printing
- Multi-location support
- Dashboard analytics
- Real-time notifications

## License

This project is provided as-is for educational and commercial use.

## Support

For issues or questions, please check:
1. This README file
2. Database schema in `database.sql`
3. API documentation above
4. Console logs for errors

---

**Version**: 1.0.0
**Last Updated**: January 2026
