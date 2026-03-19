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

function getQuoteForm() {
  return document.getElementById("quoteForm") || document.getElementById("contactForm");
}

function getStatusMessageEl() {
  return document.getElementById("statusMessage");
}

function setStatus(message) {
  const statusMessage = getStatusMessageEl();
  if (statusMessage) statusMessage.textContent = message;
}

function getDistributionPrice(quantity, type) {
  let price = 0;

  if (type === "solo") {
    if (quantity == 1000) price = 132;
    else if (quantity == 5000) price = 318;
    else if (quantity == 10000) price = 598;
    else if (quantity == 20000) price = 1198;
    else if (quantity == 50000) price = 2986;
    else if (quantity == 75000) price = 4446;
    else if (quantity == 100000) price = 5996;
    else if (quantity == 150000) price = 8990;
    else if (quantity == 250000) price = 14500;
  } else if (type === "shared") {
    if (quantity == 1000) price = 85;
    else if (quantity == 5000) price = 300;
    else if (quantity == 10000) price = 550;
    else if (quantity == 20000) price = 1100;
    else if (quantity == 50000) price = 2500;
    else if (quantity == 75000) price = 4125;
    else if (quantity == 100000) price = 5500;
    else if (quantity == 150000) price = 8250;
    else if (quantity == 250000) price = 13750;
  }

  return price;
}

function getFormData() {
  const quoteForm = getQuoteForm();
  if (!quoteForm) return null;

  const formData = new FormData(quoteForm);

  return {
    customerName: formData.get("customerName") || "",
    email: formData.get("email") || "",
    phone: formData.get("phone") || "",
    postcode: String(formData.get("postcode") || "").trim(),
    quantity: Number(formData.get("quantity") || 1000),
    deliveryType: formData.get("deliveryType") || "shared",
    printBundles: Number(formData.get("printBundles") || 0),
    designNeeded: !!formData.get("designNeeded"),
    notes: formData.get("notes") || "",
    origin: window.location.origin
  };
}

function updateQuoteUI(quote) {
  const distributionCost = Number(quote.distributionCost || 0);
  const printCost = Number(quote.printCost || 0);
  const designCost = Number(quote.designCost || 0);
  const totalCost = distributionCost + printCost + designCost;

  setText("distributionCost", money(distributionCost));
  setText("printCost", money(printCost));
  setText("designCost", money(designCost));
  setText("totalCost", money(totalCost));
  setText("estimatedHomes", quote.estimatedHomes || 0);
  setText("estimatedDays", quote.estimatedDays || "-");
  setText("summaryZone", quote.zoneName || quote.summaryZone || "-");
  setText("summaryInsight", quote.summaryInsight || "Up to 2,000 leaflets a day");
}

async function refreshQuote() {
  const payload = getFormData();
  if (!payload) return;

  setStatus("Calculating quote...");

  try {
    const response = await fetch(`${BACKEND_URL}/api/quote`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Quote request failed");
    }

    const quote = await response.json();

    const customDistributionPrice = getDistributionPrice(payload.quantity, payload.deliveryType);
    if (customDistributionPrice > 0) {
      quote.distributionCost = customDistributionPrice;
    }

    updateQuoteUI(quote);
    setStatus("Quote updated.");
    return quote;
  } catch (error) {
    console.error(error);
    setStatus("Unable to update quote.");
    throw error;
  }
}

async function saveOrder() {
  const payload = getFormData();
  if (!payload) return;

  setStatus("Saving order...");

  try {
    const response = await fetch(`${BACKEND_URL}/order`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error("Order save failed");
    }

    const result = await response.json();
    setStatus("Order saved successfully.");
    return result;
  } catch (error) {
    console.error(error);
    setStatus("Unable to save order.");
    throw error;
  }
}

function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  const defaultCenter = [51.5072, -0.1276];

  map = L.map(mapEl).setView(defaultCenter, 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

  marker = L.marker(defaultCenter).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

async function lookupPostcode(postcode) {
  if (!postcode || !map) {
    setStatus("Map unavailable.");
    return;
  }

  try {
    setStatus("Checking postcode...");

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(postcode)}`
    );

    const results = await response.json();

    if (!results.length) {
      setStatus("Postcode not found.");
      return;
    }

    const lat = Number(results[0].lat);
    const lon = Number(results[0].lon);

    map.setView([lat, lon], 13);

    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = L.marker([lat, lon]).addTo(map);
    }

    setStatus("Postcode found.");
  } catch (error) {
    console.error(error);
    setStatus("Unable to check postcode.");
  }
}

async function startCheckout() {
  if (!stripe) {
    setStatus("Stripe is unavailable.");
    return;
  }

  const totalEl = document.getElementById("totalCost");
  const totalText = totalEl ? totalEl.textContent : "£0";
  const amount = Math.round(Number(totalText.replace(/[^\d.]/g, "")) * 100);

  if (!amount || amount < 50) {
    setStatus("Please generate a quote first.");
    return;
  }

  try {
    setStatus("Starting checkout...");

    const response = await fetch(`${BACKEND_URL}/create-checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ amount })
    });

    const session = await response.json();

    if (!session.id) {
      throw new Error("No Stripe session returned");
    }

    const result = await stripe.redirectToCheckout({
      sessionId: session.id
    });

    if (result && result.error) {
      throw new Error(result.error.message);
    }
  } catch (error) {
    console.error(error);
    setStatus("Checkout failed.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();

  const quoteForm = getQuoteForm();
  const mapPostcode = document.getElementById("mapPostcode");
  const mapLookupBtn =
    document.getElementById("mapLookupBtn") ||
    document.querySelector(".map-tools button");

  const formActionsButtons = document.querySelectorAll(".form-actions button");
  const saveOrderBtn =
    document.getElementById("saveOrderBtn") ||
    formActionsButtons[0] ||
    null;

  const checkoutBtn =
    document.getElementById("checkoutBtn") ||
    formActionsButtons[1] ||
    null;

  if (quoteForm) {
    quoteForm.addEventListener("change", () => {
      refreshQuote().catch(() => {});
    });

    quoteForm.addEventListener("submit", (e) => {
      e.preventDefault();
      refreshQuote().catch(() => {});
    });

    refreshQuote().catch(() => {
      setStatus("Unable to load initial quote.");
    });
  }

  if (saveOrderBtn) {
    saveOrderBtn.addEventListener("click", (e) => {
      e.preventDefault();
      saveOrder().catch(() => {});
    });
  }

  if (checkoutBtn) {
    checkoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      try {
        await saveOrder();
      } catch (_) {
        // continue to checkout if save fails quietly
      }

      startCheckout();
    });
  }

  if (mapLookupBtn && mapPostcode) {
    mapLookupBtn.addEventListener("click", (e) => {
      e.preventDefault();
      lookupPostcode(mapPostcode.value.trim());
    });
  }
});
