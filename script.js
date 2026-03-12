let map;
let marker;

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

  setText('distributionCost', money(quote.distributionCost));
  setText('printCost', money(quote.printCost));
  setText('trackingCost', money(quote.trackingCost));
  setText('designCost', money(quote.designCost));
  setText('setupCost', money(quote.setupCost));
  setText('priorityCost', money(quote.priorityCost));
  setText('subtotalCost', money(quote.subtotalCost));
  setText('vatCost', money(quote.vatCost));
  setText('totalCost', money(quote.totalCost));
  setText('estimatedHomes', quote.estimatedHomes || 0);
  setText('estimatedDays', quote.estimatedDays || '-');
  setText('ratePerThousand', money(quote.ratePerThousand));
  setText('summaryZone', quote.zoneName || '-');
  setText('summaryInsight', quote.summaryInsight || '-');

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
  if (!mapEl || typeof google === 'undefined') return;

  const defaultCenter = { lat: 51.5072, lng: -0.1276 };

  map = new google.maps.Map(mapEl, {
    zoom: 11,
    center: defaultCenter
  });

  marker = new google.maps.Marker({
    map,
    position: defaultCenter
  });
}

window.initMap = initMap;

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
