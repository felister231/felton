// ========== quote.js (Mapbox modal + bracket pricing) ==========
const MAPBOX_TOKEN = "pk.eyJ1IjoibWFsaXR1IiwiYSI6ImNtZWxkY3gyaDBmbHEybHNlejNqeXI3b3oifQ.Gj6G79AHfkd4jD6FnIohlg";

let map, geocoder, fromMarker, toMarker;
let fromCoords = null, toCoords = null, activeField = null;

// ---- Open Map Modal ----
window.openMap = function (field) {
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

    // Initialize Geocoder
    geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      countries: "KE",
      placeholder: "Search location in Kenya...",
      proximity: { longitude: 37.9062, latitude: -0.0236 }
    });

    document.getElementById("geocoder").appendChild(geocoder.onAdd(map));

    // Select from search
    geocoder.on("result", (e) => {
      const lngLat = e.result.center;
      placeMarker(lngLat);
      document.getElementById(activeField).value = e.result.place_name;
      if (activeField === "from") fromCoords = lngLat;
      else toCoords = lngLat;
      closeMap();
    });

    // Select by clicking map
    map.on("click", async (e) => {
      const lngLat = [e.lngLat.lng, e.lngLat.lat];
      placeMarker(lngLat);
      const placeName = await reverseGeocode(lngLat);
      document.getElementById(activeField).value = placeName;
      if (activeField === "from") fromCoords = lngLat;
      else toCoords = lngLat;
      closeMap();
    });
  }

  // ✅ Fix: Ensure map displays properly when modal opens
  setTimeout(() => map.resize(), 300);
};

// ---- Close Map Modal ----
window.closeMap = function () {
  document.getElementById("mapModal").style.display = "none";
};

// ---- Marker placement ----
function placeMarker(lngLat) {
  if (activeField === "from") {
    if (fromMarker) fromMarker.remove();
    fromMarker = new mapboxgl.Marker({ color: "#10b981" }).setLngLat(lngLat).addTo(map);
  } else {
    if (toMarker) toMarker.remove();
    toMarker = new mapboxgl.Marker({ color: "#ef4444" }).setLngLat(lngLat).addTo(map);
  }
}

// ---- Reverse geocoding ----
async function reverseGeocode([lng, lat]) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?limit=1&access_token=${MAPBOX_TOKEN}`;
  const res = await fetch(url);
  const data = await res.json();
  return data?.features?.[0]?.place_name || `${lat}, ${lng}`;
}

// ---- Directions API ----
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

// ---- Submit Form ----
document.getElementById("quoteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const loader = document.getElementById("loader");
  const priceDisplay = document.getElementById("priceDisplay");
  const whatsappBtn = document.getElementById("whatsappShare");

  loader.style.display = "block";
  priceDisplay.innerHTML = "";
  whatsappBtn.style.display = "none";

  const fromInput = document.getElementById("from").value.trim();
  const toInput = document.getElementById("to").value.trim();
  const houseType = document.getElementById("house-type").value;

  try {
    if (!fromCoords || !toCoords) throw new Error("Missing coordinates");
    const distanceKm = await getDistanceKm(fromCoords, toCoords);
    const price = calculatePrice(distanceKm, houseType);

    loader.style.display = "none";
    priceDisplay.innerHTML = `
      <h2>Estimated Price: KES ${price.toLocaleString()}</h2>
      <p>Distance: ${distanceKm.toFixed(2)} km</p>
      <p>House Type: ${houseType}</p>
    `;

    const message = `Hello FelTon Movers, I got a quote of KSh ${price.toLocaleString()} for moving a ${houseType} from ${fromInput} to ${toInput} (${distanceKm.toFixed(2)} km).`;
    whatsappBtn.href = `https://wa.me/254111300121?text=${encodeURIComponent(message)}`;
    whatsappBtn.style.display = "inline-block";

  } catch (err) {
    console.warn(err);
    loader.style.display = "none";
    alert("Couldn't detect distance automatically. Please try again or pick again from the map.");
  }
});
