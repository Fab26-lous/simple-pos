const correctPassword = "glam2025"; // Change this to your preferred password

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
const sales = [];

document.getElementById('sale-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const item = document.getElementById('item').value;
  const quantity = parseInt(document.getElementById('quantity').value);
  const price = parseFloat(document.getElementById('price').value);
  const total = quantity * price;

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
