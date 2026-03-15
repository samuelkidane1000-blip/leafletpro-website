const stripe = Stripe("pk_test_51TAQkyPVjya8Qe1Zl1dMPsqC6vPozcMxb72Z2ccthCkZhTZWpvvM9p57k0WJs1TDtkDwYXFMcmqDsS4DBzOFPkBz00W5cpabW3");
let map;
let marker;

function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  const defaultCenter = [51.5072, -0.1276];

  map = L.map(mapEl).setView(defaultCenter, 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  marker = L.marker(defaultCenter).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

async function lookupPostcode(postcode) {
  const statusMessage = document.getElementById('statusMessage');

  if (!postcode || !map) {
    if (statusMessage) statusMessage.textContent = 'Map unavailable.';
    return;
  }

  try {
    if (statusMessage) statusMessage.textContent = 'Checking postcode...';

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=gb&q=${encodeURIComponent(postcode)}`
    );

    const results = await response.json();

    if (!results.length) {
      if (statusMessage) statusMessage.textContent = 'Postcode not found.';
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

    if (statusMessage) statusMessage.textContent = 'Postcode found.';
  } catch (error) {
    if (statusMessage) statusMessage.textContent = 'Unable to check postcode.';
  }
}

const BACKEND_URL = 'https://leafletpro-backend.onrender.com';

const quoteForm = document.getElementById('quoteForm');
const statusMessage = document.getElementById('statusMessage');
const mapPostcode = document.getElementById('mapPostcode');
const mapLookupBtn = document.querySelector('.map-tools button');
const saveOrderBtn = document.querySelector('.form-actions button:first-child');
const checkoutBtn = document.querySelector('.form-actions button:last-child');

const money = (value) => `£${Number(value || 0).toFixed(2)}`;

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function getFormData() {
  if (!quoteForm) return {};

  const formData = new FormData(quoteForm);

  return {
    customerName: formData.get('customerName') || '',
    email: formData.get('email') || '',
    phone: formData.get('phone') || '',
    postcode: String(formData.get('postcode') || '').trim(),
    quantity: Number(formData.get('quantity') || 1000),
    deliveryType: formData.get('deliveryType') || 'shared',
    printBundles: Number(formData.get('printBundles') || 0),
    designNeeded: !!formData.get('designNeeded'),
    notes: formData.get('notes') || '',
    origin: window.location.origin
  };
}

async function refreshQuote() {
  if (!quoteForm) return;

  if (statusMessage) statusMessage.textContent = 'Calculating quote...';

  const response = await fetch(`${BACKEND_URL}/api/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getFormData())
  });

  if (!response.ok) {
    throw new Error('Quote request failed');
  }

  const quote = await response.json();

  tText('distributionCost', money(quote.distributionCost));
tText('printCost', money(quote.printCost));
tText('designCost', money(quote.designCost));
tText('totalCost', money(quote.totalCost));
tText('estimatedHomes', quote.estimatedHomes || 0);
tText('estimatedDays', quote.estimatedDays || '-');
tText('summaryZone', quote.zoneName || '-');
tText('summaryInsight', 'Up to 2,000 leaflets a day');

  if (statusMessage) statusMessage.textContent = 'Quote updated.';
  return quote;
}

async function saveOrder() {
  if (!quoteForm) return;

  if (statusMessage) statusMessage.textContent = 'Saving order...';

  const response = await fetch(`${BACKEND_URL}/order`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getFormData())
  });

  if (!response.ok) {
    throw new Error('Order save failed');
  }

  if (statusMessage) statusMessage.textContent = 'Order saved successfully.';
  return response.json();
}

async function lookupPostcode(postcode) {
  if (!postcode || typeof google === 'undefined' || !map) {
    if (statusMessage) statusMessage.textContent = 'Map lookup unavailable.';
    return;
  }

  const geocoder = new google.maps.Geocoder();

  geocoder.geocode(
    { address: postcode, componentRestrictions: { country: 'GB' } },
    (results, status) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location;
        map.setCenter(location);
        map.setZoom(13);

        if (marker) marker.setMap(null);
        marker = new google.maps.Marker({
          map,
          position: location,
          title: postcode.toUpperCase()
        });

        if (statusMessage) statusMessage.textContent = 'Postcode found.';
      } else {
        if (statusMessage) statusMessage.textContent = 'Postcode not found.';
      }
    }
  );
}

function initMap() {
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof L === 'undefined') return;

  const defaultCenter = [51.5072, -0.1276];

  map = L.map(mapEl).setView(defaultCenter, 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  marker = L.marker(defaultCenter).addTo(map);

  setTimeout(() => {
    map.invalidateSize();
  }, 100);
}

if (quoteForm) {
  quoteForm.addEventListener('change', () => {
    refreshQuote().catch(() => {
      if (statusMessage) statusMessage.textContent = 'Unable to update quote.';
    });
  });

  quoteForm.addEventListener('submit', (e) => {
    e.preventDefault();
    refreshQuote().catch(() => {
      if (statusMessage) statusMessage.textContent = 'Unable to update quote.';
    });
  });
}

if (saveOrderBtn) {
  saveOrderBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveOrder().catch(() => {
      if (statusMessage) statusMessage.textContent = 'Unable to save order.';
    });
  });
}

if (checkoutBtn) {
  checkoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    saveOrder().catch(() => {
      if (statusMessage) statusMessage.textContent = 'Unable to save order.';
    });
  });
}

if (mapLookupBtn && mapPostcode) {
  mapLookupBtn.addEventListener('click', (e) => {
    e.preventDefault();
    lookupPostcode(mapPostcode.value);
  });
}

if (quoteForm) {
  refreshQuote().catch(() => {
    if (statusMessage) statusMessage.textContent = 'Unable to load initial quote.';
  });
}
document.addEventListener('DOMContentLoaded', initMap);
document.addEventListener("DOMContentLoaded", () => {
  const checkoutBtn = document.getElementById("checkoutBtn");

  if (!checkoutBtn) {
    alert("Checkout button not found");
    return;
  }

  checkoutBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    try {
      alert("Button clicked");
const totalEl = document.getElementById("totalCost");
alert("Found total element: " + !!totalEl);

const totalText = totalEl ? totalEl.textContent : "£0";
alert("Total text is: " + totalText);

const amount = Math.round(Number(totalText.replace(/[^\d.]/g, "")) * 100);
alert("Amount is: " + amount);

      if (!amount || amount < 50) {
        alert("Please generate a quote first.");
        return;
      }

      alert("Sending checkout request");

      const response = await fetch("https://leafletpro-backend.onrender.com/create-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount })
      });

      const session = await response.json();

      if (!session.id) {
        alert("No Stripe session id returned");
        return;
      }

      alert("Redirecting to Stripe");

      const result = await stripe.redirectToCheckout({
        sessionId: session.id
      });

      if (result && result.error) {
        alert(result.error.message);
      }
    } catch (error) {
      alert("Checkout failed: " + error.message);
    }
  });
});
     
