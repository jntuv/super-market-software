// API Base URL
const API_BASE = 'http://localhost:3000/api';

// Global state
let currentScreen = 'home';
let cart = [];
let allProducts = [];
let currentEditBarcode = null;
let receivingExistingProduct = null;
let receivingBarcodeLookupTimer = null;

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    updateDateTime();
    setInterval(updateDateTime, 1000);
    loadProducts();
    setupEventListeners();
    setDefaultDates();
});

// Update date and time
function updateDateTime() {
    const now = new Date();
    document.getElementById('currentDate').textContent = now.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
    document.getElementById('currentTime').textContent = now.toLocaleTimeString('en-US');
}

// Navigation
function navigateTo(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(screen + 'Screen').classList.add('active');
    currentScreen = screen;

    // Load data when navigating to specific screens
    if (screen === 'stock') {
        loadStock();
    } else if (screen === 'reports') {
        generateReport();
    } else if (screen === 'billing') {
        document.getElementById('barcodeInput').focus();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Receiving form
    document.getElementById('receivingForm').addEventListener('submit', handleReceiving);
    document.getElementById('barcode').addEventListener('input', handleReceivingBarcodeInput);

    // Barcode input enter key
    document.getElementById('barcodeInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addItemByBarcode();
        }
    });

    // Payment amount change
    document.getElementById('paymentAmount').addEventListener('input', calculateChange);

    // Edit form
    document.getElementById('editForm').addEventListener('submit', handleEditProduct);
}

// Set default dates for reports
function setDefaultDates() {
    const today = new Date().toISOString().split('T')[0];
    const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
    document.getElementById('fromDate').value = firstDay;
    document.getElementById('toDate').value = today;
}

// ==================== PRODUCTS ====================

async function loadProducts() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        allProducts = await response.json();
    } catch (error) {
        console.error('Error loading products:', error);
        showAlert('Failed to load products', 'error');
    }
}

// ==================== RECEIVING ====================

async function handleReceiving(e) {
    e.preventDefault();

    const enteredQuantity = parseInt(document.getElementById('quantity').value);
    const productData = {
        barcode: document.getElementById('barcode').value.trim(),
        product_name: document.getElementById('productName').value.trim(),
        category: document.getElementById('category').value,
        quantity: enteredQuantity,
        cost_price: parseFloat(document.getElementById('costPrice').value),
        selling_price: parseFloat(document.getElementById('sellingPrice').value),
        expiry_date: document.getElementById('expiryDate').value || null
    };

    try {
        let response = null;
        let result = null;

        if (receivingExistingProduct && receivingExistingProduct.barcode === productData.barcode) {
            const updatedQuantity = receivingExistingProduct.quantity + enteredQuantity;
            const updatePayload = { ...productData, quantity: updatedQuantity };

            response = await fetch(`${API_BASE}/products/${productData.barcode}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatePayload)
            });
            result = await response.json();
        } else {
            response = await fetch(`${API_BASE}/products`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(productData)
            });
            result = await response.json();
        }

        if (response.ok) {
            const message = receivingExistingProduct ? 'Stock updated successfully!' : 'Product added successfully!';
            showAlert(message, 'success');
            document.getElementById('receivingForm').reset();
            receivingExistingProduct = null;
            await loadProducts();
        } else {
            showAlert(result.error || 'Failed to add product', 'error');
        }
    } catch (error) {
        console.error('Error adding product:', error);
        showAlert('Failed to add product', 'error');
    }
}

function handleReceivingBarcodeInput(e) {
    const barcode = e.target.value.trim();

    receivingExistingProduct = null;

    if (receivingBarcodeLookupTimer) {
        clearTimeout(receivingBarcodeLookupTimer);
    }

    if (!barcode) {
        return;
    }

    receivingBarcodeLookupTimer = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE}/products/barcode/${barcode}`);
            if (!response.ok) {
                clearReceivingFormFields();
                return;
            }

            const product = await response.json();
            receivingExistingProduct = product;

            document.getElementById('productName').value = product.product_name || '';
            document.getElementById('category').value = product.category || '';
            document.getElementById('costPrice').value = product.cost_price || '';
            document.getElementById('sellingPrice').value = product.selling_price || '';
            document.getElementById('expiryDate').value = product.expiry_date ? product.expiry_date.split('T')[0] : '';

            if (!document.getElementById('quantity').value) {
                document.getElementById('quantity').value = 1;
            }
        } catch (error) {
            console.error('Error loading product by barcode:', error);
        }
    }, 300);
}

