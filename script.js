const correctPassword = "1234"; // Change this to your preferred password
let products = [];
let currentSales = []; // Array to store multiple sales

function checkLogin() {
  const entered = document.getElementById("password").value;
  const error = document.getElementById("login-error");
  if (entered === correctPassword) {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("pos-container").style.display = "block";
  } else {
    error.textContent = "Incorrect password. Try again.";
  }
}

// Fetch products
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

// Auto-calculate when inputs change
['quantity', 'price', 'discount', 'extra'].forEach(id => {
  document.getElementById(id).addEventListener('input', calculateTotal);
});

// Handle form submission (now adds to sales table)
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

  // Add to current sales array
  const sale = {
    item, 
    unit, 
    quantity, 
    price, 
    discount, 
    extra, 
    paymentMethod, 
    total,
    timestamp: new Date().toLocaleTimeString()
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
  
  // Add grand total row
  if (currentSales.length > 0) {
    const footerRow = document.createElement('tr');
    footerRow.innerHTML = `
      <td colspan="7" style="text-align: right;"><strong>Grand Total:</strong></td>
      <td><strong>${grandTotal.toFixed(2)}</strong></td>
      <td colspan="2">
        <button onclick="submitAllSales()">Submit All</button>
        <button onclick="clearAllSales()">Clear All</button>
      </td>
    `;
    tbody.appendChild(footerRow);
  }
}

function removeSale(index) {
  currentSales.splice(index, 1);
  updateSalesTable();
}

function clearAllSales() {
  if (confirm('Are you sure you want to clear all sales?')) {
    currentSales = [];
    updateSalesTable();
  }
}

function submitAllSales() {
  if (currentSales.length === 0) {
    alert('No sales to submit');
    return;
  }
  
  // Submit each sale one by one
  const promises = currentSales.map(sale => {
    return submitSaleToGoogleForm(sale);
  });
  
  Promise.all(promises)
    .then(() => {
      alert('All sales submitted successfully!');
      currentSales = [];
      updateSalesTable();
    })
    .catch(err => {
      console.error('Error submitting some sales:', err);
      alert('Some sales may not have been submitted. Please check your connection.');
    });
}

function submitSaleToGoogleForm(sale) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLScvdliK9bPE9ehvA7FVtc3cYnaFhBrwh-qTB_EyfH38pWzLdA/formResponse";

  const formData = new URLSearchParams();
  formData.append("entry.1049372289", sale.item);
  formData.append("entry.1483059350", sale.unit);
  formData.append("entry.573514662", sale.quantity);
  formData.append("entry.1489672505", sale.price);
  formData.append("entry.1474609854", sale.discount);
  formData.append("entry.204222640", sale.extra);
  formData.append("entry.1933162022", sale.total);
  formData.append("entry.1676608087", sale.paymentMethod);

  return fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  });
}
