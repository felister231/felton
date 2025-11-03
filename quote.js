// ========== quote.js (Mapbox + bracket pricing + search) ==========

// Your Mapbox token
const MAPBOX_TOKEN = "pk.eyJ1IjoibWFsaXR1IiwiYSI6ImNtZWxkY3gyaDBmbHEybHNlejNqeXI3b3oifQ.Gj6G79AHfkd4jD6FnIohlg";

// Globals
let map;
let geocoder;
let fromMarker = null;
let toMarker = null;
let fromCoords = null;
let toCoords = null;
let activeField = null;

// ---- Modal map open/close ----
window.openMap = function(field) {
  activeField = field;
  const modal = document.getElementById("mapModal");
  modal.style.display = "block";

  if (!map) {
    mapboxgl.accessToken = MAPBOX_TOKEN;
    map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [36.817223, -1.286389],
      zoom: 12
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Geocoder search box
   // Initialize Geocoder with Kenya bias
geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  countries: "KE", // restrict to Kenya
  placeholder: "Search location in Kenya...",
  proximity: { longitude: 37.9062, latitude: -0.0236 } // center of Kenya
});

    document.getElementById("geocoder").appendChild(geocoder.onAdd(map));

    // When selecting from search
    geocoder.on("result", (e) => {
      const lngLat = e.result.center;
      placeMarker(lngLat);
      document.getElementById(activeField).value = e.result.place_name;
      if (activeField === "from") fromCoords = lngLat;
      else toCoords = lngLat;
      closeMap();
    });

    // When clicking on map
    map.on("click", async (e) => {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      placeMarker(lngLat);
      const placeName = await reverseGeocode(lngLat);
      document.getElementById(activeField).value = placeName;
      if (activeField === "from") fromCoords = lngLat;
      else toCoords = lngLat;
      closeMap();
    });

    setTimeout(() => map.resize(), 250);
  } else {
    setTimeout(() => map.resize(), 250);
  }
};

window.closeMap = function() {
  document.getElementById("mapModal").style.display = "none";
};

// Place or replace marker
function placeMarker(lngLat) {
  if (activeField === "from") {
    if (fromMarker) fromMarker.remove();
    fromMarker = new mapboxgl.Marker({ color: "#10b981" }).setLngLat(lngLat).addTo(map);
  } else {
    if (toMarker) toMarker.remove();
    toMarker = new mapboxgl.Marker({ color: "#ef4444" }).setLngLat(lngLat).addTo(map);
  }
}

// ---- Geocoding helpers ----
async function reverseGeocode([lng, lat]) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.features?.[0]?.place_name || `${lat}, ${lng}`;
}

async function forwardGeocode(query) {
  if (!query || !query.trim()) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&proximity=36.817223,-1.286389&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.features?.[0]?.center || null;
}

// ---- Directions / Distance ----
async function getDistanceKm(fromLngLat, toLngLat) {
  const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromLngLat[0]},${fromLngLat[1]};${toLngLat[0]},${toLngLat[1]}?overview=false&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  const meters = data?.routes?.[0]?.distance;
  if (typeof meters !== "number") throw new Error("No route found");
  return meters / 1000;
}

// ---- Bracket Pricing ----
function calculatePrice(distanceKm, houseType) {
  let price = 0;
  if (houseType === "Bedsitter") {
    if (distanceKm <= 10) price = 8000;
    else if (distanceKm <= 15) price = 10000;
    else if (distanceKm <= 20) price = 12000;
    else if (distanceKm <= 25) price = 14000;
    else if (distanceKm <= 30) price = 16000;
    else price = 20000;
  } else if (houseType === "1 Bedroom") {
    if (distanceKm <= 10) price = 10000;
    else if (distanceKm <= 15) price = 12000;
    else if (distanceKm <= 20) price = 14000;
    else if (distanceKm <= 25) price = 18000;
    else if (distanceKm <= 30) price = 20000;
    else price = 25000;
  } else if (houseType === "2 Bedroom") {
    if (distanceKm <= 10) price = 12000;
    else if (distanceKm <= 15) price = 14000;
    else if (distanceKm <= 20) price = 18000;
    else if (distanceKm <= 25) price = 20000;
    else if (distanceKm <= 30) price = 25000;
    else price = 30000;
  } else if (houseType === "3 Bedroom") {
    if (distanceKm <= 10) price = 14000;
    else if (distanceKm <= 15) price = 18000;
    else if (distanceKm <= 20) price = 20000;
    else if (distanceKm <= 25) price = 25000;
    else if (distanceKm <= 30) price = 30000;
    else price = 35000;
  } else {
    if (distanceKm <= 10) price = 16000;
    else if (distanceKm <= 15) price = 18000;
    else if (distanceKm <= 20) price = 20000;
    else if (distanceKm <= 25) price = 25000;
    else if (distanceKm <= 30) price = 30000;
    else price = 35000;
  }
  return price;
}

