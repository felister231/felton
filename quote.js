function initAutocomplete() {
  const inputFrom = document.getElementById("from");
  const inputTo = document.getElementById("to");

  if (inputFrom && inputTo) {
    new google.maps.places.Autocomplete(inputFrom);
    new google.maps.places.Autocomplete(inputTo);
    console.log("✅ Autocomplete initialized");
  } else {
    console.error("❌ Could not find location inputs");
  }
}

function calculateQuote() {
  const origin = document.getElementById("from").value;
  const destination = document.getElementById("to").value;
  const houseType = document.getElementById("house-type").value;

  console.log("🚛 Quote button clicked");

  if (!origin || !destination || !houseType) {
    alert("Please fill in all fields before calculating.");
    return;
  }

  let ratePerKm;
  switch (houseType) {
    case "Bedsitter":
      ratePerKm = 300;
      break;
    case "1 Bedroom":
      ratePerKm = 500;
      break;
    case "2 Bedroom":
      ratePerKm = 700;
      break;
    case "3 Bedroom":
      ratePerKm = 1000;
      break;
    case "More than 3 Bedrooms":
      ratePerKm = 1200;
      break;
    default:
      ratePerKm = 500;
  }

  const service = new google.maps.DistanceMatrixService();
  service.getDistanceMatrix(
    {
      origins: [origin],
      destinations: [destination],
      travelMode: 'DRIVING',
      unitSystem: google.maps.UnitSystem.METRIC,
    },
    function (response, status) {
      console.log("📦 DistanceMatrix status:", status);
      console.log("📦 DistanceMatrix response:", response);

      if (status !== 'OK') {
        alert('Error getting distance: ' + status);
      } else {
        const distanceElement = response.rows[0].elements[0];

        if (distanceElement.status === "OK") {
          const distanceInKm = distanceElement.distance.value / 1000;
          const price = Math.round(distanceInKm * ratePerKm);

          const priceDisplay = document.getElementById("priceDisplay");
          priceDisplay.style.display = "block";
          priceDisplay.textContent = `Estimated Moving Cost: KSh ${price.toLocaleString()}`;
        } else {
          alert("Distance not available. Please choose both locations from the suggested list.");
        }
      }
    }
  );
}
