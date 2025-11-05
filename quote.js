let map, activeField, fromMarker, toMarker;
let fromCoords = null, toCoords = null;
let directionsService, directionsRenderer;
let autocomplete;

// --- Open Map Modal ---
window.openMap = function (field) {
  activeField = field;
  const modal = document.getElementById("mapModal");
  modal.style.display = "block";

  if (!map) {
    map = new google.maps.Map(document.getElementById("map"), {
      center: { lat: -1.286389, lng: 36.817223 },
      zoom: 12,
    });

    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({ suppressMarkers: true });
    directionsRenderer.setMap(map);

    // Use new PlaceAutocompleteElement
    const input = document.getElementById("pac-input");
    autocomplete = new google.maps.places.PlaceAutocompleteElement({
      element: input,
      fields: ["name", "geometry", "formatted_address"],
      restrictions: { country: ["KE"] },
      locationBias: map.getBounds(),
    });

    autocomplete.addEventListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry) return;
      const position = place.geometry.location;

      placeMarker(position);
      map.panTo(position);
      document.getElementById(activeField).value = place.formatted_address;

      if (activeField === "from") fromCoords = { lat: position.lat(), lng: position.lng() };
      else toCoords = { lat: position.lat(), lng: position.lng() };
      closeMap();
    });

    // Click on map to select location
    map.addListener("click", (e) => {
      placeMarker(e.latLng);
      reverseGeocode(e.latLng);
    });
  }

  setTimeout(() => google.maps.event.trigger(map, "resize"), 300);
};

// --- Close Map Modal ---
window.closeMap = function () {
  document.getElementById("mapModal").style.display = "none";
};

// --- Confirm location (manual close) ---
window.confirmLocation = function () {
  closeMap();
};

// --- Place Marker ---
function placeMarker(position) {
  if (activeField === "from") {
    if (fromMarker) fromMarker.setMap(null);
    fromMarker = new google.maps.Marker({ position, map, label: "A" });
  } else {
    if (toMarker) toMarker.setMap(null);
    toMarker = new google.maps.Marker({ position, map, label: "B" });
  }
}

// --- Reverse Geocode ---
function reverseGeocode(latlng) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ location: latlng }, (results, status) => {
    if (status === "OK" && results[0]) {
      document.getElementById(activeField).value = results[0].formatted_address;
      if (activeField === "from") fromCoords = { lat: latlng.lat(), lng: latlng.lng() };
      else toCoords = { lat: latlng.lat(), lng: latlng.lng() };
    }
  });
}

// --- Calculate Distance ---
async function getDistanceKm(fromCoords, toCoords) {
  return new Promise((resolve, reject) => {
    const request = {
      origin: fromCoords,
      destination: toCoords,
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === "OK") {
        const meters = result.routes[0].legs[0].distance.value;
        resolve(meters / 1000);
      } else {
        reject("Could not calculate distance: " + status);
      }
    });
  });
}

// --- Bracket Pricing ---
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

// --- Handle Form Submission ---
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
    loader.style.display = "none";
    alert("Couldn't calculate distance automatically. Please try again.");
    console.error(err);
  }
});
