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

  const sale = { item, unit, quantity, price, discount, extra, paymentMethod, total };

  submitSaleToGoogleForm(sale);
});

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

  fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  })
  .then(() => {
    alert("Sale recorded successfully.");
    document.getElementById('sale-form').reset();
  })
  .catch((err) => {
    console.error("Error recording sale:", err);
    alert("Error recording sale. Please check your internet connection.");
  });
}