function clearReceivingFormFields() {
    document.getElementById('productName').value = '';
    document.getElementById('category').value = '';
    document.getElementById('costPrice').value = '';
    document.getElementById('sellingPrice').value = '';
    document.getElementById('expiryDate').value = '';
}

// ==================== BILLING ====================

async function addItemByBarcode() {
    const barcodeInput = document.getElementById('barcodeInput');
    const barcode = barcodeInput.value.trim();

    if (!barcode) {
        showAlert('Please enter a barcode', 'warning');
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/products/barcode/${barcode}`);

        if (!response.ok) {
            showAlert('Product not found', 'error');
            barcodeInput.value = '';
            barcodeInput.focus();
            return;
        }

        const product = await response.json();

        if (product.quantity <= 0) {
            showAlert('Product out of stock', 'error');
            barcodeInput.value = '';
            barcodeInput.focus();
            return;
        }

        // Check if item already in cart
        const existingItem = cart.find(item => item.barcode === barcode);

        if (existingItem) {
            if (existingItem.quantity < product.quantity) {
                existingItem.quantity++;
                existingItem.total = existingItem.quantity * existingItem.price;
            } else {
                showAlert('Cannot add more than available stock', 'warning');
            }
        } else {
            cart.push({
                product_id: product.id,
                barcode: product.barcode,
                product_name: product.product_name,
                price: parseFloat(product.selling_price),
                cost_price: parseFloat(product.cost_price),
                quantity: 1,
                total: parseFloat(product.selling_price),
                max_quantity: product.quantity
            });
        }

        updateCartDisplay();
        barcodeInput.value = '';
        barcodeInput.focus();

    } catch (error) {
        console.error('Error adding item:', error);
        showAlert('Failed to add item', 'error');
    }
}

function updateCartDisplay() {
    const tbody = document.getElementById('cartTableBody');

    if (cart.length === 0) {
        tbody.innerHTML = '<tr class="empty-cart"><td colspan="5">Cart is empty. Scan items to begin.</td></tr>';
        updateBillSummary();
        return;
    }

    tbody.innerHTML = cart.map((item, index) => `
        <tr>
            <td><strong>${item.product_name}</strong><br><small>${item.barcode}</small></td>
            <td>$${item.price.toFixed(2)}</td>
            <td>
                <div class="item-quantity">
                    <button class="qty-btn" onclick="updateQuantity(${index}, -1)">-</button>
                    <span><strong>${item.quantity}</strong></span>
                    <button class="qty-btn" onclick="updateQuantity(${index}, 1)">+</button>
                </div>
            </td>
            <td><strong>$${item.total.toFixed(2)}</strong></td>
            <td>
                <button class="remove-item" onclick="removeItem(${index})">Remove</button>
            </td>
        </tr>
    `).join('');

    updateBillSummary();
}

function updateQuantity(index, change) {
    const item = cart[index];
    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
        removeItem(index);
        return;
    }

    if (newQuantity > item.max_quantity) {
        showAlert('Cannot exceed available stock', 'warning');
        return;
    }

    item.quantity = newQuantity;
    item.total = item.quantity * item.price;
    updateCartDisplay();
}

function removeItem(index) {
    cart.splice(index, 1);
    updateCartDisplay();
}

function clearCart() {
    if (cart.length === 0) return;

    if (confirm('Are you sure you want to clear the cart?')) {
        cart = [];
        updateCartDisplay();
        document.getElementById('paymentAmount').value = '';
        document.getElementById('barcodeInput').focus();
    }
}

function updateBillSummary() {
    const subtotal = roundCurrency(cart.reduce((sum, item) => sum + item.total, 0));
    const tax = roundCurrency(subtotal * 0.05); // 5% tax
    const total = roundCurrency(subtotal + tax);

    document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
    document.getElementById('total').textContent = `$${total.toFixed(2)}`;

    // Auto-fill payment amount with total
    document.getElementById('paymentAmount').value = total.toFixed(2);

    calculateChange();
}

function calculateChange() {
    const total = parseFloat(document.getElementById('total').textContent.replace('$', ''));
    const payment = parseFloat(document.getElementById('paymentAmount').value) || 0;
    const change = roundCurrency(payment - total);

    document.getElementById('changeAmount').textContent = `$${change >= 0 ? change.toFixed(2) : '0.00'}`;
}

async function completeSale() {
    if (cart.length === 0) {
        showAlert('Cart is empty', 'warning');
        return;
    }

    const subtotal = roundCurrency(cart.reduce((sum, item) => sum + item.total, 0));
    const tax = roundCurrency(subtotal * 0.05);
    const total = roundCurrency(subtotal + tax);
    const payment = parseFloat(document.getElementById('paymentAmount').value) || 0;

    if (payment < total) {
        showAlert('Insufficient payment amount', 'error');
        return;
    }

    const change = roundCurrency(payment - total);

    const saleData = {
        items: cart,
        subtotal: subtotal,
        tax: tax,
        total: total,
        payment_amount: payment,
        change_amount: change
    };

    try {
        const response = await fetch(`${API_BASE}/sales`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(saleData)
        });

        const result = await response.json();

        if (response.ok) {
            showAlert(`Sale completed! Change: $${change.toFixed(2)}`, 'success');
            cart = [];
            updateCartDisplay();
            document.getElementById('paymentAmount').value = '';
            await loadProducts();
            document.getElementById('barcodeInput').focus();
        } else {
            showAlert(result.error || 'Failed to complete sale', 'error');
        }
    } catch (error) {
        console.error('Error completing sale:', error);
        showAlert('Failed to complete sale', 'error');
    }
}

// ==================== STOCK MANAGEMENT ====================

async function loadStock() {
    try {
        const response = await fetch(`${API_BASE}/products`);
        const products = await response.json();
        displayStock(products);
    } catch (error) {
        console.error('Error loading stock:', error);
        showAlert('Failed to load stock', 'error');
    }
}

function displayStock(products) {
    const tbody = document.getElementById('stockTableBody');

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding:40px;">No products found</td></tr>';
        return;
    }

    tbody.innerHTML = products.map(product => {
        let stockStatus = 'good';
        let stockText = 'In Stock';

        if (product.quantity === 0) {
            stockStatus = 'out';
            stockText = 'Out of Stock';
        } else if (product.quantity < 10) {
            stockStatus = 'low';
            stockText = 'Low Stock';
        }

        const expiryDate = product.expiry_date ? new Date(product.expiry_date).toLocaleDateString() : 'N/A';

        return `
            <tr>
                <td>${product.barcode}</td>
                <td><strong>${product.product_name}</strong></td>
                <td>${product.category}</td>
                <td><span class="stock-status ${stockStatus}">${product.quantity} ${stockText}</span></td>
                <td>$${parseFloat(product.cost_price).toFixed(2)}</td>
                <td>$${parseFloat(product.selling_price).toFixed(2)}</td>
                <td>${expiryDate}</td>
                <td>
                    <div class="action-buttons">
                        <button class="edit-btn" onclick="openEditModal('${product.barcode}')">Edit</button>
                        <button class="delete-btn" onclick="deleteProduct('${product.barcode}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function filterStock() {
    const searchTerm = document.getElementById('stockSearch').value.toLowerCase();
    const categoryFilter = document.getElementById('categoryFilter').value;
    const stockFilter = document.getElementById('stockFilter').value;

    const filtered = allProducts.filter(product => {
        const matchesSearch = product.product_name.toLowerCase().includes(searchTerm) ||
            product.barcode.includes(searchTerm);

        const matchesCategory = !categoryFilter || product.category === categoryFilter;

        let matchesStock = true;
        if (stockFilter === 'low') {
            matchesStock = product.quantity < 10 && product.quantity > 0;
        } else if (stockFilter === 'out') {
            matchesStock = product.quantity === 0;
        }

        return matchesSearch && matchesCategory && matchesStock;
    });

    displayStock(filtered);
}

async function openEditModal(barcode) {
    try {
        const response = await fetch(`${API_BASE}/products/barcode/${barcode}`);
        const product = await response.json();

        document.getElementById('editBarcode').value = product.barcode;
        document.getElementById('editProductName').value = product.product_name;
        document.getElementById('editCategory').value = product.category;
        document.getElementById('editQuantity').value = product.quantity;
        document.getElementById('editCostPrice').value = product.cost_price;
        document.getElementById('editSellingPrice').value = product.selling_price;
        document.getElementById('editExpiryDate').value = product.expiry_date ? product.expiry_date.split('T')[0] : '';

        document.getElementById('editModal').classList.add('active');
    } catch (error) {
        console.error('Error loading product:', error);
        showAlert('Failed to load product details', 'error');
    }
}

function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('editForm').reset();
}

