const stripe = typeof Stripe !== "undefined"
  ? Stripe("pk_test_51TAQkyPVjya8Qe1Zl1dMPsqC6vPozcMxb72Z2ccthCkZhTZWpvvM9p57k0WJs1TDtkDwYXFMcmqDsS4DBzOFPkBz00W5cpabW3")
  : null;

const BACKEND_URL = "https://leafletpro-backend.onrender.com";

let map = null;
let marker = null;

function money(value) {
  return `£${Number(value || 0).toFixed(2)}`;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setStatus(message) {
  const el = document.getElementById("statusMessage");
  if (el) el.textContent = message;
}

function normaliseDeliveryType(type) {
  const value = String(type || "").toLowerCase();
  if (value.includes("solus") || value.includes("solo")) return "solo";
  if (value.includes("shared")) return "shared";
  return "shared";
}

function getDistributionPrice(quantity, type) {
  const t = normaliseDeliveryType(type);

  if (t === "solo") {
    if (quantity == 1000) return 132;
    if (quantity == 5000) return 318;
    if (quantity == 10000) return 598;
    if (quantity == 20000) return 1198;
    if (quantity == 50000) return 2986;
    if (quantity == 75000) return 4446;
    if (quantity == 100000) return 5996;
    if (quantity == 150000) return 8990;
    if (quantity == 250000) return 14500;
  }

  if (t === "shared") {
    if (quantity == 1000) return 85;
    if (quantity == 5000) return 300;
    if (quantity == 10000) return 550;
    if (quantity == 20000) return 1100;
    if (quantity == 50000) return 2500;
    if (quantity == 75000) return 4125;
    if (quantity == 100000) return 5500;
    if (quantity == 150000) return 8250;
    if (quantity == 250000) return 13750;
  }

  return 0;
}

function getFormData() {
  const form = document.getElementById("quoteForm");
  if (!form) return null;

  const fd = new FormData(form);

  return {
    quantity: Number(fd.get("quantity") || 1000),
    deliveryType: fd.get("deliveryType") || "shared",
    postcode: fd.get("postcode") || ""
  };
}

function updateUI(quote) {
  setText("distributionCost", money(quote.distributionCost));
  setText("printCost", money(quote.printCost));
  setText("trackingCost", money(quote.trackingCost));
  setText("designCost", money(quote.designCost));
  setText("setupCost", money(quote.setupCost));
  setText("priorityCost", money(quote.priorityCost));
  setText("subtotalCost", money(quote.subtotalCost));
  setText("vatCost", money(quote.vatCost));
  setText("totalCost", money(quote.totalCost));
  setText("estimatedHomes", quote.estimatedHomes || 0);
  setText("estimatedDays", quote.estimatedDays || "-");
}

async function refreshQuote() {
  const data = getFormData();
  if (!data) return;

  try {
    setStatus("Calculating...");

    const res = await fetch(`${BACKEND_URL}/api/quote`, {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data)
    });

    let quote = await res.json();

    const custom = getDistributionPrice(data.quantity, data.deliveryType);

    if (custom > 0) {
      quote.distributionCost = custom;
      quote.printCost = 0;
      quote.trackingCost = 0;
      quote.designCost = 0;
      quote.setupCost = 0;
      quote.priorityCost = 0;
      quote.subtotalCost = custom;
      quote.vatCost = 0;
      quote.totalCost = custom;
    }

    updateUI(quote);
    setStatus("Updated");

  } catch (e) {
    console.log(e);
    setStatus("Error updating quote");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("quoteForm");

  if (form) {
    form.addEventListener("change", refreshQuote);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      refreshQuote();
    });

    refreshQuote();
  }
});
