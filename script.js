console.log("=== POS SYSTEM LOADED ===");

/* =========================
   CSV PARSING
========================= */
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result.map((cell) => cell.trim().replace(/^"|"$/g, ""));
}

/* =========================
   STORES
========================= */
const stores = {
  store1: {
    name: "One Stop",
    users: {
      Cashier: "Glam2025",
    },
  },
  store2: {
    name: "Golden",
    users: {
      Cashier2: "Glam2025",
    },
  },
};

/* =========================
   GOOGLE SHEETS PRODUCTS CSV
========================= */
const GOOGLE_SHEETS_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQMoJA4uj6dsPvt0LjS5wiqPb18u7TRdmuXa4NVht_lbM58Auqxb_JOPld2sIqOcLb7wyzx0KJaTCsM/pub?gid=0&single=true&output=csv";

async function loadProductsFromGoogleSheets() {
  try {
    console.log("Loading from Google Sheets...");
    const response = await fetch(GOOGLE_SHEETS_CSV_URL);
    const csvText = await response.text();
    const loaded = parseCSVToProducts(csvText);
    console.log(
      "Loaded " + loaded.length + " products from Google Sheets for store: " + currentStore
    );
    return loaded;
  } catch (error) {
    console.error("Google Sheets error:", error);
    return await loadProductsFromJSON();
  }
}

function parseCSVToProducts(csvText) {
  const lines = csvText.split("\n").filter((line) => line.trim());
  const list = [];

  console.log("Current store:", currentStore);

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((cell) => cell.trim());

    if (cells.length >= 6) {
      let stock = 0;
      if (currentStore === "store1") stock = parseFloat(cells[4]) || 0;
      if (currentStore === "store2") stock = parseFloat(cells[5]) || 0;

      const product = {
        name: cells[0],
        prices: {
          ct: parseFloat(cells[1]) || 0,
          dz: parseFloat(cells[2]) || 0,
          pc: parseFloat(cells[3]) || 0,
        },
        stock,
      };

      if (product.name && product.name !== "Product Name") {
        list.push(product);
      }
    }
  }

  return list;
}

async function loadProductsFromJSON() {
  try {
    const response = await fetch("products.json");
    const data = await response.json();
    console.log("Loaded products from local JSON fallback");
    return data;
  } catch (error) {
    console.error("Error loading from JSON:", error);
    return [];
  }
}

/* =========================
   MAIN VARIABLES
========================= */
let currentStore = null;
let currentUser = null;
let products = [];
let currentSales = [];

/* =========================
   LOGIN + STORE SELECTION
========================= */
function checkLogin() {
  console.log("=== LOGIN BUTTON CLICKED ===");
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const error = document.getElementById("login-error");

  let validStore = null;

  for (const storeId in stores) {
    const store = stores[storeId];
    if (store.users[username] && store.users[username] === password) {
      validStore = storeId;
      break;
    }
  }

  if (validStore) {
    currentStore = validStore;
    currentUser = username;

    document.getElementById("login-container").style.display = "none";
    document.getElementById("store-selection").style.display = "block";

    const storeButton = document.querySelector(
      'button[onclick="selectStore(\'' + currentStore + '\')"]'
    );
    if (storeButton) storeButton.classList.add("active-store");

    console.log("Login successful!");
  } else {
    error.textContent = "Invalid username or password";
  }
}

function selectStore(storeId) {
  if (storeId === currentStore) {
    document.getElementById("store-selection").style.display = "none";
    document.getElementById("pos-container").style.display = "block";
    document.getElementById("store-name").textContent = stores[storeId].name;

    // ✅ Show Daily Expense button ONLY after POS is open
    const expenseBtn = document.getElementById("expense-button-wrapper");
    if (expenseBtn) expenseBtn.style.display = "block";

    loadProducts();
  } else {
    alert("You are not authorized for this store");
  }
}

