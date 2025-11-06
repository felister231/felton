/* quote.js - FelTon Movers
   Draggable modal pin + autocomplete + reverse geocode + route + distance -> price
*/

let map = null;
let modalMarker = null;
let fromMarker = null, toMarker = null;
let fromCoords = null, toCoords = null;
let directionsService = null, directionsRenderer = null;
let geocoder = null, autocomplete = null;
let activeField = null;

// --- Open Map Modal ---
window.openMap = function (field) {
  activeField = field;
  const modal = document.getElementById("mapModal");
  modal.style.display = "block";

  if (!map) initMap();

  const inputVal = document.getElementById(activeField).value;
  if (activeField === "from" && fromCoords) {
    setModalMarkerPosition(fromCoords);
  } else if (activeField === "to" && toCoords) {
    setModalMarkerPosition(toCoords);
  } else if (inputVal && !modalMarker) {
    geocodeAddressToModalMarker(inputVal);
  }

  setTimeout(() => {
    google.maps.event.trigger(map, "resize");
    if (modalMarker && modalMarker.getPosition) map.panTo(modalMarker.getPosition());
  }, 250);
};

// --- Close Map Modal ---
window.closeMap = function () {
  document.getElementById("mapModal").style.display = "none";
  const input = document.getElementById("pac-input");
  if (input) input.blur();
};

// --- Initialize Map & Services ---
function initMap() {
  const defaultCenter = { lat: -1.286389, lng: 36.817223 }; // Nairobi
  map = new google.maps.Map(document.getElementById("map"), {
    center: defaultCenter,
    zoom: 12,
  });

  geocoder = new google.maps.Geocoder();

  modalMarker = new google.maps.Marker({
    position: defaultCenter,
    map: map,
    draggable: true,
    title: "Drag me to fine tune location",
    animation: google.maps.Animation.DROP,
  });

  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: true,
    polylineOptions: { strokeColor: "#007bff", strokeWeight: 5 },
  });
  directionsRenderer.setMap(map);

  const input = document.getElementById("pac-input");
  autocomplete = new google.maps.places.Autocomplete(input, {
    fields: ["geometry", "formatted_address", "name"],
    componentRestrictions: { country: "KE" },
  });
  autocomplete.bindTo("bounds", map);

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") e.preventDefault();
  });

  autocomplete.addListener("place_changed", function () {
    const place = autocomplete.getPlace();
    if (!place.geometry) return alert("Pick a suggestion from the list.");

    const loc = place.geometry.location;
    setModalMarkerPosition({ lat: loc.lat(), lng: loc.lng() });
    input.value = place.formatted_address || place.name;
  });

  map.addListener("click", e => {
    setModalMarkerPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    reverseGeocodeToInput(e.latLng);
  });

  modalMarker.addListener("dragend", function () {
    reverseGeocodeToInput(modalMarker.getPosition());
  });
}

function setModalMarkerPosition(pos) {
  const latlng = new google.maps.LatLng(pos.lat, pos.lng);
  modalMarker.setPosition(latlng);
  map.panTo(latlng);
  map.setZoom(15);
  reverseGeocodeToInput(latlng);
}

function reverseGeocodeToInput(latLng) {
  geocoder.geocode({ location: latLng }, (results, status) => {
    const input = document.getElementById("pac-input");
    if (status === "OK" && results[0]) {
      input.value = results[0].formatted_address;
    } else {
      input.value = `${latLng.lat().toFixed(5)}, ${latLng.lng().toFixed(5)}`;
    }
  });
}

function geocodeAddressToModalMarker(address) {
  geocoder.geocode({ address }, (results, status) => {
    if (status === "OK" && results[0]) {
      const loc = results[0].geometry.location;
      setModalMarkerPosition({ lat: loc.lat(), lng: loc.lng() });
    }
  });
}

