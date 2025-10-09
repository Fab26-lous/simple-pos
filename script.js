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
                    stockStore1: cells[4] || '0',
                    stockStore2: cells[5] || '0'
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
        setupStockSearch();
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
    
    let outOfStockCount = 0;
    let lowStockCount = 0;
    
    products.forEach(function(product) {
        const isStore1Out = product.stockStore1 === '0' || product.stockStore1 === '0 pc' || product.stockStore1 === '';
        const isStore2Out = product.stockStore2 === '0' || product.stockStore2 === '0 pc' || product.stockStore2 === '';
        const isOutOfStock = isStore1Out && isStore2Out;
        
        let status = '✅ In Stock';
        let statusColor = '#27ae60';
        
        if (isOutOfStock) {
            status = '❌ Out of Stock';
            statusColor = '#e74c3c';
            outOfStockCount++;
        } else if (isStore1Out || isStore2Out) {
            status = '⚠️ Low Stock';
            statusColor = '#f39c12';
            lowStockCount++;
        }
        
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #eee';
        row.innerHTML = `
            <td style="padding: 10px; font-weight: bold;">${product.name}</td>
            <td style="padding: 10px; text-align: center; color: ${isStore1Out ? '#e74c3c' : '#2c3e50'}">
                ${product.stockStore1}
                ${isStore1Out ? '❌' : ''}
            </td>
            <td style="padding: 10px; text-align: center; color: ${isStore2Out ? '#e74c3c' : '#2c3e50'}">
                ${product.stockStore2}
                ${isStore2Out ? '❌' : ''}
            </td>
            <td style="padding: 10px; text-align: center; color: ${statusColor}">${status}</td>
        `;
        tbody.appendChild(row);
    });
    
    summary.innerHTML = `
        <strong>Summary:</strong> 
        Total Products: ${products.length} | 
        Out of Stock: <span style="color: #e74c3c">${outOfStockCount}</span> | 
        Low Stock: <span style="color: #f39c12">${lowStockCount}</span>
    `;
}

function setupStockSearch() {
    const searchInput = document.getElementById('stock-search');
    
    if (!searchInput) {
        return;
    }
    
    searchInput.replaceWith(searchInput.cloneNode(true));
    
    const freshInput = document.getElementById('stock-search');
    
    freshInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        console.log('Searching for:', searchTerm);
        
        if (!allStoreProducts || allStoreProducts.length === 0) {
            return;
        }
        
        if (searchTerm === '') {
            populateStockTable(allStoreProducts);
        } else {
            const filteredProducts = allStoreProducts.filter(function(product) {
                return product.name.toLowerCase().includes(searchTerm);
            });
            populateStockTable(filteredProducts);
        }
    });
    
    freshInput.value = '';
}

// ============ STOCK ADJUSTMENT FUNCTIONS ============
let adjustmentItems = [];

function showStockAdjustment() {
    adjustmentItems = [];
    document.getElementById('stock-adjustment-modal').style.display = 'flex';
    document.getElementById('adjustment-store-name').textContent = stores[currentStore].name;
    updateAdjustmentTable();
    setupAdjustmentSearch();
}

function hideStockAdjustment() {
    document.getElementById('stock-adjustment-modal').style.display = 'none';
}