/* =========================
   PRODUCT SEARCH + PRICING
========================= */
function loadProducts() {
  loadProductsFromGoogleSheets()
    .then((data) => {
      products = data;
      populateDatalist();
      console.log("Loaded " + products.length + " products for " + stores[currentStore].name);
    })
    .catch((err) => {
      console.error("Error loading products:", err);
      alert("Failed to load product data.");
    });
}

function populateDatalist() {
  const datalist = document.getElementById("item-list");
  if (!datalist) return;

  datalist.innerHTML = "";
  products.forEach((p) => {
    const option = document.createElement("option");
    option.value = p.name;
    datalist.appendChild(option);
  });
}

function updatePrice() {
  const itemName = document.getElementById("item").value.trim();
  const unit = document.getElementById("unit").value;

  const product = products.find((p) => p.name.toLowerCase() === itemName.toLowerCase());

  if (product) {
    document.getElementById("price").value = product.prices[unit] || 0;
  } else {
    document.getElementById("price").value = "";
  }

  calculateTotal();
}

function calculateTotal() {
  const quantity = parseFloat(document.getElementById("quantity").value) || 0;
  const price = parseFloat(document.getElementById("price").value) || 0;
  const discount = parseFloat(document.getElementById("discount").value) || 0;
  const extra = parseFloat(document.getElementById("extra").value) || 0;

  const subtotal = quantity * price;
  const total = subtotal - discount + extra;

  document.getElementById("total").value = total.toFixed(2);
  return total;
}

/* =========================
   EVENT LISTENERS
========================= */
["quantity", "price", "discount", "extra"].forEach((id) => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", calculateTotal);
});

const itemEl = document.getElementById("item");
if (itemEl) itemEl.addEventListener("input", updatePrice);

const unitEl = document.getElementById("unit");
if (unitEl) unitEl.addEventListener("change", updatePrice);

/* =========================
   SALES TABLE + SUBMISSION
========================= */
const saleForm = document.getElementById("sale-form");
if (saleForm) {
  saleForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const item = document.getElementById("item").value;
    if (!item) return alert("Please select an item");

    const unit = document.getElementById("unit").value;
    const quantity = parseFloat(document.getElementById("quantity").value) || 0;
    const price = parseFloat(document.getElementById("price").value) || 0;
    const discount = parseFloat(document.getElementById("discount").value) || 0;
    const extra = parseFloat(document.getElementById("extra").value) || 0;
    const paymentMethod = document.getElementById("payment-method").value;
    const total = calculateTotal();

    const sale = {
      item,
      unit,
      quantity,
      price,
      discount,
      extra,
      paymentMethod,
      total,
      store: currentStore,
      timestamp: new Date().toISOString(),
    };

    currentSales.push(sale);
    updateSalesTable();
    resetForm();
  });
}

function resetForm() {
  const form = document.getElementById("sale-form");
  if (form) form.reset();
  document.getElementById("price").value = "";
  document.getElementById("total").value = "";
  const itemField = document.getElementById("item");
  if (itemField) itemField.focus();
}

