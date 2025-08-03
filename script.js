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

  submitSaleToGoogleForm(sale);
});

// This should be outside the submit block
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
  formData.append("entry.1676608087", sale.paymentMethod); // was written as "sale.payment" before, which was undefined!

  fetch(formUrl, {
    method: "POST",
    mode: "no-cors", // disables error messages from Google Forms
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData.toString()
  })
  .then(() => {
    console.log("Sale recorded successfully.");
    alert("Sale recorded successfully.");
  })
  .catch((err) => {
    console.error("Error recording sale:", err);
    alert("Error recording sale.");
  });
}
