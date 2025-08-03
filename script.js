// Store configurations
const stores = {
  store1: {
    name: "One Stop",
    users: {
      "Cashier": "1234"
    }
  },
  store2: {
    name: "Golden",
    users: {
      "Cashier2": "1234"
    }
  }
};

let currentStore = null;
let currentUser = null;
let products = [];
let currentSales = [];

function checkLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("login-error");

  // Check if username exists in any store
  let validStore = null;
  
  for (const [storeId, store] of Object.entries(stores)) {
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
    // Highlight the user's store
    document.querySelector(`button[onclick="selectStore('${currentStore}')"]`)
      .classList.add('active-store');
  } else {
    error.textContent = "Invalid username or password";
  }
}

function selectStore(storeId) {
  if (storeId === currentStore) {
    // User selected their authorized store
    document.getElementById("store-selection").style.display = "none";
    document.getElementById("pos-container").style.display = "block";
    document.getElementById("store-name").textContent = stores[storeId].name;
    loadProducts();
  } else {
    alert("You are not authorized for this store");
  }
}

function loadProducts() {
  fetch('products.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load products');
      return response.json();
    })
    .then(data => {
      products = data;
      populateDatalist();
    })
    .catch(err => {
      console.error('Error loading products:', err);
      alert('Failed to load product data. Please check your connection.');
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

// Event listeners for price calculation
document.getElementById('item').addEventListener('input', updatePrice);
document.getElementById('unit').addEventListener('change', updatePrice);

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