// --- Confirm Location ---
window.confirmLocation = function () {
  const address = document.getElementById("pac-input").value || "";
  const pos = modalMarker.getPosition();
  if (!pos) return alert("No location chosen.");

  if (activeField === "from") {
    document.getElementById("from").value = address;
    fromCoords = { lat: pos.lat(), lng: pos.lng() };
  } else {
    document.getElementById("to").value = address;
    toCoords = { lat: pos.lat(), lng: pos.lng() };
  }

  closeMap();

  if (fromCoords && toCoords) {
    drawRouteAndAutoUpdate();
  }
};

// --- Draw route + auto update distance/price ---
function drawRouteAndAutoUpdate() {
  if (!fromCoords || !toCoords) return;

  const req = {
    origin: fromCoords,
    destination: toCoords,
    travelMode: google.maps.TravelMode.DRIVING,
  };

  directionsService.route(req, (result, status) => {
    if (status === "OK" && result) {
      directionsRenderer.setDirections(result);

      if (fromMarker) fromMarker.setMap(null);
      if (toMarker) toMarker.setMap(null);

      const leg = result.routes[0].legs[0];
      fromMarker = new google.maps.Marker({
        position: leg.start_location,
        map,
        label: "A",
      });
      toMarker = new google.maps.Marker({
        position: leg.end_location,
        map,
        label: "B",
      });

      fromCoords = { lat: leg.start_location.lat(), lng: leg.start_location.lng() };
      toCoords = { lat: leg.end_location.lat(), lng: leg.end_location.lng() };

      const distanceKm = leg.distance.value / 1000;
      const houseType = document.getElementById("house-type").value;
      const price = calculatePrice(distanceKm, houseType);

      document.getElementById("priceDisplay").innerHTML = `
        <h2>Estimated Price: KES ${price.toLocaleString()}</h2>
        <p>Distance: ${distanceKm.toFixed(2)} km</p>
        <p>House Type: ${houseType}</p>
      `;
    } else {
      alert("Could not draw route: " + status);
    }
  });
}

// --- Distance Wrapper (still used by form) ---
async function getDistanceKm(fc, tc) {
  return new Promise((resolve, reject) => {
    if (!fc || !tc) return reject("Missing coords");
    const req = { origin: fc, destination: tc, travelMode: google.maps.TravelMode.DRIVING };
    directionsService.route(req, (result, status) => {
      if (status === "OK" && result.routes[0] && result.routes[0].legs[0]) {
        const meters = result.routes[0].legs[0].distance.value;
        resolve(meters / 1000);
      } else reject("Could not calculate distance: " + status);
    });
  });
}

// --- Pricing ---
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

// --- Form submit: fallback manual trigger ---
document.getElementById("quoteForm").addEventListener("submit", async e => {
  e.preventDefault();

  const loader = document.getElementById("loader");
  const priceDisplay = document.getElementById("priceDisplay");
  const whatsappBtn = document.getElementById("whatsappShare");

  if (loader) loader.style.display = "block";
  priceDisplay.innerHTML = "";
  whatsappBtn.style.display = "none";

  try {
    if (!fromCoords || !toCoords) throw new Error("Pick both From and To locations.");

    const distanceKm = await getDistanceKm(fromCoords, toCoords);
    const houseType = document.getElementById("house-type").value;
    const price = calculatePrice(distanceKm, houseType);

    loader.style.display = "none";
    priceDisplay.innerHTML = `
      <h2>Estimated Price: KES ${price.toLocaleString()}</h2>
      <p>Distance: ${distanceKm.toFixed(2)} km</p>
      <p>House Type: ${houseType}</p>
    `;

    const message = `Hello FelTon Movers, I got a quote of KSh ${price.toLocaleString()} for moving a ${houseType} (${distanceKm.toFixed(2)} km).`;
    whatsappBtn.href = `https://wa.me/254111300121?text=${encodeURIComponent(message)}`;
    whatsappBtn.style.display = "inline-block";
  } catch (err) {
    loader.style.display = "none";
    alert(err.message || err);
  }
});
