/*
  LeafletPro UK postcode-sector map upgrade
  -----------------------------------------
  Requires these files in the SAME folder as index.html:
    - london_postcode_sector_households_2021.json
    - london_postcode_sectors.geojson

  GeoJSON feature names can be stored in any of:
    postcode_sector, sector, name, pcode_sec, PCode_Sec, po_sector
*/
let map;
let marker;
let sectorLayer;
const selectedAreas = [];
const selectedLayers = new Map();
let householdCounts = {};
let currentTotalHouseholds = 0;

const DEFAULT_STYLE = {
  color: "#d7a645",
  weight: 1.25,
  fillColor: "#d7a645",
  fillOpacity: 0.16
};

const SELECTED_STYLE = {
  color: "#111827",
  weight: 3,
  fillColor: "#d7a645",
  fillOpacity: 0.68
};

function normaliseSector(value) {
  if (!value) return "";
  const clean = String(value).toUpperCase().trim().replace(/\s+/g, " ");
  const match = clean.match(/^([A-Z]{1,2}\d[A-Z\d]?)\s*([0-9])$/);
  return match ? `${match[1]} ${match[2]}` : clean;
}

function getFeatureSector(feature) {
  const p = feature?.properties || {};
  return normaliseSector(
    p.postcode_sector ??
    p.sector ??
    p.name ??
    p.pcode_sec ??
    p.PCode_Sec ??
    p.po_sector ??
    ""
  );
}

