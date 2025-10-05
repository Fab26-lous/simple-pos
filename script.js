console.log('=== POS SYSTEM LOADED ===');

// CSV PARSING FUNCTION
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
    
    return result.map(function(cell) {
        return cell.trim().replace(/^"|"$/g, '');
    });
}

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

// ============ GOOGLE SHEETS INTEGRATION ============
const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQMoJA4uj6dsPvt0LjS5wiqPb18u7TRdmuXa4NVht_lbM58Auqxb_JOPld2sIqOcLb7wyzx0KJaTCsM/pub?gid=0&single=true&output=csv';

async function loadProductsFromGoogleSheets() {
    try {
        console.log('Loading from Google Sheets...');
        const response = await fetch(GOOGLE_SHEETS_CSV_URL);
        const csvText = await response.text();
        const products = parseCSVToProducts(csvText);
        console.log('Loaded ' + products.length + ' products from Google Sheets for store: ' + currentStore);
        return products;
    } catch (error) {
        console.error('Google Sheets error:', error);
        return await loadProductsFromJSON();
    }
}

function parseCSVToProducts(csvText) {
    const lines = csvText.split('\n').filter(function(line) {
        return line.trim();
    });
    const products = [];
    
    console.log('Current store:', currentStore);

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const cells = line.split(',').map(function(cell) {
            return cell.trim();
        });
        
        if (cells.length >= 6) {
            let stock = 0;
            if (currentStore === 'store1') {
                stock = parseInt(cells[4]) || 0;
            } else if (currentStore === 'store2') {
                stock = parseInt(cells[5]) || 0;
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

// ============ MAIN POS VARIABLES ============
let currentStore = null;
let currentUser = null;
let products = [];
let currentSales = [];

// ============ CORE POS FUNCTIONS ============
function checkLogin() {
    console.log('=== LOGIN BUTTON CLICKED ===');
    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const error = document.getElementById("login-error");

    let validStore = null;
    
    for (const storeId in stores) {
        const store = stores[storeId];
        if (store.users[username] && store.users[username] === password) {
            validStore = storeId;
            break;
        }
    }

    if (validStore) {
        currentStore = validStore;
        currentUser = username;
        document.getElementById("login-container").style.display = "none";
        document.getElementById("store-selection").style.display = "block";
        var storeButton = document.querySelector('button[onclick="selectStore(\'' + currentStore + '\')"]');
        if (storeButton) {
            storeButton.classList.add('active-store');
        }
        console.log('Login successful!');
    } else {
        error.textContent = "Invalid username or password";
    }
}

function selectStore(storeId) {
    if (storeId === currentStore) {
        document.getElementById("store-selection").style.display = "none";
        document.getElementById("pos-container").style.display = "block";
        document.getElementById("store-name").textContent = stores[storeId].name;
        loadProducts();
    } else {
        alert("You are not authorized for this store");
    }
}

function loadProducts() {
    loadProductsFromGoogleSheets()
        .then(function(data) {
            products = data;
            populateDatalist();
            console.log('Loaded ' + products.length + ' products for ' + stores[currentStore].name);
        })
        .catch(function(err) {
            console.error('Error loading products:', err);
            alert('Failed to load product data.');
        });
}

function populateDatalist() {
    const datalist = document.getElementById('item-list');
    datalist.innerHTML = '';
    products.forEach(function(p) {
        const option = document.createElement('option');
        option.value = p.name;
        datalist.appendChild(option);
    });
}

function updatePrice() {
    const itemName = document.getElementById('item').value.trim();
    const unit = document.getElementById('unit').value;
    const product = products.find(function(p) {
        return p.name.toLowerCase() === itemName.toLowerCase();
    });
    
    if (product) {
        const price = product.prices[unit];
        document.getElementById('price').value = price;
    } else {
        document.getElementById('price').value = '';
    }
    
    calculateTotal();
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

// Event listeners
['quantity', 'price', 'discount', 'extra'].forEach(function(id) {
  document.getElementById(id).addEventListener('input', calculateTotal);
});
document.getElementById('item').addEventListener('input', updatePrice);
document.getElementById('unit').addEventListener('change', updatePrice);

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
    item: item,
    unit: unit,
    quantity: quantity,
    price: price,
    discount: discount,
    extra: extra,
    paymentMethod: paymentMethod,
    total: total,
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
  
  currentSales.forEach(function(sale, index) {
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
  progress.innerHTML = 'Submitting 0/' + currentSales.length + ' items...';
  submitBtn.parentNode.appendChild(progress);

  let successCount = 0;
  const errors = [];
  
  function submitNext(index) {
    if (index >= currentSales.length) {
      progress.innerHTML = 'Completed: ' + successCount + '/' + currentSales.length + ' items submitted successfully';
      
      if (errors.length > 0) {
        progress.innerHTML += '<br>' + errors.length + ' items failed';
        console.error('Failed submissions:', errors);
      }
      
      if (successCount > 0) {
        currentSales.splice(0, successCount);
        updateSalesTable();
      }
      
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit All Items';
      
      setTimeout(function() {
        progress.remove();
      }, 5000);
      
      return;
    }

    progress.innerHTML = 'Submitting ' + (index + 1) + '/' + currentSales.length + ' items...';
    
    submitSaleToGoogleForm(currentSales[index])
      .then(function() {
        successCount++;
        submitNext(index + 1);
      })
      .catch(function(err) {
        errors.push({ index: index, error: err });
        submitNext(index + 1);
      });
  }

  submitNext(0);
}

function submitSaleToGoogleForm(sale) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdjXVJj4HT31S5NU6-7KUBQz7xyU_d9YuZN4BzaD1T5Mg7Bjg/formResponse?submit=Submit";
  const formData = new URLSearchParams();
  
  formData.append("fvv", "1");
  formData.append("pageHistory", "0");
  formData.append("entry.902078713", sale.item);
  formData.append("entry.448082825", sale.unit);
  formData.append("entry.617272247", sale.quantity.toString());
  formData.append("entry.591650069", sale.price.toString());
  formData.append("entry.209491416", sale.discount.toString());
  formData.append("entry.1362215713", sale.extra.toString());
  formData.append("entry.492804547", sale.total.toString());
  formData.append("entry.197957478", sale.paymentMethod);
  formData.append("entry.370318910", stores[currentStore].name);

  return fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });
}

// ============ STOCK DISPLAY FUNCTIONS ============
let allStoreProducts = [];

async function loadAllStoreProducts() {
    try {
        console.log('Loading products for both stores...');
        const response = await fetch(GOOGLE_SHEETS_CSV_URL);
        const csvText = await response.text();
        
        const lines = csvText.split('\n').filter(function(line) {
            return line.trim();
        });
        allStoreProducts = [];
        
        for (let i = 1; i < lines.length; i++) {
            const cells = parseCSVLine(lines[i]);
            
            if (cells.length >= 6) {
                const product = {
                    name: (cells[0] && cells[0].trim()) || 'Unknown',
                    prices: {
                        ct: parseFloat(cells[1]) || 0,
                        dz: parseFloat(cells[2]) || 0, 
                        pc: parseFloat(cells[3]) || 0
                    },
                    stockStore1: parseInt(cells[4]) || 0,
                    stockStore2: parseInt(cells[5]) || 0
                };
                
                if (product.name && product.name !== 'Product Name') {
                    allStoreProducts.push(product);
                }
            }
        }
        
        console.log('Loaded products for stock display:', allStoreProducts);
        return allStoreProducts;
        
    } catch (error) {
        console.error('Error:', error);
        return [];
    }
}

function showStockLevels() {
    loadAllStoreProducts().then(function(products) {
        populateStockTable(products);
        document.getElementById('stock-modal').style.display = 'flex';
    });
}

function hideStockLevels() {
    document.getElementById('stock-modal').style.display = 'none';
}

function populateStockTable(products) {
    console.log('populateStockTable called with:', products.length, 'products');
    const tbody = document.getElementById('stock-table-body');
    const summary = document.getElementById('stock-summary');
    
    tbody.innerHTML = '';
    
    let totalStore1 = 0;
    let totalStore2 = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;
    
    products.forEach(function(product) {
        const totalStock = product.stockStore1 + product.stockStore2;
        totalStore1 += product.stockStore1;
        totalStore2 += product.stockStore2;
        
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
    
    summary.innerHTML = `
        <strong>Summary:</strong> 
        Total Products: ${products.length} | 
        One Stop Total: ${totalStore1} | 
        Golden Total: ${totalStore2} | 
        Out of Stock: <span style="color: #e74c3c">${outOfStockCount}</span> | 
        Low Stock: <span style="color: #f39c12">${lowStockCount}</span>
    `;
    
    setupStockSearch();
}
function setupStockSearch() {
    const searchInput = document.getElementById('stock-search');
    if (!searchInput) {
        console.error('Stock search input not found!');
        return;
    }
    
    searchInput.value = ''; // Clear previous search
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        console.log('Searching for:', searchTerm, '| Length:', searchTerm.length);
        
        // Check if we have products to search through
        if (!allStoreProducts || allStoreProducts.length === 0) {
            console.log('No products available to search');
            return;
        }
        
        if (searchTerm === '') {
            // If search is empty, show all products
            console.log('Showing all products');
            populateStockTable(allStoreProducts);
        } else {
            // Filter products that match the search term
            const filteredProducts = allStoreProducts.filter(function(product) {
                const match = product.name.toLowerCase().includes(searchTerm);
                console.log('Checking:', product.name, 'against:', searchTerm, 'Match:', match);
                return match;
            });
            console.log('Found', filteredProducts.length, 'matching products');
            populateStockTable(filteredProducts);
        }
    });
}
document.getElementById('stock-modal').addEventListener('click', function(e) {
    if (e.target === this) {
        hideStockLevels();
    }
});
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded, setting up price updates...');
    // Set up initial price update after a short delay
    setTimeout(updatePrice, 500);
});








