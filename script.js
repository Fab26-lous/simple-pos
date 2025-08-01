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
  fetch("https://workers.cloudflare.com/playground#LYVwNgLglgDghgJwgegGYHsHALQBM4RwDcABAEbogB2+CAngLzbPYDqApmQNJQQBimYACFKNRHQBsrAKIAtBAE4AwgFYAbgAkAUlD4ArDQAsAXCxYduvAVhHVakmfOXrtug4YCwAKCXoqEdn9sABEoAGcYdDDeKD9jEgwsPAJiEio4YHYGACJ8QgA6PTDs0lQoMECMrNyUwuLvX39AiGwAFToYdni4GBgwKABjAliqZD04NTgwgYRYCABqYHRccHZvb3YAD0ikElx2VDhwCBIAby8ASHTM+OzpTYy+9hIAQQAFAElsgBpLwgBzMLxADa2S2jwqPxI2R6UCh2QQ7AifjC7GyAF1fgBfIhebxmZgWHj8QS2MT0KRyRSqTQ6fRGBp+AJBULI6LQOIJQTJQika7VKA0LZ1EoJcqVTI5QX7TYixlNILtTrdXr9IYc0bjSbTWYwBZLFYVdZeLY7E77Q7HM6XKZ0KgDBLsCADQwACkRAEcQEiIN8SIE1H6BhBNgBKa0XEgkAYok4gBBgEgMEgAckMEAgMCByGQOrm+X+6HQ-wq+RjwGQwDgMyiueQLy4qDoAzIAC8tAB5aQAJWwfFwAGtgABFVgAdmwegHIGk7AAmi8AOIAfQAygAWVqLrgANW7slwXDei4AqhIABpcdf-BRcPQfD5UFQAWWAHpPq4HYToYDAQj43Ydq2c5QAgLwvMgWzsAMKakDmJDduwfTVs8ECGOEXhRpcUZQKgJDuuwXo+vkmRocsSYMMmKYdm8rQfB2AByq4puG5wXBciIQPGVBpOwADuCFIpEVCoq6VDgGAfpsZGJBhIQXFAiQABMAAM66-OxUaGOwcD7AginSRcKYvAMAxImE2CNBACDoGA2AvL+6B8dgHazP8gopvEKYAFQphp7HGaZ5mWUyNl2Q5YBOdgz5OoYyxhJ5qZvB2q6tH6NF0YxzH+UZJlmWEFlWWF9mOc5Gg6XpCVeVZzRtB07B+ZcMlYv5WKhrizWYSQ2HRrG5DLHQSYkHAfFwLwJCet6cn5AEmwQK67VdT1MYiSciJhENI1jScqBOi6rrxpJEYXKRcW4F5yWpY17Habp7D6fEpypjVir1YlKY9H0gzDH4YxhH4KYkC1TUULgdAaVGbW4lhMkrXJE1IlayZbeN60zVs82LTDUacdxvECYhyIiewBFhMcUlNbdlWPU1UaBflhWhbZJWRc5rlQO5VDvb5-l0y9LRKg1XmfWqP2av9XOtRDQOLRcWJdTiXX4gSRJWKSoj2JSTg0q49KeD4TK1aykTsiM8SJDgeSpPyOR8ewYDluw+TpsAYCimUFQ29kdsO+gmTOxArvZPKzIC-V8SzSgyGCsaAA8ACEuDoMG9UkC7YAAHxeLH6ckGAcBUP8OSBNkWcXDnFVl+XpFwNGhiIKiEA5CerR8NgAAc2QkMgVexzXacZjA2CESAUBqDk57YCeLwhcA8DQGQkK9QqTfZB80gMOwuD-Gi3e9-3XtqFA-Fml3K2h7bUC4GhDD7EfZnYHxV9oX6goxHAdnTB-WQAIz5CpXce5NVjtACAFQM5KEiiAXAqB86IhIKwTAA57obTePnOg-wbJ2FjsgUB4DgH9CoAOJqHF7Y5Dkj+JE2knTZBIYYREqAcjpkzNmZAyEMFYJoPkO+MAbK4DLFAmBcCnZ32QD7R22AKGlgGAVWh7EgHl2QFTLOlxY6gzoL3XAY9oz5wKjkWBiAkSlxIbHKAwB-iyQQAMJhg9WHsMwRrbh7A1C8OWAIygQjDFOLUGgYRYR8gwELoA3uyAtFqH3mNKgVdy5hJ0VMMItskEoOwJFQspccFhOibHGA0SLgcF9pkeOJATyohIGhcIJA0FwA4RrMp6Ayk+j2LMNQzxa6IIQMghAQZEQEFaXsdgSw6kkIuGEeu8C-CEPYH6AuuASB8W0jxHpYN+l9HQINLRiJgxgEGhAepaFnhbx3uQQajdoCFxICAGAw1hmQI8QY+B1YYzUAgPkExbCsmGB-hnVg9cTgVLaUkhAAB+HBnysk5OGS8EgtzoH3OeO0zpJAKlaAmHAVcMw5i9X2CQOglA5mzACGU35acZkVA2ri+MczODDPZA1DaGhWitDeGUhAcBUBlAdBs6CYDBqCmhYIuFKYNqHOeJFdUIwNqIFqfs4ZfFMBgFwNM0qgoLEUrqXnZOvSsXPAGJFUpuycWUAQP6GgFzUT6SRTxTAekhnsXYutYSsyDX7OACQJY8CvSDAHNst5EK7U5y+a0egSKTgUv0vbVAoKvkmL9XajsPEw15wOH8yVskITwsBUSggSKNoIGoFQFVJA-BEoqbS-IJA5x4qGFQYZW9xrjX6C04aprUSoW0gjMmkANraUROW6QWiTj7JIPPQww0KBNoNcgWEtq7WtrTk5IlByHhzwqAgzN9caBkr2LhXaiJ-ATUoAEfxFaq0F2GmAf6-oB3DKHTGbFBq53zIIEK4dURoiL1aaasgsxzmJqoBjJF+xa4Gv6LtV5-r3nAMrJEsuOD1FZ1BYHTOeIvAEjYJwYk1hhAa3EFrakLg6TuBDkbcIJsYicgtjya2VQcg1ytu7cUXtF7oDIMHA2K86rKmGqqb6Go-p+GNKcbI5Z55QDIOUXgdBlx5DRMYbIqklIqGwCpduymf4-GE37UT4n+gQCkwYwE2RjCgioMsdgRRlwiYIBib42QqyCmXAaVYRnsjSmFEUbIWJlZmFViSGwOGKSOHw7SNwRhmDeCAA", {
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