function updateSalesTable() {
  const tbody = document.querySelector("#sales-table tbody");
  if (!tbody) return;

  tbody.innerHTML = "";
  let grandTotal = 0;

  currentSales.forEach((sale, index) => {
    const row = document.createElement("tr");
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

  const submitBtn = document.getElementById("submit-all-btn");
  const clearBtn = document.getElementById("clear-all-btn");

  if (currentSales.length > 0) {
    if (submitBtn) submitBtn.style.display = "inline-block";
    if (clearBtn) clearBtn.style.display = "inline-block";

    const footerRow = document.createElement("tr");
    footerRow.innerHTML = `
      <td colspan="7" style="text-align: right;"><strong>Grand Total:</strong></td>
      <td><strong>${grandTotal.toFixed(2)}</strong></td>
      <td colspan="2"></td>
    `;
    tbody.appendChild(footerRow);
  } else {
    if (submitBtn) submitBtn.style.display = "none";
    if (clearBtn) clearBtn.style.display = "none";
  }
}

function removeSale(index) {
  currentSales.splice(index, 1);
  updateSalesTable();
}

function clearAllSales() {
  if (confirm("Are you sure you want to clear all items?")) {
    currentSales = [];
    updateSalesTable();
  }
}

function submitAllSales() {
  if (currentSales.length === 0) return alert("No items to submit");

  const submitBtn = document.getElementById("submit-all-btn");
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }

  const progress = document.createElement("div");
  progress.style.margin = "10px 0";
  progress.style.fontWeight = "bold";
  progress.innerHTML = "Submitting 0/" + currentSales.length + " items...";
  if (submitBtn && submitBtn.parentNode) submitBtn.parentNode.appendChild(progress);

  let successCount = 0;
  const errors = [];

  function submitNext(index) {
    if (index >= currentSales.length) {
      progress.innerHTML =
        "Completed: " + successCount + "/" + currentSales.length + " items submitted successfully";

      if (errors.length > 0) {
        progress.innerHTML += "<br>" + errors.length + " items failed";
        console.error("Failed submissions:", errors);
      }

      if (successCount > 0) {
        currentSales.splice(0, successCount);
        updateSalesTable();
      }

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit All Items";
      }

      setTimeout(() => progress.remove(), 5000);
      return;
    }

    progress.innerHTML = "Submitting " + (index + 1) + "/" + currentSales.length + " items...";

    submitSaleToGoogleForm(currentSales[index])
      .then(() => {
        successCount++;
        submitNext(index + 1);
      })
      .catch((err) => {
        errors.push({ index, error: err });
        submitNext(index + 1);
      });
  }

  submitNext(0);
}

/* ✅ YOUR WORKING SALES FORM */
function submitSaleToGoogleForm(sale) {
  const formUrl =
    "https://docs.google.com/forms/d/e/1FAIpQLSclmoUb_V44uk6AdT1bY9RDqJvRLvUeyMTCnRNRCXrz_KDkPQ/formResponse";

  const formData = new URLSearchParams();
  formData.append("fvv", "1");
  formData.append("draftResponse", "[]");
  formData.append("pageHistory", "0");

  formData.append("entry.1617444836", sale.item);
  formData.append("entry.591095593", sale.unit);
  formData.append("entry.268864996", String(sale.quantity));
  formData.append("entry.53788851", String(sale.price));
  formData.append("entry.411866054", String(sale.discount));
  formData.append("entry.511901350", String(sale.extra));
  formData.append("entry.1094112162", String(sale.total));
  formData.append("entry.970001475", sale.paymentMethod);
  formData.append("entry.106245113", stores[currentStore].name);

  return fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: formData.toString(),
  });
}

/* =========================
   STOCK DISPLAY (ALL STORES)
========================= */
let allStoreProducts = [];

async function loadAllStoreProducts() {
  try {
    console.log("Loading products for both stores...");
    const response = await fetch(GOOGLE_SHEETS_CSV_URL);
    const csvText = await response.text();

    const lines = csvText.split("\n").filter((line) => line.trim());
    allStoreProducts = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCSVLine(lines[i]);
      if (cells.length >= 6) {
        const product = {
          name: (cells[0] && cells[0].trim()) || "Unknown",
          prices: {
            ct: parseFloat(cells[1]) || 0,
            dz: parseFloat(cells[2]) || 0,
            pc: parseFloat(cells[3]) || 0,
          },
          stockStore1: cells[4] || "0",
          stockStore2: cells[5] || "0",
        };

        if (product.name && product.name !== "Product Name") {
          allStoreProducts.push(product);
        }
      }
    }

    console.log("Loaded products for stock display:", allStoreProducts);
    return allStoreProducts;
  } catch (error) {
    console.error("Error:", error);
    return [];
  }
}

function showStockLevels() {
  loadAllStoreProducts().then((list) => {
    populateStockTable(list);
    document.getElementById("stock-modal").style.display = "flex";
    setupStockSearch();
  });
}

