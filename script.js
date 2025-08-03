// Store configurations
const stores = {
  store1: { name: "One Stop", users: { "Cashier": "1234" } },
  store2: { name: "Golden", users: { "Cashier2": "1234" } }
};

let currentStore = null;
let currentUser = null;
let products = [];
let currentSales = [];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupEventListeners();
});

// Core Functions
function loadProducts() {
  fetch('products.json')
    .then(response => response.json())
    .then(data => {
      products = data;
      // Load from localStorage if available
      const savedProducts = localStorage.getItem('products');
      if (savedProducts) products = JSON.parse(savedProducts);
      populateDatalist();
      populateRestockItems();
    });
}

function setupEventListeners() {
  document.getElementById('item').addEventListener('input', updatePrice);
  document.getElementById('unit').addEventListener('change', updatePrice);
  ['quantity', 'price', 'discount', 'extra'].forEach(id => {
    document.getElementById(id).addEventListener('input', calculateTotal);
  });
  document.getElementById('sale-form').addEventListener('submit', processSale);
}

// Inventory Management
function updateStock(itemName, quantity) {
  const product = products.find(p => p.name === itemName);
  if (product) {
    product.stock = (product.stock || 0) + quantity;
    saveProducts();
    updatePrice(); // Refresh UI
  }
}

function saveProducts() {
  localStorage.setItem('products', JSON.stringify(products));
  populateDatalist();
  populateRestockItems();
}

// Sales Processing
function processSale(e) {
  e.preventDefault();

  const itemName = document.getElementById('item').value;
  const quantity = parseFloat(document.getElementById('quantity').value) || 0;
  const product = products.find(p => p.name === itemName);

  // Stock validation
  if (product && product.stock !== undefined) {
    if (quantity > product.stock) {
      alert(`Not enough stock! Only ${product.stock} available`);
      return;
    }
    if (product.stock - quantity < 5) {
      alert(`⚠️ Low stock warning! ${product.stock - quantity} will remain`);
    }
  }

  // Process sale
  const sale = {
    item: itemName,
    unit: document.getElementById('unit').value,
    quantity: quantity,
    price: parseFloat(document.getElementById('price').value) || 0,
    discount: parseFloat(document.getElementById('discount').value) || 0,
    extra: parseFloat(document.getElementById('extra').value) || 0,
    paymentMethod: document.getElementById('payment-method').value,
    total: calculateTotal(),
    timestamp: new Date().toLocaleString()
  };

  currentSales.push(sale);
  if (product) updateStock(itemName, -quantity);
  updateSalesTable();
  resetForm();
}

// Restock Functions
function showRestockDialog() {
  document.getElementById('restock-dialog').style.display = 'block';
}

function hideRestockDialog() {
  document.getElementById('restock-dialog').style.display = 'none';
}

function populateRestockItems() {
  const select = document.getElementById('restock-item');
  select.innerHTML = '<option value="">Select Item</option>';
  products.forEach(p => {
    const option = document.createElement('option');
    option.value = p.name;
    option.textContent = `${p.name} (Current: ${p.stock || 0})`;
    select.appendChild(option);
  });
}

function processRestock() {
  const itemName = document.getElementById('restock-item').value;
  const quantity = parseInt(document.getElementById('restock-qty').value);

  if (!itemName || !quantity) {
    alert('Please select an item and enter quantity');
    return;
  }

  updateStock(itemName, quantity);
  hideRestockDialog();
  alert(`${quantity} ${itemName} added to inventory`);
}

// UI Functions
function updatePrice() {
  const itemName = document.getElementById('item').value;
  const unit = document.getElementById('unit').value;
  const product = products.find(p => p.name === itemName);
  
  if (product) {
    document.getElementById('price').value = product.prices[unit] || '';
    document.getElementById('stock-display').textContent = 
      `Stock: ${product.stock !== undefined ? product.stock : 'N/A'}`;
  } else {
    document.getElementById('price').value = '';
    document.getElementById('stock-display').textContent = '';
  }
  calculateTotal();
}

// ... [Keep all your existing functions like checkLogin, selectStore, etc.] ...

// Enhanced submit function
function submitSaleToGoogleForm(sale) {
  const formUrl = "https://docs.google.com/forms/d/e/1FAIpQLSdjXVJj4HT31S5NU6-7KUBQz7xyU_d9YuZN4BzaD1T5Mg7Bjg/formResponse?submit=Submit";
  
  const formData = new URLSearchParams();
  // Add your form fields here
  formData.append("entry.902078713", sale.item);
  // ... other fields ...

  return fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString()
  });
}
