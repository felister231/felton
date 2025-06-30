function initAutocomplete() {
  const inputFrom = document.getElementById("from");
  const inputTo = document.getElementById("to");

  if (inputFrom && inputTo) {
    new google.maps.places.Autocomplete(inputFrom);
    new google.maps.places.Autocomplete(inputTo);
    console.log("✅ Autocomplete initialized");
  } else {
    console.error("❌ Inputs not found");
  }
}

function calculateQuote() {
  const origin = document.getElementById("from").value;
  const destination = document.getElementById("to").value;
  const houseType = document.getElementById("house-type").value;

  if (!origin || !destination || !houseType) {
    alert("Please fill all fields.");
    return;
  }

  let ratePerKm;
  switch (houseType) {
    case "Bedsitter": ratePerKm = 300; break;
    case "1 Bedroom": ratePerKm = 500; break;
    case "2 Bedroom": ratePerKm = 700; break;
    case "3 Bedroom": ratePerKm = 1000; break;
    case "More than 3 Bedrooms": ratePerKm = 1200; break;
    default: ratePerKm = 500;
  }

  const service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix({
    origins: [origin],
    destinations: [destination],
    travelMode: google.maps.TravelMode.DRIVING,
    unitSystem: google.maps.UnitSystem.METRIC,
  }, function (response, status) {
    console.log("DistanceMatrix status:", status);
    if (status === "OK") {
      const result = response.rows[0].elements[0];
      if (result.status === "OK") {
        const distanceKm = result.distance.value / 1000;
        const price = Math.round(distanceKm * ratePerKm);
        const display = document.getElementById("priceDisplay");
        display.style.display = "block";
        display.textContent = `Estimated Cost: KSh ${price.toLocaleString()}`;
      } else {
        alert("Could not calculate distance. Please use suggested locations.");
      }
    } else {
      alert("Error getting distance.");
    }
  });
}
