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

// Google Sheets integration code
const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQMoJA4uj6dsPvt0LjS5wiqPb18u7TRdmuXa4NVht_lbM58Auqxb_JOPld2sIqOcLb7wyzx0KJaTCsM/pub?gid=0&single=true&output=csv';

async function loadProductsFromGoogleSheets() {
    // ... your existing Google Sheets code
}

function parseCSVToProducts(csvText) {
    // ... your existing parsing code  
}

async function loadProductsFromJSON() {
    // ... your existing JSON fallback code
}

// Your existing variables
let currentStore = null;
let currentUser = null;
let products = [];
let currentSales = [];

// Your existing functions
function checkLogin() {
    // ... your existing login function
}

function selectStore(storeId) {
    // ... your existing store selection
}

function loadProducts() {
    // ... your existing load products
}

function populateDatalist() {
    // ... your existing datalist function
}

function updatePrice() {
    // ... your existing update price
}

function calculateTotal() {
    // ... your existing calculate total
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
        const lines = csvText.split('\n').filter(line => line.trim());
        
        allStoreProducts = [];
        
        // Skip header row
        for (let i = 1; i < lines.length; i++) {
            const cells = lines[i].split(',').map(cell => cell.trim());
            
            if (cells.length >= 6) {
                const product = {
                    name: cells[0],
                    prices: {
                        ct: parseFloat(cells[1]) || 0,
                        dz: parseFloat(cells[2]) || 0,
                        pc: parseFloat(cells[3]) || 0
                    },
                    stockStore1: parseInt(cells[4]) || 0, // One Stop
                    stockStore2: parseInt(cells[5]) || 0  // Golden
                };
                
                if (product.name && product.name !== 'Product Name') {
                    allStoreProducts.push(product);
                }
            }
        }
        
        console.log('Loaded products for both stores:', allStoreProducts);
        return allStoreProducts;
        
    } catch (error) {
        console.error('Error loading all store products:', error);
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
