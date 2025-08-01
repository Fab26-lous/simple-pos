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

// Auto-fill price when item or unit changes
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

const sales = [];

document.getElementById('sale-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const item = document.getElementById('item').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const price = parseFloat(document.getElementById('price').value);
  const total = calculateTotal(); // Uses discount + extra


  sales.push({ item, quantity, price, total });

  updateTable();
  this.reset();
});

function updateTable() {
  const tbody = document.querySelector('#sales-table tbody');
  tbody.innerHTML = '';
  sales.forEach((sale) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sale.item}</td>
      <td>${sale.quantity}</td>
      <td>${sale.price.toFixed(2)}</td>
      <td>${sale.total.toFixed(2)}</td>
    `;
    tbody.appendChild(row);
  });
}

document.getElementById('download').addEventListener('click', function() {
  const csvRows = [
    ['Item', 'Quantity', 'Price', 'Total'],
    ...sales.map(sale => [sale.item, sale.quantity, sale.price, sale.total])
  ];
  const csvContent = csvRows.map(e => e.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.setAttribute('hidden', '');
  a.setAttribute('href', url);
  a.setAttribute('download', 'daily_sales.csv');
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
});
