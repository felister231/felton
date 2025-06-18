document.getElementById("quoteForm").addEventListener("submit", function (e) {
    e.preventDefault();
  
    const houseType = document.getElementById("houseType").value;
    const distance = parseFloat(document.getElementById("distance").value);
    const packing = document.getElementById("packing").checked;
    const cleaning = document.getElementById("cleaning").checked;
  
    let basePrice = 0;
  
    switch (houseType) {
      case "bedsitter": basePrice = 1000; break;
      case "1br": basePrice = 2000; break;
      case "2br": basePrice = 3000; break;
      case "mansion": basePrice = 5000; break;
      default: basePrice = 0;
    }
  
    const distanceCharge = distance * 50;
    const packingCharge = packing ? 500 : 0;
    const cleaningCharge = cleaning ? 700 : 0;
  
    const total = basePrice + distanceCharge + packingCharge + cleaningCharge;
  
    document.getElementById("quoteResult").innerText = `Estimated Cost: KES ${total.toLocaleString()}`;
  });
  document.getElementById("quoteForm").addEventListener("submit", function (e) {
    e.preventDefault();
  
    const houseType = document.getElementById("houseType").value;
    const distance = parseFloat(document.getElementById("distance").value);
    const packing = document.getElementById("packing").checked;
    const cleaning = document.getElementById("cleaning").checked;
  
    let basePrice = 0;
  
    switch (houseType) {
      case "bedsitter": basePrice = 1000; break;
      case "1br": basePrice = 2000; break;
      case "2br": basePrice = 3000; break;
      case "mansion": basePrice = 5000; break;
      default: basePrice = 0;
    }
  
    const distanceCharge = distance * 50;
    const packingCharge = packing ? 500 : 0;
    const cleaningCharge = cleaning ? 700 : 0;
    const total = basePrice + distanceCharge + packingCharge + cleaningCharge;
  
    const quoteMessage = `Hello FelTon Movers,%0AI'm requesting a quote for:%0A- House: ${houseType.toUpperCase()}%0A- Distance: ${distance} km%0A- Packing: ${packing ? "Yes" : "No"}%0A- Cleaning: ${cleaning ? "Yes" : "No"}%0A- Estimated Cost: KES ${total.toLocaleString()}%0AThank you!`;
  
    const phone = "254712345678"; // Replace with your real number
  
    const whatsappLink = `https://wa.me/${phone}?text=${quoteMessage}`;
  
    document.getElementById("quoteResult").innerHTML = `
      <p>Estimated Cost: <strong>KES ${total.toLocaleString()}</strong></p>
      <a href="${whatsappLink}" target="_blank" class="whatsapp-btn">Send via WhatsApp 📲</a>
    `;
  });
  
  