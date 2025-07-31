// ========== FINAL JS: quote.js with Email, WhatsApp, Calendar ==========
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
  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }
}
function initMap() {
  if (mapInstance) {
    mapInstance.remove();
  }

  // ✅ Default to Nairobi city center
  let defaultCoords = [-1.286389, 36.817223];
  if (selectedCoords[currentField]) {
    defaultCoords = [selectedCoords[currentField][1], selectedCoords[currentField][0]];
  }

  mapInstance = L.map('map').setView(defaultCoords, 13);
  setTimeout(() => mapInstance.invalidateSize(), 100);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  L.Control.geocoder({
    defaultMarkGeocode: true,
    geocoder: L.Control.Geocoder.nominatim({
      geocodingQueryParams: { countrycodes: 'KE' }
    })
  }).addTo(mapInstance);

  const input = document.querySelector('.leaflet-control-geocoder-form input');
  if (input) {
    input.placeholder = "Search any location in Kenya";
    input.style.color = '#333';
  }

  locationPin = L.marker(defaultCoords, {
    draggable: true,
    autoPan: true,
    riseOnHover: true
  }).addTo(mapInstance);

  locationPin.bindPopup("Drag me to your exact location! Tap again to confirm.").openPopup();

  locationPin.on('dragend', async function () {
    const { lat, lng } = locationPin.getLatLng();
    selectedCoords[currentField] = [lng, lat];
    try {
      const res = await fetch(`https://api.openrouteservice.org/geocode/reverse?api_key=${API_KEY}&point.lon=${lng}&point.lat=${lat}`);
      const data = await res.json();
      const label = data.features[0]?.properties?.label || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      document.getElementById(currentField).value = label;
      locationPin.bindPopup("Location saved ✅").openPopup();
      setTimeout(() => closeMap(), 800);
    } catch (err) {
      alert("Couldn't detect location. Please enter it manually.");
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      closeMap();
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
    const distanceKm = Math.round(routeData.routes[0].summary.distance / 1000);
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

  let price = 0;
  if (houseType === 'Bedsitter') {
    if (distanceKm <= 10) price = 10000;
    else if (distanceKm <= 15) price = 15000;
    else if (distanceKm <= 20) price = 20000;
    else if (distanceKm <= 25) price = 25000;
    else if (distanceKm <= 30) price = 30000;
    else price = 35000;
  } else if (houseType === '1 Bedroom') {
    if (distanceKm <= 10) price = 15000;
    else if (distanceKm <= 15) price = 20000;
    else if (distanceKm <= 20) price = 25000;
    else if (distanceKm <= 25) price = 30000;
    else if (distanceKm <= 30) price = 35000;
    else price = 40000;
  } else if (houseType === '2 Bedroom') {
    if (distanceKm <= 10) price = 20000;
    else if (distanceKm <= 15) price = 25000;
    else if (distanceKm <= 20) price = 30000;
    else if (distanceKm <= 25) price = 35000;
    else if (distanceKm <= 30) price = 40000;
    else price = 45000;
  } else if (houseType === '3 Bedroom') {
    if (distanceKm <= 10) price = 25000;
    else if (distanceKm <= 15) price = 30000;
    else if (distanceKm <= 20) price = 35000;
    else if (distanceKm <= 25) price = 40000;
    else if (distanceKm <= 30) price = 45000;
    else price = 50000;
  } else {
    if (distanceKm <= 10) price = 30000;
    else if (distanceKm <= 15) price = 35000;
    else if (distanceKm <= 20) price = 40000;
    else if (distanceKm <= 25) price = 45000;
    else if (distanceKm <= 30) price = 50000;
    else price = 55000;
  }

  loader.style.display = 'none';
  priceDisplay.style.display = 'block';
  priceDisplay.innerHTML = `Distance: ${distanceKm} km<br><strong>Estimated Cost:</strong> KSh ${price.toLocaleString()}`;
  downloadBtn.style.display = 'inline-block';

  // WhatsApp quote sharing link
  const name = document.getElementById('fullname').value;
  const phone = document.getElementById('phone').value;
  const email = document.getElementById('email').value;
  const from = document.getElementById('from').value;
  const to = document.getElementById('to').value;
const rawMessage = `Hi FelTon,\nHere is my moving quote:\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nFrom: ${from}\nTo: ${to}\nDistance: ${distanceKm} km\nHouse Type: ${houseType}\nEstimated Cost: KSh ${price.toLocaleString()}\n\nPlease get in touch to confirm availability.`;
const whatsappURL = `https://wa.me/254111300121?text=${encodeURIComponent(rawMessage)}`;
const promptShare = confirm("Would you like to send this quote to FelTon via WhatsApp?");

if (promptShare) {
  window.open(whatsappURL, '_blank');
}

  if (!document.getElementById('whatsappBtn')) {
    const whatsappBtn = document.createElement('a');
    whatsappBtn.id = 'whatsappBtn';
    whatsappBtn.href = whatsappURL;
    whatsappBtn.target = '_blank';
    whatsappBtn.innerText = 'Share via WhatsApp';
    whatsappBtn.style.display = 'inline-block';
    whatsappBtn.style.marginTop = '10px';
    whatsappBtn.style.backgroundColor = '#25D366';
    whatsappBtn.style.color = 'white';
    whatsappBtn.style.padding = '10px 20px';
    whatsappBtn.style.borderRadius = '5px';
    whatsappBtn.style.textDecoration = 'none';
    priceDisplay.appendChild(whatsappBtn);
  }

  downloadBtn.onclick = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text(
      `FelTon Movers Quote\n\nName: ${name}\nPhone: ${phone}\nEmail: ${email}\nFrom: ${from}\nTo: ${to}\nDistance: ${distanceKm} km\nHouse Type: ${houseType}\nEstimated Cost: KSh ${price.toLocaleString()}`.trim(),
      10, 10
    );
    doc.save("FelTon_Moving_Quote.pdf");
  };

  // Booking calendar event link (Google Calendar)
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 1);
  const endDate = new Date(startDate);
  endDate.setHours(endDate.getHours() + 2);
  const format = d => d.toISOString().replace(/[-:]|\.\d{3}/g, '').slice(0, 15);

  const calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=FelTon%20Moving%20Booking&dates=${format(startDate)}/${format(endDate)}&details=${encodeURIComponent(`Name: ${name}\nPhone: ${phone}\nEmail: ${email}\nFrom: ${from}\nTo: ${to}\nHouse Type: ${houseType}\nQuote: KSh ${price.toLocaleString()}`)}`;

  if (!document.getElementById('calendarBtn')) {
    const calendarBtn = document.createElement('a');
    calendarBtn.id = 'calendarBtn';
    calendarBtn.href = calendarLink;
    calendarBtn.target = '_blank';
    calendarBtn.innerText = 'Add to Google Calendar';
    calendarBtn.style.display = 'inline-block';
    calendarBtn.style.marginTop = '10px';
    calendarBtn.style.marginLeft = '10px';
    calendarBtn.style.backgroundColor = '#4285F4';
    calendarBtn.style.color = 'white';
    calendarBtn.style.padding = '10px 20px';
    calendarBtn.style.borderRadius = '5px';
    calendarBtn.style.textDecoration = 'none';
    priceDisplay.appendChild(calendarBtn);
  }
} // ========== END JS ==========
