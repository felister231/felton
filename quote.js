function calculateQuote() {
  const fullname = document.getElementById("fullname").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const from = document.getElementById("from").value.trim();
  const to = document.getElementById("to").value.trim();
  const distance = parseFloat(document.getElementById("distance").value);
  const houseType = document.getElementById("house-type").value;

  if (!fullname || !phone || !email || !from || !to || !distance || !houseType) {
    alert("Please fill in all fields.");
    return;
  }

  let ratePerKm = {
    "Bedsitter": 300,
    "1 Bedroom": 500,
    "2 Bedroom": 700,
    "3 Bedroom": 1000,
    "More than 3 Bedrooms": 1200
  }[houseType] || 500;

  const price = Math.round(distance * ratePerKm);

  const display = document.getElementById("priceDisplay");
  display.style.display = "block";
  display.innerHTML = `
    <strong>Estimated Cost:</strong> KSh ${price.toLocaleString()}<br>
    <small>(${distance.toFixed(1)} km × KSh ${ratePerKm} per km)</small>
  `;
}
