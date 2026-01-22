async function initTimer() {
  const container = document.querySelector('.product-countdown-timer-app');
  if (!container) return;

  const productId = container.dataset.productId;
  const shop = container.dataset.shop;

  // ⚠️ PASTE YOUR CURRENT URL HERE ⚠️
  const appUrl = "https://milk-aerial-schema-womens.trycloudflare.com/api/countdown"; 

  try {
    const response = await fetch(`${appUrl}?shop=${shop}&productId=${productId}`);
    if (!response.ok) throw new Error("Network response was not ok");
    
    const data = await response.json();

    if (data.active) {
      renderTimer(container, data);
    } else {
      container.style.display = 'none';
      container.innerHTML = '';
    }
  } catch (error) {
    console.error("Error loading countdown:", error);
    container.style.display = 'none';
    container.innerHTML = '';
  }
}

function renderTimer(container, data) {
  const { endDate, description, display, urgency } = data;
  
  // Store original color so we know what it was before urgency
  const originalColor = display.color || '#333';
  // ✅ Get the custom urgency color (default to red if missing)
  const urgencyColor = urgency.color || '#d32f2f';

  // Apply Initial Styles
  container.style.background = originalColor;
  container.style.color = '#fff'; 
  
  // Size
  let fontSize = '16px'; let padding = '15px';
  if (display.size === 'small') { fontSize = '12px'; padding = '8px'; }
  if (display.size === 'large') { fontSize = '20px'; padding = '20px'; }
  
  container.style.fontSize = fontSize;
  container.style.padding = padding;
  container.style.borderRadius = '8px';
  container.style.textAlign = 'center';
  container.style.margin = '15px 0';
  container.style.transition = 'background 0.5s ease'; 
  container.style.display = 'block'; 
  
  // Position
  const productForm = document.querySelector('form[action*="/cart/add"]');
  if (productForm) {
      if (display.position === 'top') productForm.prepend(container);
      if (display.position === 'bottom') productForm.append(container);
  }

  // HTML
  container.innerHTML = `
    <div style="font-weight:bold; margin-bottom:5px;">${description}</div>
    <div class="timer-clock" style="font-family: monospace; font-weight: 700; font-size: 1.5em;">...</div>
    <div class="timer-urgency-msg" style="display:none; color: #fff; font-weight: bold; margin-top: 5px;">Hurry! Offer ends soon!</div>
  `;

  const clockEl = container.querySelector('.timer-clock');
  const urgencyEl = container.querySelector('.timer-urgency-msg');
  const end = new Date(endDate).getTime();

  // Animation Styles (Dynamic Color)
  if (!document.getElementById('timer-styles')) {
      const style = document.createElement('style');
      style.id = 'timer-styles';
      style.innerHTML = `
        @keyframes pulse-custom {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }
        .pulse-animation {
          animation: pulse-custom 2s infinite;
          border: 2px solid white !important;
        }
      `;
      document.head.appendChild(style);
  }

  // Timer Interval
  const interval = setInterval(() => {
    const now = new Date().getTime();
    const distance = end - now;

    if (distance < 0) {
      clearInterval(interval);
      container.style.display = 'none';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    clockEl.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    // 🔥 URGENCY LOGIC 🔥
    if (urgency.type !== 'none') {
        const minutesLeft = Math.floor(distance / 60000);
        
        if (minutesLeft <= urgency.minutes) {
            // ✅ Change Background to Selected Urgency Color
            container.style.background = urgencyColor; 
            
            if (urgency.type === 'pulse') container.classList.add('pulse-animation');
            if (urgency.type === 'banner') urgencyEl.style.display = 'block';
        } else {
            container.style.background = originalColor;
            container.classList.remove('pulse-animation');
            urgencyEl.style.display = 'none';
        }
    }
  }, 1000);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTimer);
} else {
  initTimer();
}