async function loadHouseholdCounts() {
  const response = await fetch("london_postcode_sector_households_2021.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("Could not load household JSON");
  const data = await response.json();

  householdCounts = {};
  for (const row of data.records || []) {
    const sector = normaliseSector(row.postcode_sector);
    householdCounts[sector] = Number(row.households || 0);
  }
}

function updateSelectionSummary() {
  currentTotalHouseholds = selectedAreas.reduce(
    (sum, area) => sum + Number(householdCounts[area] || 0),
    0
  );

  const textarea = document.querySelector('textarea[name="areas_required"]');
  if (textarea) textarea.value = selectedAreas.join(", ");

  const selectedAreaText = document.getElementById("selectedAreaText");
  const selectedHouseholdText = document.getElementById("selectedHouseholdText");

  if (selectedAreaText) {
    selectedAreaText.textContent = selectedAreas.length
      ? selectedAreas.join(", ")
      : "No areas selected";
  }

  if (selectedHouseholdText) {
    selectedHouseholdText.textContent =
      currentTotalHouseholds.toLocaleString("en-GB") + " households";
  }

  // Add useful data to the quote form without changing the visible form.
  let totalField = document.querySelector('input[name="selected_households"]');
  if (!totalField) {
    totalField = document.createElement("input");
    totalField.type = "hidden";
    totalField.name = "selected_households";
    document.getElementById("contactForm")?.appendChild(totalField);
  }
  if (totalField) totalField.value = String(currentTotalHouseholds);

  let sectorsField = document.querySelector('input[name="selected_postcode_sectors"]');
  if (!sectorsField) {
    sectorsField = document.createElement("input");
    sectorsField.type = "hidden";
    sectorsField.name = "selected_postcode_sectors";
    document.getElementById("contactForm")?.appendChild(sectorsField);
  }
  if (sectorsField) sectorsField.value = selectedAreas.join(", ");
}

function setLayerSelected(layer, sector, selected) {
  if (selected) {
    layer.setStyle(SELECTED_STYLE);
    selectedLayers.set(sector, layer);
    layer.bindTooltip(
      `${sector}<br>${Number(householdCounts[sector] || 0).toLocaleString("en-GB")} households`,
      { permanent: true, direction: "center", className: "postcode-label" }
    ).openTooltip();
    layer.bringToFront();
  } else {
    layer.setStyle(DEFAULT_STYLE);
    layer.unbindTooltip();
    selectedLayers.delete(sector);
  }
}

function toggleSector(layer, sector) {
  if (!householdCounts[sector]) return;

  const index = selectedAreas.indexOf(sector);
  const selecting = index === -1;

  if (selecting) selectedAreas.push(sector);
  else selectedAreas.splice(index, 1);

  setLayerSelected(layer, sector, selecting);
  updateSelectionSummary();

  const households = Number(householdCounts[sector] || 0);
  layer.bindPopup(
    `<strong>${sector}</strong><br>` +
    `Households: ${households.toLocaleString("en-GB")}<br>` +
    `Selected: ${selecting ? "Yes" : "No"}<br><br>` +
    `<strong>Total selected households:</strong><br>` +
    `${currentTotalHouseholds.toLocaleString("en-GB")}`
  ).openPopup();
}

async function loadSectorPolygons() {
  const response = await fetch("london_postcode_sectors.geojson", { cache: "no-cache" });
  if (!response.ok) {
    throw new Error(
      "Could not load london_postcode_sectors.geojson. Upload it next to index.html."
    );
  }

  const geojson = await response.json();

  // Only render sectors that exist in the household dataset.
  const filtered = {
    type: "FeatureCollection",
    features: (geojson.features || []).filter(feature => {
      const sector = getFeatureSector(feature);
      return Boolean(sector && householdCounts[sector]);
    })
  };

  sectorLayer = L.geoJSON(filtered, {
    style: () => DEFAULT_STYLE,
    onEachFeature(feature, layer) {
      const sector = getFeatureSector(feature);
      const households = Number(householdCounts[sector] || 0);

      layer.bindPopup(
        `<strong>${sector}</strong><br>` +
        `Households: ${households.toLocaleString("en-GB")}<br>` +
        `Click to add/remove this campaign area.`
      );

      layer.on("mouseover", function () {
        if (!selectedAreas.includes(sector)) {
          this.setStyle({ weight: 2.5, fillOpacity: 0.30 });
        }
      });

      layer.on("mouseout", function () {
        if (!selectedAreas.includes(sector)) {
          this.setStyle(DEFAULT_STYLE);
        }
      });

      layer.on("click", function () {
        toggleSector(this, sector);
      });
    }
  }).addTo(map);
}

const GOLD_MARKER_ICON = L.divIcon({
  className: "",
  html: '<div class="leafletpro-pin"></div>',
  iconSize: [30, 30],
  iconAnchor: [15, 29],
  popupAnchor: [0, -28]
});

function showMapLoading(mapEl) {
  let overlay = mapEl.querySelector(".map-loading-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.className = "map-loading-overlay";
    overlay.innerHTML = '<div class="map-loading-spinner"></div>';
    mapEl.style.position = mapEl.style.position || "relative";
    mapEl.appendChild(overlay);
  }
  return overlay;
}

function hideMapLoading(overlay) {
  if (!overlay) return;
  overlay.classList.add("hidden");
  setTimeout(() => overlay.remove(), 300);
}

async function initMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl || typeof L === "undefined") return;

  const loadingOverlay = showMapLoading(mapEl);

  map = L.map(mapEl, { zoomControl: true }).setView([51.5072, -0.1276], 11);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
    maxZoom: 20,
    subdomains: "abcd",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO"
  }).addTo(map);

  marker = L.marker([51.5072, -0.1276], { icon: GOLD_MARKER_ICON }).addTo(map);

  try {
    await loadHouseholdCounts();
    await loadSectorPolygons();
  } catch (error) {
    console.error(error);
    const selectedAreaText = document.getElementById("selectedAreaText");
    if (selectedAreaText) {
      selectedAreaText.textContent =
        "Map data could not load. Check that the JSON and GeoJSON files are uploaded.";
    }
  }

  updateSelectionSummary();
  hideMapLoading(loadingOverlay);

  setTimeout(() => map.invalidateSize(), 250);
}

