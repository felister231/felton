// ========== quote.js (Mapbox + your bracket pricing) ==========

// Your Mapbox token
const MAPBOX_TOKEN = "pk.eyJ1IjoibWFsaXR1IiwiYSI6ImNtZWxkY3gyaDBmbHEybHNlejNqeXI3b3oifQ.Gj6G79AHfkd4jD6FnIohlg";

// Globals
let map;                // Mapbox GL map instance
let fromMarker = null;  // "From" marker
let toMarker = null;    // "To" marker
let fromCoords = null;  // [lng, lat]
let toCoords = null;    // [lng, lat]
let activeField = null; // 'from' | 'to'

// ---- Modal map open/close ----
window.openMap = function(field) {
  activeField = field; // remember which field we're picking for
  const modal = document.getElementById("mapModal");
  modal.style.display = "block";

  // If map not initialized yet, create it
  if (!map) {
    // Ensure Mapbox GL script is present
    if (typeof mapboxgl === "undefined") {
      alert("Map failed to load. Please check your internet connection.");
      return;
    }
    mapboxgl.accessToken = MAPBOX_TOKEN;

    map = new mapboxgl.Map({
      container: "map",
      style: "mapbox://styles/mapbox/streets-v12",
      center: [36.817223, -1.286389], // Nairobi CBD approx [lng, lat]
      zoom: 12
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    // Place / replace marker on click, reverse-geocode, fill input
    map.on("click", async (e) => {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];

      if (activeField === "from") {
        if (fromMarker) fromMarker.remove();
        fromMarker = new mapboxgl.Marker({ color: "#10b981" }) // green
          .setLngLat(lngLat)
          .addTo(map);
        fromCoords = lngLat;
      } else {
        if (toMarker) toMarker.remove();
        toMarker = new mapboxgl.Marker({ color: "#ef4444" }) // red
          .setLngLat(lngLat)
          .addTo(map);
        toCoords = lngLat;
      }

      // Reverse geocode to a friendly place name
      try {
        const placeName = await reverseGeocode(lngLat);
        document.getElementById(activeField).value = placeName;
      } catch {
        document.getElementById(activeField).value = `${lngLat[1].toFixed(6)}, ${lngLat[0].toFixed(6)}`;
      }

      closeMap(); // close after selection (matches your UX)
    });

    // Safety: resize after modal becomes visible so tiles render correctly
    setTimeout(() => map.resize(), 250);
  } else {
    // Map exists; just resize to render within modal
    setTimeout(() => map.resize(), 250);
  }
};

window.closeMap = function() {
  document.getElementById("mapModal").style.display = "none";
};

// ---- Geocoding helpers ----
async function reverseGeocode([lng, lat]) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  const name = data?.features?.[0]?.place_name;
  if (!name) throw new Error("No reverse geocode result");
  return name;
}

async function forwardGeocode(query) {
  if (!query || !query.trim()) return null;
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?limit=1&proximity=36.817223,-1.286389&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  const feat = data?.features?.[0];
  return feat ? feat.center : null; // [lng, lat]
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

// ---- Your exact pricing brackets ----
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
    // More than 3 Bedrooms
    if (distanceKm <= 10) price = 16000;
    else if (distanceKm <= 15) price = 18000;
    else if (distanceKm <= 20) price = 20000;
    else if (distanceKm <= 25) price = 25000;
    else if (distanceKm <= 30) price = 30000;
    else price = 35000;
  }
  return price;
}

