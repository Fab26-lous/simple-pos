const correctPassword = "1234"; // Change this to your preferred password

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

let products = [];

fetch('products.json')
  .then(response => response.json())
  .then(data => {
    products = data;
    populateDatalist();
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
}

function calculateTotal(updateUI = false) {
  const quantity = parseFloat(document.getElementById('quantity').value) || 0;
  const price = parseFloat(document.getElementById('price').value) || 0;
  const discount = parseFloat(document.getElementById('discount').value) || 0;
  const extra = parseFloat(document.getElementById('extra').value) || 0;

  const subtotal = quantity * price;
  const total = subtotal - discount + extra;

  if (updateUI) {
    document.getElementById('total').value = total.toFixed(2);
  }

  return total;
}

['quantity', 'price', 'discount', 'extra'].forEach(id => {
  document.getElementById(id).addEventListener('input', () => calculateTotal(true));
});

// ⛔️ REMOVE download to CSV
// document.getElementById('download').addEventListener(...)
// DELETE that button from your HTML too if it's still there

document.getElementById('sale-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const item = document.getElementById('item').value;
  const unit = document.getElementById('unit').value;
  const quantity = parseFloat(document.getElementById('quantity').value) || 0;
  const price = parseFloat(document.getElementById('price').value) || 0;
  const discount = parseFloat(document.getElementById('discount').value) || 0;
  const extra = parseFloat(document.getElementById('extra').value) || 0;
  const paymentMethod = document.getElementById('payment-method').value;
  const total = calculateTotal();

  const sale = { item, unit, quantity, price, discount, extra, paymentMethod, total };

  // ✅ Send to Google Sheet
  sendSaleToSheet(sale);

  this.reset();
  document.getElementById('total').value = '';
});

function sendSaleToSheet(sale) {
  fetch("YOUR_WEB_APP_URL_HERE", {
    method: "POST",
    body: JSON.stringify(sale),
    headers: {
      "Content-Type": "application/json"
    }
  })
  .then(res => res.json())
  .then(response => {
    if (response.status === "success") {
      console.log("Sale saved:", response);
      alert("Sale recorded successfully!");
    } else {
      console.error("Error from script:", response.message);
      alert("Failed to save sale: " + response.message);
    }
  })
  .catch(err => {
    console.error("Fetch error:", err);
    alert("Failed to save. Please check your internet or script.");
  });
}