// ---- Form submit ----
document.getElementById("quoteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const loader = document.getElementById("loader");
  const priceDisplay = document.getElementById("priceDisplay");
  const downloadBtn = document.getElementById("downloadPDF");
  const whatsappBtn = document.getElementById("whatsappShare");

  loader.style.display = "block";
  priceDisplay.innerHTML = "";
  downloadBtn.style.display = "none";
  whatsappBtn.style.display = "none";

  const fromInput = document.getElementById("from").value.trim();
  const toInput = document.getElementById("to").value.trim();
  const houseType = document.getElementById("house-type").value;

  try {
    if (!fromCoords) fromCoords = await forwardGeocode(fromInput);
    if (!toCoords) toCoords = await forwardGeocode(toInput);
    if (!fromCoords || !toCoords) throw new Error("Missing coords");

    const distanceKm = await getDistanceKm(fromCoords, toCoords);
    const price = calculatePrice(distanceKm, houseType);

    loader.style.display = "none";
    priceDisplay.innerHTML = `
      <h2>Estimated Price: KES ${price.toLocaleString()}</h2>
      <p>Distance: ${distanceKm.toFixed(2)} km</p>
      <p>House Type: ${houseType}</p>
    `;
    downloadBtn.style.display = "inline-block";
    whatsappBtn.style.display = "inline-block";

    // WhatsApp message
    let message = `Hello FelTon Movers, I got a quote of KSh ${price} for moving a ${houseType} from ${fromInput} to ${toInput} (${distanceKm.toFixed(2)} km).`;
    whatsappBtn.href = `https://wa.me/254111300121?text=${encodeURIComponent(message)}`;

  } catch (err) {
    console.warn(err);
    loader.style.display = "none";
    document.getElementById("manualDistanceSection").style.display = "block";
    alert("Couldn't detect distance automatically. Please enter it manually below.");
  }
});

// ---- Manual distance fallback ----
document.getElementById("manualCalcBtn").addEventListener("click", () => {
  const manualDistance = parseFloat(document.getElementById("manualDistanceInput").value);
  const houseType = document.getElementById("house-type").value;

  if (isNaN(manualDistance) || manualDistance <= 0) {
    alert("Please enter a valid distance in km.");
    return;
  }

  const price = calculatePrice(manualDistance, houseType);

  const priceDisplay = document.getElementById("priceDisplay");
  priceDisplay.innerHTML = `
    <h2>Estimated Price: KES ${price.toLocaleString()}</h2>
    <p>Distance: ${manualDistance.toFixed(2)} km</p>
    <p>House Type: ${houseType}</p>
  `;
  document.getElementById("downloadPDF").style.display = "inline-block";
  document.getElementById("whatsappShare").style.display = "inline-block";
});

// ---- PDF Download ----
document.getElementById("downloadPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) return alert("PDF library not loaded.");

  const name = document.getElementById("fullname").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const from = document.getElementById("from").value.trim();
  const to = document.getElementById("to").value.trim();
  const houseType = document.getElementById("house-type").value;
  const priceText = document.getElementById("priceDisplay").innerText;

  const doc = new jsPDF();
  let y = 20;
  doc.setFontSize(18);
  doc.text("FelTon Movers & Cleaners — Quote", 14, y); y += 10;
  doc.setFontSize(12);
  doc.text(`Name: ${name}`, 14, y); y += 6;
  doc.text(`Phone: ${phone}`, 14, y); y += 6;
  doc.text(`Email: ${email}`, 14, y); y += 10;
  doc.text(`From: ${from}`, 14, y); y += 6;
  doc.text(`To: ${to}`, 14, y); y += 6;
  doc.text(`House Type: ${houseType}`, 14, y); y += 10;
  doc.text(priceText, 14, y);
  doc.save("FelTon_Movers_Quote.pdf");
});
