const BACKEND_URL = "https://leafletpro-backend.onrender.com";

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
  const form =
    document.getElementById("quoteForm") ||
    document.getElementById("contactForm");

  if (!form) return null;

  const fd = new FormData(form);

  return {
    quantity: Number(fd.get("quantity") || 1000),
    deliveryType: fd.get("deliveryType") || "shared",
    postcode: String(fd.get("postcode") || "").trim()
  };
}

function updateUI(quote) {
  setText("distributionCost", money(quote.distributionCost || 0));
  setText("printCost", money(quote.printCost || 0));
  setText("trackingCost", money(quote.trackingCost || 0));
  setText("designCost", money(quote.designCost || 0));
  setText("setupCost", money(quote.setupCost || 0));
  setText("priorityCost", money(quote.priorityCost || 0));
  setText("subtotalCost", money(quote.subtotalCost || 0));
  setText("vatCost", money(quote.vatCost || 0));
  setText("totalCost", money(quote.totalCost || 0));
  setText("estimatedHomes", quote.estimatedHomes || 0);
  setText("estimatedDays", quote.estimatedDays || "-");
  setText("ratePerThousand", money(quote.ratePerThousand || 0));
  setText("summaryZone", quote.zoneName || quote.summaryZone || "-");
  setText("summaryInsight", quote.summaryInsight || "Up to 2,000 leaflets a day");
}

async function refreshQuote() {
  const data = getFormData();
  if (!data) return;

  try {
    setStatus("Calculating quote...");

    const res = await fetch(`${BACKEND_URL}/api/quote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const quote = await res.json();
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
      quote.ratePerThousand = custom / (data.quantity / 1000);
    }

    updateUI(quote);
    setStatus("Quote updated.");
  } catch (e) {
    console.error(e);
    setStatus("Error updating quote.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const form =
    document.getElementById("quoteForm") ||
    document.getElementById("contactForm");

  if (form) {
    form.addEventListener("change", refreshQuote);
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      refreshQuote();
    });

    refreshQuote();
  }
});
