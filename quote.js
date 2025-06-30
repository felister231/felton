let autocompleteFrom, autocompleteTo;

function initAutocomplete() {
  autocompleteFrom = new google.maps.places.Autocomplete(document.getElementById("from"));
  autocompleteTo = new google.maps.places.Autocomplete(document.getElementById("to"));
}

function calculateQuote() {
  const origin = document.getElementById("from").value;
  const destination = document.getElementById("to").value;
  const houseType = document.getElementById("house-type").value;

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
    function(response, status) {
      if (status !== 'OK') {
        alert('Error getting distance: ' + status);
      } else {
        const distanceInKm = response.rows[0].elements[0].distance.value / 1000;
        const price = Math.round(distanceInKm * ratePerKm);
        const priceDisplay = document.getElementById("priceDisplay");
        priceDisplay.style.display = "block";
        priceDisplay.textContent = `Estimated Moving Cost: KSh ${price.toLocaleString()}`;
      }
    }
  );
}