async function handleEditProduct(e) {
    e.preventDefault();

    const barcode = document.getElementById('editBarcode').value;
    const productData = {
        product_name: document.getElementById('editProductName').value,
        category: document.getElementById('editCategory').value,
        quantity: parseInt(document.getElementById('editQuantity').value),
        cost_price: parseFloat(document.getElementById('editCostPrice').value),
        selling_price: parseFloat(document.getElementById('editSellingPrice').value),
        expiry_date: document.getElementById('editExpiryDate').value || null
    };

    try {
        const response = await fetch(`${API_BASE}/products/${barcode}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(productData)
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('Product updated successfully!', 'success');
            closeEditModal();
            await loadProducts();
            await loadStock();
        } else {
            showAlert(result.error || 'Failed to update product', 'error');
        }
    } catch (error) {
        console.error('Error updating product:', error);
        showAlert('Failed to update product', 'error');
    }
}

async function deleteProduct(barcode) {
    if (!confirm('Are you sure you want to delete this product?')) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/products/${barcode}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (response.ok) {
            showAlert('Product deleted successfully!', 'success');
            await loadProducts();
            await loadStock();
        } else {
            showAlert(result.error || 'Failed to delete product', 'error');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        showAlert('Failed to delete product', 'error');
    }
}

// ==================== REPORTS ====================

let currentReportData = null;

async function generateReport() {
    const reportType = document.getElementById('reportType').value;
    const fromDate = document.getElementById('fromDate').value;
    const toDate = document.getElementById('toDate').value;

    let url = `${API_BASE}/reports/${reportType}`;
    if (fromDate && toDate) {
        url += `?from_date=${fromDate}&to_date=${toDate}`;
    }

    try {
        const response = await fetch(url);
        currentReportData = await response.json();

        displayReport(reportType, currentReportData);
    } catch (error) {
        console.error('Error generating report:', error);
        showAlert('Failed to generate report', 'error');
    }
}

function displayReport(type, data) {
    const statsCards = document.getElementById('statsCards');
    const reportTitle = document.getElementById('reportTitle');
    const tableHead = document.getElementById('reportTableHead');
    const tableBody = document.getElementById('reportTableBody');

    // Update title
    const titles = {
        'sales': 'Sales Report',
        'inventory': 'Inventory Report',
        'low-stock': 'Low Stock Report',
        'profit': 'Profit Analysis'
    };
    reportTitle.textContent = titles[type];

    // Display summary stats
    if (data.summary) {
        const summary = data.summary;
        let statsHTML = '';

        if (type === 'sales') {
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-label">Total Sales</div>
                    <div class="stat-value">$${summary.total_sales.toFixed(2)}</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-label">Transactions</div>
                    <div class="stat-value">${summary.total_transactions}</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-label">Avg Transaction</div>
                    <div class="stat-value">$${summary.average_transaction.toFixed(2)}</div>
                </div>
            `;
        } else if (type === 'inventory') {
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-label">Total Products</div>
                    <div class="stat-value">${summary.total_products}</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-label">Total Items</div>
                    <div class="stat-value">${summary.total_items}</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-label">Total Value</div>
                    <div class="stat-value">$${summary.total_value.toFixed(2)}</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Potential Profit</div>
                    <div class="stat-value">$${summary.potential_profit.toFixed(2)}</div>
                </div>
            `;
        } else if (type === 'low-stock') {
            statsHTML = `
                <div class="stat-card warning">
                    <div class="stat-label">Low Stock Items</div>
                    <div class="stat-value">${summary.low_stock_items}</div>
                </div>
                <div class="stat-card danger">
                    <div class="stat-label">Out of Stock</div>
                    <div class="stat-value">${summary.out_of_stock}</div>
                </div>
            `;
        } else if (type === 'profit') {
            statsHTML = `
                <div class="stat-card">
                    <div class="stat-label">Total Revenue</div>
                    <div class="stat-value">$${summary.total_revenue.toFixed(2)}</div>
                </div>
                <div class="stat-card success">
                    <div class="stat-label">Total Profit</div>
                    <div class="stat-value">$${summary.total_profit.toFixed(2)}</div>
                </div>
                <div class="stat-card warning">
                    <div class="stat-label">Profit Margin</div>
                    <div class="stat-value">${summary.profit_margin.toFixed(1)}%</div>
                </div>
            `;
        }

        statsCards.innerHTML = statsHTML;
    }

    // Display table
    if (data.data && data.data.length > 0) {
        const columns = Object.keys(data.data[0]);

        // Create table header
        tableHead.innerHTML = `
            <tr>
                ${columns.map(col => `<th>${col.replace(/_/g, ' ').toUpperCase()}</th>`).join('')}
            </tr>
        `;

        // Create table body
        tableBody.innerHTML = data.data.map(row => `
            <tr>
                ${columns.map(col => {
            let value = row[col];
            if (typeof value === 'number' && !col.includes('id') && !col.includes('quantity')) {
                value = '$' + value.toFixed(2);
            } else if (col.includes('date') && value) {
                value = new Date(value).toLocaleDateString();
            }
            return `<td>${value !== null ? value : 'N/A'}</td>`;
        }).join('')}
            </tr>
        `).join('');
    } else {
        tableHead.innerHTML = '';
        tableBody.innerHTML = '<tr><td colspan="100%" style="text-align:center; padding:40px;">No data available</td></tr>';
    }
}

// ==================== EXPORT FUNCTIONS ====================

function exportReport(format) {
    if (!currentReportData || !currentReportData.data || currentReportData.data.length === 0) {
        showAlert('No data to export', 'warning');
        return;
    }

    const reportType = document.getElementById('reportType').value;
    const filename = `${reportType}_report_${new Date().toISOString().split('T')[0]}`;

    if (format === 'csv') {
        exportToCSV(currentReportData.data, filename);
    } else if (format === 'excel') {
        exportToExcel(currentReportData.data, filename);
    } else if (format === 'pdf') {
        exportToPDF(currentReportData, filename);
    }
}

function exportToCSV(data, filename) {
    const columns = Object.keys(data[0]);
    let csv = columns.join(',') + '\n';

    data.forEach(row => {
        csv += columns.map(col => {
            let value = row[col];
            if (typeof value === 'string' && value.includes(',')) {
                value = `"${value}"`;
            }
            return value !== null ? value : '';
        }).join(',') + '\n';
    });

    downloadFile(csv, filename + '.csv', 'text/csv');
    showAlert('Report exported to CSV successfully!', 'success');
}

function exportToExcel(data, filename) {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');

    XLSX.writeFile(wb, filename + '.xlsx');
    showAlert('Report exported to Excel successfully!', 'success');
}

function exportToPDF(reportData, filename) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(document.getElementById('reportTitle').textContent, 14, 20);

    // Add date
    doc.setFontSize(10);
    doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 28);

    // Add summary if available
    let yPos = 35;
    if (reportData.summary) {
        doc.setFontSize(12);
        doc.text('Summary:', 14, yPos);
        yPos += 7;
        doc.setFontSize(10);

        Object.entries(reportData.summary).forEach(([key, value]) => {
            const label = key.replace(/_/g, ' ').toUpperCase();
            const displayValue = typeof value === 'number' ? value.toFixed(2) : value;
            doc.text(`${label}: ${displayValue}`, 14, yPos);
            yPos += 6;
        });

        yPos += 5;
    }

    // Add table
    if (reportData.data && reportData.data.length > 0) {
        const columns = Object.keys(reportData.data[0]).map(col => ({
            header: col.replace(/_/g, ' ').toUpperCase(),
            dataKey: col
        }));

        doc.autoTable({
            startY: yPos,
            columns: columns,
            body: reportData.data,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
            styles: { fontSize: 8 }
        });
    }

    doc.save(filename + '.pdf');
    showAlert('Report exported to PDF successfully!', 'success');
}

function downloadFile(content, filename, contentType) {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
}

// ==================== UTILITY FUNCTIONS ====================

function showAlert(message, type = 'success') {
    const alert = document.createElement('div');
    alert.className = `alert ${type}`;
    alert.textContent = message;
    document.body.appendChild(alert);

    setTimeout(() => {
        alert.style.opacity = '0';
        setTimeout(() => alert.remove(), 300);
    }, 3000);
}

function roundCurrency(amount) {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
}
