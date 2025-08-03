const correctPassword = "1234"; // Change this to your preferred password
let products = [];
let currentSales = []; // Array to store multiple sales

// Login function
function checkLogin() {
  const entered = document.getElementById("password").value;
  const error = document.getElementById("login-error");
  if (entered === correctPassword) {
    document.getElementById("login-container").style.display = "none";
    document.getElementById("pos-container").style.display = "block";
    document.getElementById("item").focus();
  } else {
    error.textContent = "Incorrect password. Try again.";
  }
}

// Load products
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

// Populate item datalist
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

// Update price when item or unit changes
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

// Calculate total for current item
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

// Handle form submission (adds to order)
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

// Reset the form after adding an item
function resetForm() {
  document.getElementById('sale-form').reset();
  document.getElementById('price').value = '';
  document.getElementById('total').value = '';
  document.getElementById('item').focus();
}

// Update the sales table with all items
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
  
  // Show/hide action buttons
  const submitBtn = document.getElementById('submit-all-btn');
  const clearBtn = document.getElementById('clear-all-btn');
  
  if (currentSales.length > 0) {
    submitBtn.style.display = 'inline-block';
    clearBtn.style.display = 'inline-block';
    
    // Add grand total row
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

// Remove a sale from the order
function removeSale(index) {
  currentSales.splice(index, 1);
  updateSalesTable();
}

// Clear all items from the order
function clearAllSales() {
  if (confirm('Are you sure you want to clear all items?')) {
    currentSales = [];
    updateSalesTable();
  }
}

// Submit all items to Google Forms
function submitAllSales() {
  if (currentSales.length === 0) {
    alert('No items to submit');
    return;
  }

  const submitBtn = document.getElementById('submit-all-btn');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting...';

  // Create progress indicator
  const progress = document.createElement('div');
  progress.style.margin = '10px 0';
  progress.style.fontWeight = 'bold';
  progress.innerHTML = `Submitting 0/${currentSales.length} items...`;
  submitBtn.parentNode.appendChild(progress);

  let successCount = 0;
  const errors = [];
  
  const submitNext = (index) => {
    if (index >= currentSales.length) {
      // All submissions complete
      progress.innerHTML = `Completed: ${successCount}/${currentSales.length} items submitted successfully`;
      
      if (errors.length > 0) {
        progress.innerHTML += `<br>${errors.length} items failed`;
        console.error('Failed submissions:', errors);
      }
      
      if (successCount > 0) {
        currentSales.splice(0, successCount); // Remove successful ones
        updateSalesTable();
      }
      
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit All Items';
      
      // Remove progress after 5 seconds
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

  // Start submitting with a small delay between each
  submitNext(0);
}

// Submit individual sale to Google Form
function submitSaleToGoogleForm(sale) {
  return new Promise((resolve, reject) => {
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

    // Add a small random delay between submissions (100-500ms)
    setTimeout(() => {
      fetch(formUrl, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: formData.toString()
      })
      .then(() => resolve())
      .catch(err => reject(err));
    }, 100 + (400 * Math.random()));
  });
}