function hideStockLevels() {
  document.getElementById("stock-modal").style.display = "none";
}

function populateStockTable(list) {
  const tbody = document.getElementById("stock-table-body");
  const summary = document.getElementById("stock-summary");
  if (!tbody) return;

  tbody.innerHTML = "";

  let outOfStockCount = 0;
  let lowStockCount = 0;

  list.forEach((product) => {
    const isStore1Out = product.stockStore1 === "0" || product.stockStore1 === "0 pc" || product.stockStore1 === "";
    const isStore2Out = product.stockStore2 === "0" || product.stockStore2 === "0 pc" || product.stockStore2 === "";
    const isOut = isStore1Out && isStore2Out;

    let status = "✅ In Stock";
    let color = "#27ae60";

    if (isOut) {
      status = "❌ Out of Stock";
      color = "#e74c3c";
      outOfStockCount++;
    } else if (isStore1Out || isStore2Out) {
      status = "⚠️ Low Stock";
      color = "#f39c12";
      lowStockCount++;
    }

    const row = document.createElement("tr");
    row.style.borderBottom = "1px solid #eee";
    row.innerHTML = `
      <td style="padding: 10px; font-weight: bold;">${product.name}</td>
      <td style="padding: 10px; text-align: center; color: ${isStore1Out ? "#e74c3c" : "#2c3e50"}">
        ${product.stockStore1} ${isStore1Out ? "❌" : ""}
      </td>
      <td style="padding: 10px; text-align: center; color: ${isStore2Out ? "#e74c3c" : "#2c3e50"}">
        ${product.stockStore2} ${isStore2Out ? "❌" : ""}
      </td>
      <td style="padding: 10px; text-align: center; color: ${color}">${status}</td>
    `;
    tbody.appendChild(row);
  });

  if (summary) {
    summary.innerHTML = `
      <strong>Summary:</strong>
      Total Products: ${list.length} |
      Out of Stock: <span style="color:#e74c3c">${outOfStockCount}</span> |
      Low Stock: <span style="color:#f39c12">${lowStockCount}</span>
    `;
  }
}

function setupStockSearch() {
  const searchInput = document.getElementById("stock-search");
  if (!searchInput) return;

  searchInput.replaceWith(searchInput.cloneNode(true));
  const fresh = document.getElementById("stock-search");

  fresh.addEventListener("input", function () {
    const term = this.value.toLowerCase().trim();
    if (!allStoreProducts || allStoreProducts.length === 0) return;

    if (term === "") {
      populateStockTable(allStoreProducts);
    } else {
      populateStockTable(allStoreProducts.filter((p) => p.name.toLowerCase().includes(term)));
    }
  });

  fresh.value = "";
}

/* =========================
   STOCK ADJUSTMENT
========================= */
let adjustmentItems = [];

function showStockAdjustment() {
  adjustmentItems = [];
  document.getElementById("stock-adjustment-modal").style.display = "flex";
  document.getElementById("adjustment-store-name").textContent = stores[currentStore].name;
  updateAdjustmentTable();
  setupAdjustmentSearch();
}

function hideStockAdjustment() {
  document.getElementById("stock-adjustment-modal").style.display = "none";
}

function setupAdjustmentSearch() {
  const searchInput = document.getElementById("adjustment-search");
  const suggestions = document.getElementById("adjustment-suggestions");
  if (!searchInput || !suggestions) return;

  searchInput.addEventListener("input", function () {
    const searchTerm = this.value.toLowerCase();
    suggestions.innerHTML = "";

    if (searchTerm.length < 1) {
      suggestions.style.display = "none";
      return;
    }

    const filtered = products.filter((p) => p.name.toLowerCase().includes(searchTerm));

    if (filtered.length > 0) {
      filtered.forEach((product) => {
        const div = document.createElement("div");
        div.style.cssText = "padding:10px 15px; cursor:pointer; border-bottom:1px solid #f1f1f1;";
        div.textContent = product.name;
        div.addEventListener("click", () => {
          searchInput.value = product.name;
          suggestions.style.display = "none";
        });
        suggestions.appendChild(div);
      });
      suggestions.style.display = "block";
    } else {
      suggestions.style.display = "none";
    }
  });

  document.addEventListener("click", function (e) {
    if (!searchInput.contains(e.target) && !suggestions.contains(e.target)) {
      suggestions.style.display = "none";
    }
  });
}

