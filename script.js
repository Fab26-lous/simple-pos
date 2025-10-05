console.log('=== POS SYSTEM LOADED ===');
console.log('checkLogin function exists:', typeof checkLogin);
console.log('selectStore function exists:', typeof selectStore);
console.log('loadProducts function exists:', typeof loadProducts);
// Store configurations
const stores = {
  store1: {
    name: "One Stop",
    users: {
      "Cashier": "Glam2025"
    }
  },
  store2: {
    name: "Golden", 
    users: {
      "Cashier2": "Glam2025"
    }
  }
};

  // ============ GOOGLE SHEETS WITH STORE-SPECIFIC STOCKS ============
const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQMoJA4uj6dsPvt0LjS5wiqPb18u7TRdmuXa4NVht_lbM58Auqxb_JOPld2sIqOcLb7wyzx0KJaTCsM/pub?gid=0&single=true&output=csv';
// Add this function - it's used by loadAllStoreProducts but wasn't defined
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    
    return result.map(cell => cell.trim().replace(/^"|"$/g, ''));
}
async function loadProductsFromGoogleSheets() {
    try {
        console.log('Loading from Google Sheets...');
        const response = await fetch(GOOGLE_SHEETS_CSV_URL);
        const csvText = await response.text();
        const products = parseCSVToProducts(csvText);
        console.log(`Loaded ${products.length} products from Google Sheets for store: ${currentStore}`);
        return products;
    } catch (error) {
        console.error('Google Sheets error:', error);
        return await loadProductsFromJSON();
    }
}

function parseCSVToProducts(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    const products = [];
    
    console.log('Current store:', currentStore);

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        
        // Simple CSV parsing
        const cells = line.split(',').map(cell => cell.trim());
        
        if (cells.length >= 6) {
            // Determine which stock column to use based on current store
            let stock = 0;
            if (currentStore === 'store1') {
                stock = parseInt(cells[4]) || 0; // Stock One Stop (column E)
            } else if (currentStore === 'store2') {
                stock = parseInt(cells[5]) || 0; // Stock Golden (column F)
            }
            
            const product = {
                name: cells[0],
                prices: {
                    ct: parseFloat(cells[1]) || 0,
                    dz: parseFloat(cells[2]) || 0,
                    pc: parseFloat(cells[3]) || 0
                },
                stock: stock
            };
            
            if (product.name && product.name !== 'Product Name') {
                products.push(product);
            }
        }
    }
    
    return products;
}

async function loadProductsFromJSON() {
    try {
        const response = await fetch('products.json');
        const data = await response.json();
        console.log('Loaded products from local JSON fallback');
        return data;
    } catch (error) {
        console.error('Error loading from JSON:', error);
        return [];
    }
}

// ============ END GOOGLE SHEETS ============
// Your existing variables
let currentStore = null;
let currentUser = null;
let products = [];
let currentSales = [];

// Your existing functions
function checkLogin() {
    console.log('=== LOGIN BUTTON CLICKED ===');
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const error = document.getElementById("login-error");

    console.log('Username:', username);
    console.log('Password:', password);

    // Check if username exists in any store
    let validStore = null;
    
    for (const [storeId, store] of Object.entries(stores)) {
        if (store.users[username] && store.users[username] === password) {
            validStore = storeId;
            break;
        }
    }

    console.log('Valid store found:', validStore);

    if (validStore) {
        currentStore = validStore;
        currentUser = username;
        document.getElementById("login-container").style.display = "none";
        document.getElementById("store-selection").style.display = "block";
        // Highlight the user's store
        document.querySelector(`button[onclick="selectStore('${currentStore}')"]`)
          .classList.add('active-store');
        console.log('Login successful!');
    } else {
        error.textContent = "Invalid username or password";
        console.log('Login failed');
    }
}
function selectStore(storeId) {
    if (storeId === currentStore) {
        // User selected their authorized store
        document.getElementById("store-selection").style.display = "none";
        document.getElementById("pos-container").style.display = "block";
        document.getElementById("store-name").textContent = stores[storeId].name;
        
        // RELOAD products for this specific store to get correct stock levels
        loadProducts();
        
    } else {
        alert("You are not authorized for this store");
    }
}

