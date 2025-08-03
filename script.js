// Store configurations
const stores = {
  store1: { name: "One Stop", users: { "Cashier": "1234" } },
  store2: { name: "Golden", users: { "Cashier2": "1234" } }
};

let currentStore = null;
let currentUser = null;
let products = [];
let currentSales = [];

function checkLogin() {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const errorElement = document.getElementById("login-error");

  // Clear previous errors
  errorElement.textContent = "";

  // Validate inputs
  if (!username || !password) {
    errorElement.textContent = "Please enter both username and password";
    return;
  }

  // Check credentials
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
    document.getElementById("pos-container").style.display = "block";
    document.getElementById("store-name").textContent = stores[validStore].name;
    loadProducts();
  } else {
    errorElement.textContent = "Invalid username or password";
    // Clear password field
    document.getElementById("password").value = "";
  }
}
// Initialize
document.addEventListener('DOMContentLoaded', () => {
  loadProducts();
  setupEventListeners();
});
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
  const product = products.find(p => p.name === itemName);
  
  if (product) {
    const stockDisplay = document.getElementById('stock-display');
    stockDisplay.textContent = `Stock: ${product.stock}`;
    
    // Highlight low stock
    if (product.stock < 5) {
      stockDisplay.classList.add('low-stock');
    } else {
      stockDisplay.classList.remove('low-stock');
    }
  }
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
// Restock Function
function restockItem() {
  const itemName = prompt("Enter item name to restock:");
  const quantity = parseInt(prompt("Enter restock quantity:"));
  
  if (itemName && quantity) {
    const product = products.find(p => p.name === itemName);
    if (product) {
      product.stock += quantity;
      saveProducts();
      updatePrice(); // Refresh display
      alert(`${quantity} ${itemName} added. New stock: ${product.stock}`);
    }
  }
}

// Inventory Report
function generateReport() {
  let report = "INVENTORY REPORT\n\n";
  products.forEach(p => {
    report += `${p.name.padEnd(20)} ${p.stock.toString().padStart(4)} units\n`;
  });
  
  // Display in new window
  const reportWindow = window.open('', '_blank');
  reportWindow.document.write(`<pre>${report}</pre>`);
}

// Save to localStorage
function saveProducts() {
  localStorage.setItem('inventory', JSON.stringify(products));
  populateDatalist();
}