// ---- Form submit: detect distance -> compute price ----
document.getElementById("quoteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const loader = document.getElementById("loader");
  const priceDisplay = document.getElementById("priceDisplay");
  const downloadBtn = document.getElementById("downloadPDF");

  loader.style.display = "block";
  priceDisplay.innerHTML = "";
  downloadBtn.style.display = "none";

  const fromInput = document.getElementById("from").value.trim();
  const toInput = document.getElementById("to").value.trim();
  const houseType = document.getElementById("house-type").value;

  try {
    // If user didn't pick on map, try forward geocoding typed addresses
    if (!fromCoords) fromCoords = await forwardGeocode(fromInput);
    if (!toCoords) toCoords = await forwardGeocode(toInput);

    if (!fromCoords || !toCoords) {
      throw new Error("Missing coords");
    }

    const distanceKm = await getDistanceKm(fromCoords, toCoords);
    const price = calculatePrice(distanceKm, houseType);

    loader.style.display = "none";
    priceDisplay.innerHTML = `
      <h2>Estimated Price: KES ${price.toLocaleString()}</h2>
      <p>Distance: ${distanceKm.toFixed(2)} km</p>
      <p>House Type: ${houseType}</p>
    `;
    downloadBtn.style.display = "inline-block";

    // Store last results for PDF
    priceDisplay.dataset.price = price;
    priceDisplay.dataset.distance = distanceKm.toFixed(2);
    priceDisplay.dataset.house = houseType;
    priceDisplay.dataset.from = fromInput || (await safePlaceName(fromCoords));
    priceDisplay.dataset.to = toInput || (await safePlaceName(toCoords));
  } catch (err) {
    console.warn(err);
    loader.style.display = "none";
    document.getElementById("manualDistanceSection").style.display = "block";
    alert("Couldn't detect distance automatically. Please enter it manually below.");
  }
});

// Helper to get a readable name if inputs were blank
async function safePlaceName(lngLat) {
  try {
    return await reverseGeocode(lngLat);
  } catch {
    return `${lngLat[1].toFixed(6)}, ${lngLat[0].toFixed(6)}`;
  }
}

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

  priceDisplay.dataset.price = price;
  priceDisplay.dataset.distance = manualDistance.toFixed(2);
  priceDisplay.dataset.house = houseType;
  priceDisplay.dataset.from = document.getElementById("from").value.trim();
  priceDisplay.dataset.to = document.getElementById("to").value.trim();
});

// ---- PDF Download ----
document.getElementById("downloadPDF").addEventListener("click", () => {
  const { jsPDF } = window.jspdf || {};
  if (!jsPDF) {
    alert("PDF library not loaded.");
    return;
  }

  const name = document.getElementById("fullname").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();

  const priceDisplay = document.getElementById("priceDisplay");
  const price = priceDisplay.dataset.price || "";
  const distance = priceDisplay.dataset.distance || "";
  const house = priceDisplay.dataset.house || "";
  const fromTxt = priceDisplay.dataset.from || document.getElementById("from").value.trim();
  const toTxt = priceDisplay.dataset.to || document.getElementById("to").value.trim();

  const doc = new jsPDF();
  let y = 20;

  doc.setFontSize(18);
  doc.text("FelTon Movers & Cleaners — Quote", 14, y); y += 10;

  doc.setFontSize(12);
  doc.text(`Name: ${name}`, 14, y); y += 6;
  doc.text(`Phone: ${phone}`, 14, y); y += 6;
  doc.text(`Email: ${email}`, 14, y); y += 10;

  doc.text(`From: ${fromTxt}`, 14, y); y += 6;
  doc.text(`To: ${toTxt}`, 14, y); y += 6;
  doc.text(`House Type: ${house}`, 14, y); y += 6;
  doc.text(`Distance: ${distance} km`, 14, y); y += 10;

  doc.setFontSize(14);
  doc.text(`Estimated Price: KES ${Number(price).toLocaleString()}`, 14, y); y += 10;

  doc.setFontSize(10);
  doc.text("Note: This is an estimate. Final price may vary after assessment.", 14, y);

  doc.save("FelTon_Movers_Quote.pdf");
});
let message = `Hello FelTon Movers, I got a quote of KSh ${price} for moving a ${houseType} from ${from} to ${to} (${distanceKm} km).`;
document.getElementById("whatsappShare").href = 
  `https://wa.me/254111300121?text=${encodeURIComponent(message)}`;
document.getElementById("whatsappShare").style.display = "inline-block";