async function lookupPostcode(postcode) {
  if (!postcode || !map) return;

  const query = normaliseSector(postcode);

  // Allow direct postcode-sector searches such as "N1 1" or "SE11 4".
  if (/^[A-Z]{1,2}\d[A-Z\d]? \d$/.test(query) && householdCounts[query]) {
    let found = false;
    sectorLayer?.eachLayer(layer => {
      if (getFeatureSector(layer.feature) === query) {
        found = true;
        map.fitBounds(layer.getBounds(), { padding: [20, 20] });
        layer.openPopup();
      }
    });
    if (found) return;
  }

  try {
    // postcodes.io is purpose-built for full UK postcode lookups.
    const response = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.trim())}`
    );
    const data = await response.json();

    if (response.ok && data?.result) {
      const lat = Number(data.result.latitude);
      const lon = Number(data.result.longitude);
      map.setView([lat, lon], 14);
      if (marker) {
        marker.setLatLng([lat, lon]);
      } else {
        marker = L.marker([lat, lon], { icon: GOLD_MARKER_ICON }).addTo(map);
      }

      // If a full postcode was entered, derive its sector and highlight its polygon.
      const pc = String(data.result.postcode || "").toUpperCase();
      const m = pc.match(/^([A-Z]{1,2}\d[A-Z\d]?)\s+(\d)[A-Z]{2}$/);
      if (m) {
        const sector = `${m[1]} ${m[2]}`;
        sectorLayer?.eachLayer(layer => {
          if (getFeatureSector(layer.feature) === sector) {
            map.fitBounds(layer.getBounds(), { padding: [20, 20] });
            layer.openPopup();
          }
        });
      }
      return;
    }

    throw new Error("Postcode not found");
  } catch (error) {
    console.error("Postcode lookup failed", error);
    alert("Sorry, we could not find that postcode.");
  }
}

function calculateLeads() {
  const leaflets = Number(document.getElementById("leadLeaflets")?.value || 0);
  const responseRate = Number(document.getElementById("responseRate")?.value || 0);
  const conversionRate = Number(document.getElementById("conversionRate")?.value || 0);

  const enquiries = Math.round(leaflets * (responseRate / 100));
  const customers = Math.round(enquiries * (conversionRate / 100));

  const enquiriesEl = document.getElementById("estimatedEnquiries");
  const customersEl = document.getElementById("estimatedCustomers");
  if (enquiriesEl) enquiriesEl.textContent = enquiries;
  if (customersEl) customersEl.textContent = customers;
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  calculateLeads();

  const mapLookupBtn = document.getElementById("mapLookupBtn");
  const mapPostcode = document.getElementById("mapPostcode");
  const form = document.getElementById("contactForm");
  const menuToggle = document.getElementById("menuToggle");
  const siteNav = document.getElementById("siteNav");
  const statusMessage = document.getElementById("statusMessage");

  if (menuToggle && siteNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = siteNav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });

    siteNav.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        siteNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", e => {
      if (!siteNav.contains(e.target) && !menuToggle.contains(e.target)) {
        siteNav.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (mapLookupBtn && mapPostcode) {
    mapLookupBtn.addEventListener("click", () => lookupPostcode(mapPostcode.value.trim()));
    mapPostcode.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        e.preventDefault();
        lookupPostcode(mapPostcode.value.trim());
      }
    });
  }

  if (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();

      if (statusMessage) {
        statusMessage.style.display = "block";
        statusMessage.textContent = "Sending your enquiry...";
      }

      const formData = new FormData(form);

      try {
        const response = await fetch("https://formspree.io/f/xojkkejz", {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" }
        });

        if (response.ok) {
          fetch("https://leafletpro-backend.onrender.com/order", {
            method: "POST",
            body: formData
          }).catch(() => {});

          window.location.href = "/thank-you.html";
        } else if (statusMessage) {
          statusMessage.textContent =
            "There was a problem sending your enquiry. Please try again.";
        }
      } catch (error) {
        if (statusMessage) {
          statusMessage.textContent =
            "There was a problem sending your enquiry. Please try again.";
        }
      }
    });
  }
});