function setupAdjustmentSearch() {
    const searchInput = document.getElementById('adjustment-search');
    const suggestions = document.getElementById('adjustment-suggestions');
    
    if (!searchInput || !suggestions) return;
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        suggestions.innerHTML = '';
        
        if (searchTerm.length < 1) {
            suggestions.style.display = 'none';
            return;
        }
        
        const filteredProducts = products.filter(product => 
            product.name.toLowerCase().includes(searchTerm)
        );
        
        if (filteredProducts.length > 0) {
            filteredProducts.forEach(product => {
                const suggestionItem = document.createElement('div');
                suggestionItem.style.cssText = 'padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f1f1f1;';
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
        alert('Please enter a product name');
        return;
    }
    
    const product = products.find(p => p.name.toLowerCase() === itemName.toLowerCase());
    if (!product) {
        alert('Product not found');
        return;
    }
    
    const existingItem = adjustmentItems.find(item => item.name === product.name);
    if (existingItem) {
        alert('Item already in adjustment list');
        return;
    }
    
    adjustmentItems.push({
        id: product.name,
        name: product.name,
        unit: 'pc',
        adjustmentType: 'add',
        quantity: 0
    });
    
    searchInput.value = '';
    const suggestions = document.getElementById('adjustment-suggestions');
    if (suggestions) suggestions.style.display = 'none';
    updateAdjustmentTable();
}

function updateAdjustmentTable() {
    const tbody = document.getElementById('adjustment-table-body');
    const summary = document.getElementById('adjustment-summary');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (adjustmentItems.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-state-row">
                <td colspan="6" style="text-align: center; padding: 40px 20px; color: #7f8c8d;">
                    <h3 style="margin: 0 0 10px 0;">No items added yet</h3>
                    <p style="margin: 0;">Search for products above and click "Add Item" to start adjusting stock</p>
                </td>
            </tr>
        `;
        if (summary) summary.innerHTML = 'Items to adjust: 0';
        return;
    }
    
    adjustmentItems.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="padding: 12px 15px; font-weight: 600; color: #2c3e50;">${item.name}</td>
            <td style="padding: 12px 15px;">
                <select class="unit-select" data-index="${index}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="pc" ${item.unit === 'pc' ? 'selected' : ''}>Pieces (pc)</option>
                    <option value="dz" ${item.unit === 'dz' ? 'selected' : ''}>Dozens (dz)</option>
                    <option value="ct" ${item.unit === 'ct' ? 'selected' : ''}>Cartons (ct)</option>
                </select>
            </td>
            <td style="padding: 12px 15px;">
                <select class="adjustment-select" data-index="${index}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="add" ${item.adjustmentType === 'add' ? 'selected' : ''}>Add Stock</option>
                    <option value="remove" ${item.adjustmentType === 'remove' ? 'selected' : ''}>Remove Stock</option>
                    <option value="set" ${item.adjustmentType === 'set' ? 'selected' : ''}>Set Stock</option>
                </select>
            </td>
            <td style="padding: 12px 15px;">
                <input type="number" class="quantity-input" data-index="${index}" value="${item.quantity}" min="0" style="width: 80px; padding: 8px; border: 1px solid #ddd; border-radius: 4px; text-align: center;">
            </td>
            <td style="padding: 12px 15px;">
                <button class="remove-btn" data-index="${index}" style="background-color: #e74c3c; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">Remove</button>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    document.querySelectorAll('.unit-select').forEach(select => {
        select.addEventListener('change', function() {
            const index = parseInt(this.getAttribute('data-index'));
            updateAdjustmentItem(index, 'unit', this.value);
        });
    });
    
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
    
    if (summary) summary.innerHTML = `Items to adjust: ${adjustmentItems.length}`;
}

function updateAdjustmentItem(index, field, value) {
    if (index < 0 || index >= adjustmentItems.length) return;
    
    const item = adjustmentItems[index];
    
    if (field === 'type') {
        item.adjustmentType = value;
    } else if (field === 'quantity') {
        item.quantity = value;
    } else if (field === 'unit') {
        item.unit = value;
    }
    
    updateAdjustmentTable();
}

function removeAdjustmentItem(index) {
    if (index < 0 || index >= adjustmentItems.length) return;
    
    const itemName = adjustmentItems[index].name;
    adjustmentItems.splice(index, 1);
    updateAdjustmentTable();
    alert(`"${itemName}" removed from adjustment list`);
}

function clearAdjustments() {
    if (adjustmentItems.length === 0) {
        alert('No items to clear');
        return;
    }
    
    if (confirm('Are you sure you want to clear all items?')) {
        adjustmentItems = [];
        updateAdjustmentTable();
        alert('All items cleared');
    }
}

function submitStockAdjustment() {
    console.log('=== STOCK ADJUSTMENT SUBMISSION STARTED ===');
    
    if (adjustmentItems.length === 0) {
        alert('No items to adjust');
        return;
    }
    
    const invalidItems = adjustmentItems.filter(item => 
        item.quantity <= 0 || (item.adjustmentType === 'set' && item.quantity < 0)
    );
    
    if (invalidItems.length > 0) {
        alert('Please set valid quantities for all items');
        return;
    }

    console.log('Adjustment items to submit:', adjustmentItems);

    const submitBtn = document.querySelector('#stock-adjustment-modal button[onclick="submitStockAdjustment()"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Submit Adjustments';
    
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Submitting...';
    }

    let successCount = 0;
    const errors = [];

    function submitNext(index) {
    if (index >= adjustmentItems.length) {
        console.log('=== SUBMISSION COMPLETE ===');
        console.log('Successfully submitted:', successCount, 'items');
        console.log('Errors:', errors);
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
        
        if (successCount > 0) {
            alert(`✅ Successfully submitted ${successCount} stock adjustment(s)!`);
            adjustmentItems = [];
            hideStockAdjustment();
        } else {
            alert('❌ No adjustments were submitted. Check browser console for errors.');
        }
        
        return;
    }
    // ... rest of the function remains the same
}

        const adjustment = adjustmentItems[index];
        console.log(`Submitting item ${index + 1}:`, adjustment);
        
        submitStockAdjustmentToGoogleForm(adjustment)
            .then(() => {
                console.log(`✅ Success: ${adjustment.name}`);
                successCount++;
                submitNext(index + 1);
            })
            .catch(err => {
                console.error(`❌ Failed: ${adjustment.name}`, err);
                errors.push({ item: adjustment.name, error: err });
                submitNext(index + 1);
            });
    }

    submitNext(0);
}

// Ensure a hidden iframe exists (so hidden form submits don't navigate the main window)
function ensureHiddenIframe() {
  const iframeId = 'google-forms-hidden-iframe';
  if (!document.getElementById(iframeId)) {
    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.name = iframeId;
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
  }
  return 'google-forms-hidden-iframe';
}

// Robust submit function: fetch first, fallback to hidden-form-only on real error.
// Prevents duplicate fallback and avoids navigation by targeting an invisible iframe.
async function submitStockAdjustmentToGoogleForm(adjustment) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSeTdAktfy1tm486oSh64FA7L7pTTgxaWH01-fDUSbSpJ6QV2g/formResponse";

  // Map values if you need (or send raw). Keep consistent with your maps.
  const UNIT_MAP = { pc: 'Pieces', dz: 'Dozen', ct: 'Carton' };
  const TYPE_MAP = { add: 'Add', remove: 'Remove', adjust: 'Adjust' };

  const unitValue = UNIT_MAP[(adjustment.unit || '').toLowerCase()] || adjustment.unit || '';
  const typeValue = TYPE_MAP[(adjustment.adjustmentType || '').toLowerCase()] || adjustment.adjustmentType || '';
  const storeValue = stores[currentStore].name || '';

  // Build payload
  const payload = new URLSearchParams();
  payload.append('entry.1351663693', adjustment.name || '');
  payload.append('entry.2099316372', unitValue);
  payload.append('entry.1838734272', String(adjustment.quantity || 0));
  payload.append('entry.1785029976', typeValue);
  payload.append('entry.1678851527', storeValue);

  console.log('📤 submitStockAdjustment: attempting fetch for', adjustment.name, Object.fromEntries(payload));

  // Avoid double-sending same adjustment: simple in-memory lock
  if (adjustment._submitting) {
    console.warn('⚠️ Adjustment already submitting, skipping duplicate:', adjustment.name);
    return { status: 'skipped-duplicate' };
  }
  adjustment._submitting = true;

  try {
    // Do fetch; do NOT set custom headers (let browser set content-type for URLSearchParams)
    const response = await fetch(formUrl, {
      method: 'POST',
      body: payload
    });

    // If fetch succeeded (no network error), assume recorded. We don't run fallback.
    // response.ok may be false for opaque responses; but we do NOT fallback in that case
    // because fallback would create duplicates when fetch actually succeeded.
    console.log('✅ fetch completed (may be opaque):', response);
    adjustment._submitting = false;
    return { status: 'ok', method: 'fetch', response };
  } catch (fetchErr) {
    console.warn('⚠️ fetch threw error (likely CORS). Proceeding to hidden-form fallback:', fetchErr);

    // Hidden-form fallback: submit to invisible iframe so the main window does not navigate
    try {
      ensureHiddenIframe(); // creates iframe with name 'google-forms-hidden-iframe' if missing
      const iframeName = 'google-forms-hidden-iframe';
      const form = document.createElement('form');
      form.action = formUrl;
      form.method = 'POST';
      form.target = iframeName; // important: prevents navigation of main window
      form.style.display = 'none';

      // add inputs
      const fields = {
        'entry.1351663693': adjustment.name || '',
        'entry.2099316372': unitValue,
        'entry.1838734272': String(adjustment.quantity || 0),
        'entry.1785029976': typeValue,
        'entry.1678851527': storeValue
      };

      for (const key in fields) {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = key;
        input.value = fields[key];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();

      // remove form after short delay
      setTimeout(() => form.remove(), 2000);

      console.log('🔁 Hidden-form fallback submitted to iframe for', adjustment.name);
      adjustment._submitting = false;
      return { status: 'ok', method: 'form-fallback' };
    } catch (formErr) {
      console.error('❌ Hidden-form fallback failed:', formErr);
      adjustment._submitting = false;
      throw formErr;
    }
  }
}