function loadProducts() {
    // Try Google Sheets first, fallback to local JSON
    loadProductsFromGoogleSheets()
        .then(data => {
            products = data;
            populateDatalist();
            console.log(`Loaded ${products.length} products for ${stores[currentStore].name}`);
        })
        .catch(err => {
            console.error('Error loading products:', err);
            alert('Failed to load product data.');
        });
}

function populateDatalist() {
    const datalist = document.getElementById('item-list');
    datalist.innerHTML = '';
    products.forEach(p => {
        const option = document.createElement('option');
        option.value = p.name;
        datalist.appendChild(option);
    });
}
function updatePrice() {
  const itemName = document.getElementById('item').value.trim();
  const unit = document.getElementById('unit').value;
  const product = products.find(p => p.name.toLowerCase() === itemName.toLowerCase());
  if (product) {
    const price = product.prices[unit];
    document.getElementById('price').value = price;
  } else {
    document.getElementById('price').value = '';
  }
}

function calculateTotal() {
  const quantity = parseFloat(document.getElementById('quantity').value) || 0;
  const price = parseFloat(document.getElementById('price').value) || 0;
  const discount = parseFloat(document.getElementById('discount').value) || 0;
  const extra = parseFloat(document.getElementById('extra').value) || 0;

  const subtotal = quantity * price;
  const total = subtotal - discount + extra;
  
  document.getElementById('total').value = total.toFixed(2);
  return total;
}

['quantity', 'price', 'discount', 'extra'].forEach(id => {
  document.getElementById(id).addEventListener('input', calculateTotal);
});

document.getElementById('sale-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const item = document.getElementById('item').value;
  if (!item) {
    alert('Please select an item');
    return;
  }

  const unit = document.getElementById('unit').value;
  const quantity = parseFloat(document.getElementById('quantity').value) || 0;
  const price = parseFloat(document.getElementById('price').value) || 0;
  const discount = parseFloat(document.getElementById('discount').value) || 0;
  const extra = parseFloat(document.getElementById('extra').value) || 0;
  const paymentMethod = document.getElementById('payment-method').value;
  const total = calculateTotal();

  const sale = {
    item, 
    unit, 
    quantity, 
    price, 
    discount, 
    extra, 
    paymentMethod, 
    total,
    timestamp: new Date().toLocaleTimeString(),
    store: currentStore
  };
  
  currentSales.push(sale);
  updateSalesTable();
  resetForm();
});

function resetForm() {
  document.getElementById('sale-form').reset();
  document.getElementById('price').value = '';
  document.getElementById('total').value = '';
  document.getElementById('item').focus();
}

