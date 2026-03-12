let map;
let marker;

async function initMap() {
  const defaultCenter = { lat: 51.5072, lng: -0.1276 };
  const mapEl = document.getElementById('map');
  if (!mapEl || typeof google === 'undefined') return;
  map = new google.maps.Map(mapEl, {
    zoom: 11,
    center: defaultCenter,
    styles: [
      { featureType: 'poi', stylers: [{ visibility: 'off' }] },
      { featureType: 'transit', stylers: [{ visibility: 'off' }] }
    ]
  });
  marker = new google.maps.Marker({ position: defaultCenter, map, title: 'Default coverage area' });
}
window.initMap = initMap;

const quoteForm = document.getElementById('quoteForm');
const quantitySelect = document.getElementById('quantitySelect');
const deliveryTypeSelect = document.getElementById('deliveryTypeSelect');
const printBundlesSelect = document.getElementById('printBundlesSelect');
const designNeeded = document.getElementById('designNeeded');
const saveOrderBtn = document.getElementById('saveOrderBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const statusMessage = document.getElementById('statusMessage');
const mapLookupBtn = document.getElementById('mapLookupBtn');
const mapPostcode = document.getElementById('mapPostcode');

const money = (value) => `£${Number(value || 0).toFixed(2)}`;

function getFormData() {
  const formData = new FormData(quoteForm);
  return {
    customerName: formData.get('customerName') || '',
    email: formData.get('email') || '',
    phone: formData.get('phone') || '',
    postcode: formData.get('postcode') || '',
    quantity: Number(formData.get('quantity') || 1000),
    deliveryType: formData.get('deliveryType') || 'solus',
    printBundles: Number(formData.get('printBundles') || 0),
    designNeeded: formData.get('designNeeded') === 'on',
    notes: formData.get('notes') || '',
    origin: window.location.origin
  };
}

async function refreshQuote() {
  const response = await fetch('/api/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getFormData())
  });
  const quote = await response.json();
  document.getElementById('distributionCost').textContent = money(quote.distributionCost);
  document.getElementById('printCost').textContent = money(quote.printCost);
  document.getElementById('designCost').textContent = money(quote.designFee);
  document.getElementById('totalCost').textContent = money(quote.subtotal);
  return quote;
}

async function lookupPostcode(postcode) {
  if (!postcode || typeof google === 'undefined') return;
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: postcode, componentRestrictions: { country: 'GB' } }, (results, status) => {
    if (status === 'OK' && results[0] && map) {
      const location = results[0].geometry.location;
      map.setCenter(location);
      map.setZoom(13);
      if (marker) marker.setMap(null);
      marker = new google.maps.Marker({ map, position: location, title: postcode.toUpperCase() });
      statusMessage.textContent = `Coverage map centred on ${postcode.toUpperCase()}.`;
    } else {
      statusMessage.textContent = 'Postcode lookup did not return a result yet. Check your Google Maps API key and postcode format.';
    }
  });
}

async function saveOrder() {
  if (!quoteForm.reportValidity()) return;
  statusMessage.textContent = 'Saving order...';
  await refreshQuote();
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getFormData())
  });
  const data = await response.json();
  if (!response.ok) {
    statusMessage.textContent = data.error || 'Unable to save order.';
    return;
  }
  statusMessage.textContent = `Order ${data.id} saved successfully.`;
}

async function goToCheckout() {
  if (!quoteForm.reportValidity()) return;
  statusMessage.textContent = 'Creating Stripe checkout...';
  await refreshQuote();
  const response = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getFormData())
  });
  const data = await response.json();
  if (!response.ok) {
    statusMessage.textContent = data.error || 'Stripe checkout could not be created.';
    return;
  }
  window.location.href = data.url;
}

async function loadConfig() {
  try {
    const response = await fetch('/api/config');
    const config = await response.json();
    const businessEmail = document.getElementById('businessEmail');
    const businessPhone = document.getElementById('businessPhone');
    if (businessEmail) businessEmail.textContent = config.businessEmail || 'info@leafletprouk.com';
    if (businessPhone) businessPhone.textContent = config.businessPhone || '020 8103 5100';
  } catch (error) {
    // no-op
  }
}

[quantitySelect, deliveryTypeSelect, printBundlesSelect, designNeeded].forEach((el) => {
  if (el) el.addEventListener('change', refreshQuote);
});

if (saveOrderBtn) saveOrderBtn.addEventListener('click', saveOrder);
if (checkoutBtn) checkoutBtn.addEventListener('click', goToCheckout);
if (mapLookupBtn) mapLookupBtn.addEventListener('click', () => lookupPostcode(mapPostcode.value));
if (document.getElementById('postcodeInput')) {
  document.getElementById('postcodeInput').addEventListener('blur', (e) => {
    if (e.target.value) lookupPostcode(e.target.value);
  });
}

refreshQuote();
loadConfig();
