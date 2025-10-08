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
// ============ IMPROVED STOCK ADJUSTMENT FUNCTIONS ============
let adjustmentItems = [];

function showStockAdjustment() {
    adjustmentItems = []; // Reset adjustments
    document.getElementById('stock-adjustment-modal').style.display = 'flex';
    updateAdjustmentTable();
    setupAdjustmentSearch();
}

function hideStockAdjustment() {
    document.getElementById('stock-adjustment-modal').style.display = 'none';
}

function setupAdjustmentSearch() {
    const searchInput = document.getElementById('adjustment-search');
    const suggestions = document.getElementById('adjustment-suggestions');
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        suggestions.innerHTML = '';
        
        if (searchTerm.length < 2) {
            suggestions.style.display = 'none';
            return;
        }
        
        const filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm)
        );
        
        if (filteredProducts.length > 0) {
            filteredProducts.forEach(product => {
                const suggestionItem = document.createElement('div');
                suggestionItem.className = 'suggestion-item';
                suggestionItem.textContent = product.name;
                suggestionItem.addEventListener('click', () => {
                    searchInput.value = product.name;
                    suggestions.style.display = 'none';
                });
                suggestions.appendChild(suggestionItem);
            });
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener('click', function(e) {
        if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.style.display = 'none';
        }
    });
}

function addItemToAdjustment() {
    const searchInput = document.getElementById('adjustment-search');
    const itemName = searchInput.value.trim();
    
    if (!itemName) {
        showAdjustmentNotification('Please enter a product name', 'error');
        return;
    }
    
    // Find the product
    const product = products.find(p => p.name.toLowerCase() === itemName.toLowerCase());
    if (!product) {
        showAdjustmentNotification('Product not found', 'error');
        return;
    }
    
    // Check if item already in adjustments
    const existingItem = adjustmentItems.find(item => item.name === product.name);
    if (existingItem) {
        showAdjustmentNotification('Item already in adjustment list', 'error');
        return;
    }
    
    // Add to adjustments with improved structure
    adjustmentItems.push({
        id: product.name, // Using name as ID since your products don't have IDs
        name: product.name,
        currentStock: product.stock || 0,
        adjustmentType: 'add',
        quantity: 0,
        newStock: product.stock || 0,
        unit: 'pc' // Default unit
    });
    
    searchInput.value = ''; // Clear search
    document.getElementById('adjustment-suggestions').style.display = 'none';
    updateAdjustmentTable();
    showAdjustmentNotification('Product added to adjustment list', 'success');
}