function addItemToAdjustment() {
  const searchInput = document.getElementById("adjustment-search");
  const itemName = searchInput.value.trim();

  if (!itemName) return alert("Please enter a product name");

  const product = products.find((p) => p.name.toLowerCase() === itemName.toLowerCase());
  if (!product) return alert("Product not found");

  const exists = adjustmentItems.find((x) => x.name === product.name);
  if (exists) return alert("Item already in adjustment list");

  adjustmentItems.push({
    id: product.name,
    name: product.name,
    unit: "pc",
    adjustmentType: "add",
    quantity: 0,
    _userBlank: true,
  });

  searchInput.value = "";
  const suggestions = document.getElementById("adjustment-suggestions");
  if (suggestions) suggestions.style.display = "none";
  updateAdjustmentTable();
}

function updateAdjustmentTable() {
  const tbody = document.getElementById("adjustment-table-body");
  const summary = document.getElementById("adjustment-summary");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (adjustmentItems.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="6" style="text-align:center; padding:40px 20px; color:#7f8c8d;">
          <h3 style="margin:0 0 10px 0;">No items added yet</h3>
          <p style="margin:0;">Search for products above and click "Add Item" to start adjusting stock</p>
        </td>
      </tr>
    `;
    if (summary) summary.innerHTML = "Items to adjust: 0";
    return;
  }

  adjustmentItems.forEach((item, index) => {
    const row = document.createElement("tr");
    const displayQuantity = item._userBlank || item.quantity === 0 ? "" : item.quantity.toString();

    row.innerHTML = `
      <td style="padding:12px 15px; font-weight:600; color:#2c3e50;">${item.name}</td>
      <td style="padding:12px 15px;">
        <select class="unit-select" data-index="${index}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
          <option value="pc" ${item.unit === "pc" ? "selected" : ""}>Pieces (pc)</option>
          <option value="dz" ${item.unit === "dz" ? "selected" : ""}>Dozens (dz)</option>
          <option value="ct" ${item.unit === "ct" ? "selected" : ""}>Cartons (ct)</option>
        </select>
      </td>
      <td style="padding:12px 15px;">
        <select class="adjustment-select" data-index="${index}" style="width:100%; padding:8px; border:1px solid #ddd; border-radius:4px;">
          <option value="add" ${item.adjustmentType === "add" ? "selected" : ""}>Add Stock</option>
          <option value="remove" ${item.adjustmentType === "remove" ? "selected" : ""}>Remove Stock</option>
          <option value="set" ${item.adjustmentType === "set" ? "selected" : ""}>Set Stock</option>
        </select>
      </td>
      <td style="padding:12px 15px;">
        <input type="text" class="quantity-input" data-index="${index}" value="${displayQuantity}" placeholder="0.00"
          style="width:80px; padding:8px; border:1px solid #ddd; border-radius:4px; text-align:center;">
      </td>
      <td style="padding:12px 15px;">
        <button class="remove-btn" data-index="${index}"
          style="background-color:#e74c3c; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer;">
          Remove
        </button>
      </td>
    `;

    tbody.appendChild(row);

    const qtyInput = row.querySelector(".quantity-input");
    if (qtyInput) {
      qtyInput.addEventListener("input", function () {
        let value = this.value.replace(/[^0-9.]/g, "");
        if ((value.match(/\./g) || []).length > 1) {
          const firstIndex = value.indexOf(".");
          value = value.slice(0, firstIndex + 1) + value.slice(firstIndex + 1).replace(/\./g, "");
        }
        this.value = value;

        const numericValue = value === "" ? NaN : parseFloat(value);
        updateAdjustmentItem(index, "quantity", numericValue, true);
      });
    }

    const unitSelect = row.querySelector(".unit-select");
    if (unitSelect) {
      unitSelect.addEventListener("change", function () {
        updateAdjustmentItem(index, "unit", this.value);
      });
    }

    const typeSelect = row.querySelector(".adjustment-select");
    if (typeSelect) {
      typeSelect.addEventListener("change", function () {
        updateAdjustmentItem(index, "type", this.value);
      });
    }

    const removeBtn = row.querySelector(".remove-btn");
    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        removeAdjustmentItem(index);
      });
    }
  });

  if (summary) summary.innerHTML = `Items to adjust: ${adjustmentItems.length}`;
}

function updateAdjustmentItem(index, field, value, skipRender) {
  if (index < 0 || index >= adjustmentItems.length) return;
  const item = adjustmentItems[index];

  if (field === "type") item.adjustmentType = value;
  if (field === "unit") item.unit = value;

  if (field === "quantity") {
    if (isNaN(value)) {
      item.quantity = 0;
      item._userBlank = true;
    } else {
      item.quantity = value;
      item._userBlank = false;
    }
  }

  if (!skipRender) updateAdjustmentTable();
}

function removeAdjustmentItem(index) {
  if (index < 0 || index >= adjustmentItems.length) return;

  const itemName = adjustmentItems[index].name;
  adjustmentItems.splice(index, 1);
  updateAdjustmentTable();
  alert(`"${itemName}" removed from adjustment list`);
}

function clearAdjustments() {
  if (adjustmentItems.length === 0) return alert("No items to clear");

  if (confirm("Are you sure you want to clear all items?")) {
    adjustmentItems = [];
    updateAdjustmentTable();
    alert("All items cleared");
  }
}

function submitStockAdjustment() {
  console.log("=== STOCK ADJUSTMENT SUBMISSION STARTED ===");

  if (adjustmentItems.length === 0) return alert("No items to adjust");

  const invalidItems = adjustmentItems.filter((item) => {
    const quantity = parseFloat(item.quantity);
    return isNaN(quantity) || quantity < 0;
  });

  if (invalidItems.length > 0) {
    alert("Please set valid quantities for all items (must be 0 or greater)");
    return;
  }

  const submitBtn = document.querySelector(
    '#stock-adjustment-modal button[onclick="submitStockAdjustment()"]'
  );
  const originalText = submitBtn ? submitBtn.textContent : "Submit Adjustments";

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
  }

  let successCount = 0;
  const errors = [];

  function submitNext(index) {
    if (index >= adjustmentItems.length) {
      console.log("=== SUBMISSION COMPLETE ===");
      console.log("Successfully submitted:", successCount, "items");
      console.log("Errors:", errors);

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
      }

      if (successCount > 0) {
        alert(`✅ Successfully submitted ${successCount} stock adjustment(s)!`);
        adjustmentItems = [];
        hideStockAdjustment();
      } else {
        alert("❌ No adjustments were submitted. Check browser console for errors.");
      }

      return;
    }

    const adjustment = adjustmentItems[index];
    console.log(`Submitting item ${index + 1}:`, adjustment);

    submitStockAdjustmentToGoogleForm(adjustment)
      .then(() => {
        console.log(`✅ Success: ${adjustment.name}`);
        successCount++;
        submitNext(index + 1);
      })
      .catch((err) => {
        console.error(`❌ Failed: ${adjustment.name}`, err);
        errors.push({ item: adjustment.name, error: err });
        submitNext(index + 1);
      });
  }

  submitNext(0);
}

function ensureHiddenIframe() {
  const iframeId = "google-forms-hidden-iframe";
  if (!document.getElementById(iframeId)) {
    const iframe = document.createElement("iframe");
    iframe.id = iframeId;
    iframe.name = iframeId;
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }
  return "google-forms-hidden-iframe";
}

async function submitStockAdjustmentToGoogleForm(adjustment) {
  const formUrl =
    "https://docs.google.com/forms/d/e/1FAIpQLSeTdAktfy1tm486oSh64FA7L7pTTgxaWH01-fDUSbSpJ6QV2g/formResponse";

  const UNIT_MAP = { pc: "pc", dz: "dz", ct: "ct" };
  const TYPE_MAP = { add: "Add", remove: "Remove", set: "Set" };

  const unitValue =
    UNIT_MAP[(adjustment.unit || "").toLowerCase()] || adjustment.unit || "";
  const typeValue =
    TYPE_MAP[(adjustment.adjustmentType || "").toLowerCase()] ||
    adjustment.adjustmentType ||
    "";
  const storeValue = stores[currentStore].name || "";

  const payload = new URLSearchParams();
  payload.append("entry.1351663693", adjustment.name || "");
  payload.append("entry.2099316372", unitValue);
  payload.append("entry.1838734272", String(adjustment.quantity || 0));
  payload.append("entry.1785029976", typeValue);
  payload.append("entry.1678851527", storeValue);

  if (adjustment._submitting) {
    console.warn("⚠️ Adjustment already submitting, skipping duplicate:", adjustment.name);
    return { status: "skipped-duplicate" };
  }
  adjustment._submitting = true;

  try {
    await fetch(formUrl, { method: "POST", body: payload, mode: "no-cors" });
    adjustment._submitting = false;
    return { status: "ok", method: "fetch" };
  } catch (fetchErr) {
    console.warn("⚠️ Fetch failed, using form fallback for", adjustment.name);

    try {
      ensureHiddenIframe();
      const iframeName = "google-forms-hidden-iframe";
      const form = document.createElement("form");
      form.action = formUrl;
      form.method = "POST";
      form.target = iframeName;
      form.style.display = "none";

      const fields = {
        "entry.1351663693": adjustment.name || "",
        "entry.2099316372": unitValue,
        "entry.1838734272": String(adjustment.quantity || 0),
        "entry.1785029976": typeValue,
        "entry.1678851527": storeValue,
      };

      for (const key in fields) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = fields[key];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();

      setTimeout(() => form.remove(), 3000);

      adjustment._submitting = false;
      return { status: "ok", method: "form-fallback" };
    } catch (formErr) {
      adjustment._submitting = false;
      throw formErr;
    }
  }
}

/* =========================
   DAILY EXPENSE
========================= */
function showExpenseModal() {
  document.getElementById("expense-modal").style.display = "flex";
}

function hideExpenseModal() {
  document.getElementById("expense-modal").style.display = "none";
  clearExpenseForm();
}

function clearExpenseForm() {
  document.getElementById("expense-category").value = "";
  document.getElementById("expense-description").value = "";
  document.getElementById("expense-amount").value = "";
  document.getElementById("expense-payment").value = "Cash";
}

function submitExpense() {
  const category = document.getElementById("expense-category").value;
  const description = document.getElementById("expense-description").value;
  const amount = document.getElementById("expense-amount").value;
  const payment = document.getElementById("expense-payment").value;

  if (!category || !amount || Number(amount) <= 0) {
    alert("Please enter category and a valid amount");
    return;
  }

  const formUrl =
    "https://docs.google.com/forms/d/e/1FAIpQLSdc1y_vTzWLHTjADVfJTq7HbymTrHfd5x0UxQmobVMeWWCEfg/formResponse";

  const data = new URLSearchParams();
  data.append("fvv", "1");
  data.append("draftResponse", "[]");
  data.append("pageHistory", "0");

  data.append("entry.1881319054", category);
  data.append("entry.1827614721", description);
  data.append("entry.1704637725", amount);
  data.append("entry.475968685", payment);
  data.append("entry.1181742489", stores[currentStore].name);

  fetch(formUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: data.toString(),
  });

  alert("Expense recorded successfully");
  hideExpenseModal();
}
