let currentField = '';
let selectedCoords = {
  from: null,
  to: null
};
let mapInstance = null;
let locationPin = null;

const API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjIzYjRjMDQ3MjFiMzQzZGFhZGZkN2QzYTY0ZDRhOWYwIiwiaCI6Im11cm11cjY0In0=";

function openMap(field) {
  currentField = field;
  document.getElementById('mapModal').style.display = 'block';
  initMap();
}

function closeMap() {
  document.getElementById('mapModal').style.display = 'none';
}

function initMap() {
  if (mapInstance) {
    mapInstance.remove();
  }

  mapInstance = L.map('map').setView([-1.286389, 36.817223], 13);

  const bounds = L.latLngBounds(
    L.latLng(-4.678, 33.909),
    L.latLng(5.506, 41.899)
  );

  mapInstance.setMaxBounds(bounds);
  mapInstance.on('drag', () => {
    mapInstance.panInsideBounds(bounds, { animate: false });
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  L.Control.geocoder({
    defaultMarkGeocode: true,
    geocoder: L.Control.Geocoder.nominatim({
      geocodingQueryParams: {
        countrycodes: 'KE'
      }
    })
  }).addTo(mapInstance);

  const input = document.querySelector('.leaflet-control-geocoder-form input');
  if (input) {
    input.placeholder = "Search apartments, estates in Kenya";
    input.style.color = '#333';
  }

  locationPin = L.marker(mapInstance.getCenter(), { draggable: true }).addTo(mapInstance);

  locationPin.on('dragend', async function () {
    const { lat, lng } = locationPin.getLatLng();
    selectedCoords[currentField] = [lng, lat];
    try {
      const res = await fetch(`https://api.openrouteservice.org/geocode/reverse?api_key=${API_KEY}&point.lon=${lng}&point.lat=${lat}`);
      const data = await res.json();
      const label = data.features[0]?.properties?.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      document.getElementById(currentField).value = label;
      closeMap();
    } catch (err) {
      alert("Couldn't detect location. Please enter it manually.");
    }
  });
}

document.getElementById("quoteForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const fromInput = document.getElementById('from').value;
  const toInput = document.getElementById('to').value;
  const houseType = document.getElementById('house-type').value;
  const priceDisplay = document.getElementById('priceDisplay');
  const loader = document.getElementById('loader');
  const downloadBtn = document.getElementById('downloadPDF');
  const manualSection = document.getElementById('manualDistanceSection');

  loader.style.display = 'block';
  priceDisplay.style.display = 'none';
  downloadBtn.style.display = 'none';
  manualSection.style.display = 'none';

  try {
    let fromCoords = selectedCoords.from;
    let toCoords = selectedCoords.to;

    if (!fromCoords || !toCoords) {
      const [fromRes, toRes] = await Promise.all([
        fetch(`https://api.openrouteservice.org/geocode/search/structured?api_key=${API_KEY}&address=${encodeURIComponent(fromInput)}&country=Kenya`),
        fetch(`https://api.openrouteservice.org/geocode/search/structured?api_key=${API_KEY}&address=${encodeURIComponent(toInput)}&country=Kenya`)
      ]);

      const fromData = await fromRes.json();
      const toData = await toRes.json();

      if (!fromData.features.length || !toData.features.length) {
        throw new Error("Could not determine one or both locations.");
      }

      fromCoords = fromData.features[0].geometry.coordinates;
      toCoords = toData.features[0].geometry.coordinates;
    }

    const body = { coordinates: [fromCoords, toCoords] };

    const routeRes = await fetch('https://api.openrouteservice.org/v2/directions/driving-car/json', {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const routeData = await routeRes.json();
    const distanceMeters = routeData.routes[0].summary.distance;
    const distanceKm = Math.round(distanceMeters / 1000);

    showQuoteResult(distanceKm, houseType);

  } catch (err) {
    loader.style.display = 'none';
    manualSection.style.display = 'block';
    priceDisplay.innerHTML = "<strong>We couldn't determine the distance automatically. Please enter it manually.</strong>";
    priceDisplay.style.display = 'block';
    console.error(err);
  }
});

document.getElementById("manualCalcBtn").addEventListener("click", function () {
  const distanceKm = parseFloat(document.getElementById('manualDistanceInput').value);
  const houseType = document.getElementById('house-type').value;
  showQuoteResult(distanceKm, houseType);
});

function showQuoteResult(distanceKm, houseType) {
  const priceDisplay = document.getElementById('priceDisplay');
  const downloadBtn = document.getElementById('downloadPDF');
  const loader = document.getElementById('loader');

  
  
  loader.style.display = 'none';
  priceDisplay.style.display = 'block';
  priceDisplay.innerHTML = `Distance: ${distanceKm} km<br><strong>Estimated Cost:</strong> KSh ${price.toLocaleString()}`;
  downloadBtn.style.display = 'inline-block';

  downloadBtn.onclick = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(
      `FelTon Movers Quote\n\nName: ${document.getElementById('fullname').value}\nPhone: ${document.getElementById('phone').value}\nEmail: ${document.getElementById('email').value}\nFrom: ${document.getElementById('from').value}\nTo: ${document.getElementById('to').value}\nDistance: ${distanceKm} km\nHouse Type: ${houseType}\nEstimated Cost: KSh ${price.toLocaleString()}`.trim(),
      10, 10
    );
    doc.save("FelTon_Moving_Quote.pdf");
  };
}