function updateAdjustmentTable() {
    const tbody = document.getElementById('adjustment-table-body');
    const summary = document.getElementById('adjustment-summary');
    
    tbody.innerHTML = '';
    
    if (adjustmentItems.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="6">
                    <div class="empty-state">
                        <h3>No items added yet</h3>
                        <p>Search for products above and click "Add Item" to start adjusting stock</p>
                    </div>
                </td>
            </tr>
        `;
        summary.innerHTML = 'Items to adjust: 0';
        return;
    }
    
    adjustmentItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="product-name">${item.name}</td>
            <td class="stock-info">${item.currentStock} ${item.unit}</td>
            <td class="adjustment-type">
                <select class="adjustment-select" data-index="${index}">
                    <option value="add" ${item.adjustmentType === 'add' ? 'selected' : ''}>Add Stock</option>
                    <option value="remove" ${item.adjustmentType === 'remove' ? 'selected' : ''}>Remove Stock</option>
                    <option value="set" ${item.adjustmentType === 'set' ? 'selected' : ''}>Set Stock</option>
                </select>
            </td>
            <td>
                <input type="number" class="quantity-input" data-index="${index}" value="${item.quantity}" min="0">
            </td>
            <td class="new-stock">${item.newStock} ${item.unit}</td>
            <td>
                <button class="remove-btn" data-index="${index}">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Add event listeners to the new elements
    document.querySelectorAll('.adjustment-select').forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateAdjustmentItem(index, 'type', this.value);
        });
    });
    
    document.querySelectorAll('.quantity-input').forEach(input => {
        input.addEventListener('input', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateAdjustmentItem(index, 'quantity', parseInt(this.value) || 0);
        });
    });
    
    document.querySelectorAll('.remove-btn').forEach(button => {
        button.addEventListener('click', function() {
            const index = parseInt(this.getAttribute('data-index'));
            removeAdjustmentItem(index);
        });
    });
    
    summary.innerHTML = `Items to adjust: ${adjustmentItems.length}`;
}

function updateAdjustmentItem(index, field, value) {
    if (index < 0 || index >= adjustmentItems.length) return;
    
    const item = adjustmentItems[index];
    
    if (field === 'type') {
        item.adjustmentType = value;
    } else if (field === 'quantity') {
        item.quantity = value;
    }
    
    // Calculate new stock
    if (item.adjustmentType === 'add') {
        item.newStock = item.currentStock + item.quantity;
    } else if (item.adjustmentType === 'remove') {
        item.newStock = Math.max(0, item.currentStock - item.quantity);
    } else if (item.adjustmentType === 'set') {
        item.newStock = item.quantity;
    }
    
    updateAdjustmentTable();
}

function removeAdjustmentItem(index) {
    if (index < 0 || index >= adjustmentItems.length) return;
    
    const itemName = adjustmentItems[index].name;
    adjustmentItems.splice(index, 1);
    updateAdjustmentTable();
    showAdjustmentNotification(`"${itemName}" removed from adjustment list`, 'success');
}

function clearAdjustments() {
    if (adjustmentItems.length === 0) {
        showAdjustmentNotification('No items to clear', 'error');
        return;
    }
    
    if (confirm('Are you sure you want to clear all items?')) {
        adjustmentItems = [];
        updateAdjustmentTable();
        showAdjustmentNotification('All items cleared', 'success');
    }
}

function submitStockAdjustment() {
    if (adjustmentItems.length === 0) {
        showAdjustmentNotification('No items to adjust', 'error');
        return;
    }
    
    // Validate all items have a quantity
    const invalidItems = adjustmentItems.filter(item => 
        item.quantity <= 0 || (item.adjustmentType === 'set' && item.quantity < 0)
    );
    
    if (invalidItems.length > 0) {
        showAdjustmentNotification('Please set valid quantities for all items', 'error');
        return;
    }

    const submitBtn = document.querySelector('#stock-adjustment-modal .submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    let successCount = 0;
    const errors = [];

    // Submit each adjustment to Google Form
    function submitNext(index) {
        if (index >= adjustmentItems.length) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Adjustments';
            
            if (successCount > 0) {
                showAdjustmentNotification(`Successfully submitted ${successCount} stock adjustment(s)!`, 'success');
                setTimeout(() => {
                    adjustmentItems = [];
                    hideStockAdjustment();
                }, 2000);
            }
            
            if (errors.length > 0) {
                console.error('Failed submissions:', errors);
                showAdjustmentNotification(`${errors.length} adjustment(s) failed. Check console for details.`, 'error');
            }
            
            return;
        }

        const adjustment = adjustmentItems[index];
        
        // Submit to Google Form
        submitStockAdjustmentToGoogleForm(adjustment)
            .then(() => {
                successCount++;
                submitNext(index + 1);
            })
            .catch(err => {
                errors.push({ item: adjustment.name, error: err });
                submitNext(index + 1);
            });
    }

    submitNext(0);
}

function submitStockAdjustmentToGoogleForm(adjustment) {
    const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdjXVJj4HT31S5NU6-7KUBQz7xyU_d9YuZN4BzaD1T5Mg7Bjg/formResponse?submit=Submit";
    const formData = new URLSearchParams();
    
    // Format item name to indicate stock adjustment
    const itemName = `${adjustment.name} [STOCK ${adjustment.adjustmentType.toUpperCase()}]`;
    
    // Use the same form fields as sales
    formData.append("fvv", "1");
    formData.append("pageHistory", "0");
    formData.append("entry.902078713", itemName);
    formData.append("entry.448082825", adjustment.unit);
    formData.append("entry.617272247", adjustment.quantity.toString());
    formData.append("entry.591650069", "0"); // Price = 0
    formData.append("entry.209491416", "0"); // Discount = 0
    formData.append("entry.1362215713", "0"); // Extra = 0
    formData.append("entry.492804547", "0"); // Total = 0
    formData.append("entry.197957478", "STOCK_ADJUST");
    formData.append("entry.370318910", stores[adjustment.store || currentStore].name);

    // Submit to Google Form (no-cors so we can't check response)
    return fetch(formUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
    });
}

function showAdjustmentNotification(message, type) {
    // Create notification element if it doesn't exist
    let notification = document.getElementById('adjustment-notification');
    if (!notification) {
        notification = document.createElement('div');
        notification.id = 'adjustment-notification';
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 6px;
            color: white;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 1000;
            display: none;
        `;
        document.body.appendChild(notification);
    }
    
    notification.textContent = message;
    notification.className = type === 'success' ? 'success' : 'error';
    notification.style.display = 'block';
    notification.style.backgroundColor = type === 'success' ? '#27ae60' : '#e74c3c';
    
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}