function updateSalesTable() {
  const tbody = document.querySelector('#sales-table tbody');
  tbody.innerHTML = '';
  
  let grandTotal = 0;
  
  currentSales.forEach((sale, index) => {
    const row = document.createElement('tr');
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${sale.item}</td>
      <td>${sale.unit}</td>
      <td>${sale.quantity}</td>
      <td>${sale.price.toFixed(2)}</td>
      <td>${sale.discount.toFixed(2)}</td>
      <td>${sale.extra.toFixed(2)}</td>
      <td>${sale.total.toFixed(2)}</td>
      <td>${sale.paymentMethod}</td>
      <td><button onclick="removeSale(${index})">×</button></td>
    `;
    
    tbody.appendChild(row);
    grandTotal += sale.total;
  });
  
  const submitBtn = document.getElementById('submit-all-btn');
  const clearBtn = document.getElementById('clear-all-btn');
  
  if (currentSales.length > 0) {
    submitBtn.style.display = 'inline-block';
    clearBtn.style.display = 'inline-block';
    
    const footerRow = document.createElement('tr');
    footerRow.innerHTML = `
      <td colspan="7" style="text-align: right;"><strong>Grand Total:</strong></td>
      <td><strong>${grandTotal.toFixed(2)}</strong></td>
      <td colspan="2"></td>
    `;
    tbody.appendChild(footerRow);
  } else {
    submitBtn.style.display = 'none';
    clearBtn.style.display = 'none';
  }
}

function removeSale(index) {
  currentSales.splice(index, 1);
  updateSalesTable();
}

function clearAllSales() {
  if (confirm('Are you sure you want to clear all items?')) {
    currentSales = [];
    updateSalesTable();
  }
}

function submitAllSales() {
  if (currentSales.length === 0) {
    alert('No items to submit');
    return;
  }

  const submitBtn = document.getElementById('submit-all-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  const progress = document.createElement('div');
  progress.style.margin = '10px 0';
  progress.style.fontWeight = 'bold';
  progress.innerHTML = `Submitting 0/${currentSales.length} items...`;
  submitBtn.parentNode.appendChild(progress);

  let successCount = 0;
  const errors = [];
  
  const submitNext = (index) => {
    if (index >= currentSales.length) {
      progress.innerHTML = `Completed: ${successCount}/${currentSales.length} items submitted successfully`;
      
      if (errors.length > 0) {
        progress.innerHTML += `<br>${errors.length} items failed`;
        console.error('Failed submissions:', errors);
      }
      
      if (successCount > 0) {
        currentSales.splice(0, successCount);
        updateSalesTable();
      }
      
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit All Items';
      
      setTimeout(() => {
        progress.remove();
      }, 5000);
      
      return;
    }

    progress.innerHTML = `Submitting ${index + 1}/${currentSales.length} items...`;
    
    submitSaleToGoogleForm(currentSales[index])
      .then(() => {
        successCount++;
        submitNext(index + 1);
      })
      .catch(err => {
        errors.push({ index, error: err });
        submitNext(index + 1);
      });
  };

  submitNext(0);
}

function submitSaleToGoogleForm(sale) {
  // 1. Base URL with forced submission parameter
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdjXVJj4HT31S5NU6-7KUBQz7xyU_d9YuZN4BzaD1T5Mg7Bjg/formResponse?submit=Submit";

  // 2. Prepare all form data
  const formData = new URLSearchParams();
  
  // Required hidden fields
  formData.append("fvv", "1");
  formData.append("pageHistory", "0");

  // Your form fields (verified from your form)
  formData.append("entry.902078713", sale.item);         // Item
  formData.append("entry.448082825", sale.unit);        // Unit
  formData.append("entry.617272247", sale.quantity);    // Quantity
  formData.append("entry.591650069", sale.price);       // Price
  formData.append("entry.209491416", sale.discount);    // Discount
  formData.append("entry.1362215713", sale.extra);      // Extra
  formData.append("entry.492804547", sale.total);       // Total
  formData.append("entry.197957478", sale.paymentMethod); // Payment
  formData.append("entry.370318910", stores[currentStore].name); // Store

  // 3. Submit with minimal headers
  return fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });
}
// ... ALL YOUR OTHER EXISTING FUNCTIONS ...
// submitSaleToGoogleForm, updateSalesTable, removeSale, clearAllSales, submitAllSales, etc.

// ============ ADD STOCK DISPLAY CODE AT THE VERY END ============

// Stock display functions
let allStoreProducts = []; // This will store products from both stores

async function loadAllStoreProducts() {
    try {
        console.log('Loading products for both stores...');
        const response = await fetch(GOOGLE_SHEETS_CSV_URL);
        const csvText = await response.text();
        
        console.log('=== RAW CSV FROM YOUR SHEET ===');
        console.log(csvText);
        
        const lines = csvText.split('\n').filter(line => line.trim());
        
        // Show the header row to understand column structure
        if (lines.length > 0) {
            console.log('=== HEADER ROW (Column Names) ===');
            const headers = parseCSVLine(lines[0]);
            headers.forEach((header, index) => {
                console.log(`Column ${index}: "${header}"`);
            });
        }
        
        allStoreProducts = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const cells = parseCSVLine(lines[i]);
            
            console.log(`=== Processing Row ${i} ===`);
            console.log('All cells:', cells);
            
            if (cells.length >= 4) {
                const product = {
                    name: cells[0]?.trim() || 'Unknown',
                    // Try different column mappings
                    prices: {
                        ct: parseFloat(cells[1]) || 0,
                        dz: parseFloat(cells[2]) || 0, 
                        pc: parseFloat(cells[3]) || 0
                    },
                    // STOCK COLUMNS - These might be in different positions
                    stockStore1: parseInt(cells[4]) || 0, // Try column 4 for Store1
                    stockStore2: parseInt(cells[5]) || 0  // Try column 5 for Store2
                };
                
                console.log(`Product "${product.name}":`, {
                    'Store1 stock': product.stockStore1,
                    'Store2 stock': product.stockStore2,
                    'All cells available': cells
                });
                
                if (product.name && product.name !== 'Product Name') {
                    allStoreProducts.push(product);
                }
            }
        }
        
        console.log('=== FINAL PRODUCTS ===');
        allStoreProducts.forEach(p => {
            console.log(`${p.name}: Store1=${p.stockStore1}, Store2=${p.stockStore2}`);
        });
        
        return allStoreProducts;
        
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}
function showStockLevels() {
    // Load products for both stores
    loadAllStoreProducts().then(products => {
        populateStockTable(products);
        document.getElementById('stock-modal').style.display = 'flex';
    });
}

function hideStockLevels() {
    document.getElementById('stock-modal').style.display = 'none';
}

function populateStockTable(products) {
    const tbody = document.getElementById('stock-table-body');
    const summary = document.getElementById('stock-summary');
    
    tbody.innerHTML = '';
    
    let totalStore1 = 0;
    let totalStore2 = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    
    products.forEach(product => {
        const totalStock = product.stockStore1 + product.stockStore2;
        totalStore1 += product.stockStore1;
        totalStore2 += product.stockStore2;
        
        // Determine status
        let status = '✅ In Stock';
        let statusColor = '#27ae60';
        
        if (totalStock === 0) {
            status = '❌ Out of Stock';
            statusColor = '#e74c3c';
            outOfStockCount++;
        } else if (totalStock < 5) {
            status = '⚠️ Low Stock';
            statusColor = '#f39c12';
            lowStockCount++;
        }
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #eee';
        row.innerHTML = `
            <td style="padding: 10px; font-weight: bold;">${product.name}</td>
            <td style="padding: 10px; text-align: center; color: ${product.stockStore1 === 0 ? '#e74c3c' : '#2c3e50'}">
                ${product.stockStore1}
                ${product.stockStore1 === 0 ? '❌' : ''}
            </td>
            <td style="padding: 10px; text-align: center; color: ${product.stockStore2 === 0 ? '#e74c3c' : '#2c3e50'}">
                ${product.stockStore2}
                ${product.stockStore2 === 0 ? '❌' : ''}
            </td>
            <td style="padding: 10px; text-align: center; font-weight: bold;">${totalStock}</td>
            <td style="padding: 10px; text-align: center; color: ${statusColor}">${status}</td>
        `;
        tbody.appendChild(row);
    });
    
    // Update summary
    summary.innerHTML = `
        <strong>Summary:</strong> 
        Total Products: ${products.length} | 
        One Stop Total: ${totalStore1} | 
        Golden Total: ${totalStore2} | 
        Out of Stock: <span style="color: #e74c3c">${outOfStockCount}</span> | 
        Low Stock: <span style="color: #f39c12">${lowStockCount}</span>
    `;
    
    // Add search functionality
    setupStockSearch();
}

function setupStockSearch() {
    const searchInput = document.getElementById('stock-search');
    searchInput.value = ''; // Clear previous search
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredProducts = allStoreProducts.filter(product => 
            product.name.toLowerCase().includes(searchTerm)
        );
        populateStockTable(filteredProducts);
    });
}

// Close modal when clicking outside
document.getElementById('stock-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideStockLevels();
    }
});





