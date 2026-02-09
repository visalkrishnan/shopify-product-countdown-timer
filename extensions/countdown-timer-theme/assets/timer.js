async function initTimer() {
  const container = document.querySelector('.product-countdown-timer-app');
  if (!container) return;

  const productId = container.dataset.productId;
  const shop = container.dataset.shop;
  // ✅ 1. Read Collection IDs
  const collectionIds = container.dataset.collectionIds || "";

  // ⚠️ PASTE YOUR CURRENT URL HERE ⚠️
  const appUrl = "https://hitachi-seventh-crystal-spreading.trycloudflare.com/api/countdown"; 

  try {
    // ✅ 2. Send Collection IDs to API
    const response = await fetch(`${appUrl}?shop=${shop}&productId=${productId}&collectionIds=${collectionIds}`);
    if (!response.ok) throw new Error("Network error");
    
    const data = await response.json();

    if (data.active) {
      handleTimerLogic(container, data);
    } else {
      container.style.display = 'none';
    }
  } catch (error) {
    console.error("Error loading countdown:", error);
    container.style.display = 'none';
  }
}

function handleTimerLogic(container, data) {
  let endTime;

  // ✅ 3. EVERGREEN LOGIC
  if (data.type === 'evergreen') {
    const storageKey = `timer_expiry_${data.description.replace(/\s/g, '')}`; // simple unique key based on desc
    const cachedExpiry = localStorage.getItem(storageKey);
    const now = new Date().getTime();

    if (cachedExpiry && parseInt(cachedExpiry) > now) {
      // User already has an active timer
      endTime = parseInt(cachedExpiry);
    } else {
      // Start new timer for this user (Duration is in minutes)
      const durationMs = (data.duration || 60) * 60 * 1000;
      endTime = now + durationMs;
      localStorage.setItem(storageKey, endTime);
    }
  } else {
    // FIXED LOGIC
    endTime = new Date(data.endDate).getTime();
  }

  renderTimer(container, { ...data, actualEndTime: endTime });
}

function renderTimer(container, data) {
  const { description, display, urgency, actualEndTime } = data;
  const originalColor = display.color || '#333';
  const urgencyColor = urgency.color || '#d32f2f';

  // Styles
  container.style.background = originalColor;
  container.style.color = '#fff';
  container.style.padding = display.size === 'large' ? '20px' : '10px';
  container.style.borderRadius = '8px';
  container.style.textAlign = 'center';
  container.style.margin = '15px 0';
  container.style.display = 'block';

  // Position
  const productForm = document.querySelector('form[action*="/cart/add"]');
  if (productForm) {
    if (display.position === 'top') productForm.prepend(container);
    if (display.position === 'bottom') productForm.append(container);
  }

  container.innerHTML = `
    <div style="font-weight:bold; margin-bottom:5px;">${description}</div>
    <div class="timer-clock" style="font-family: monospace; font-weight: 700; font-size: 1.5em;">Loading...</div>
    <div class="timer-urgency-msg" style="display:none; color: #fff; font-weight: bold; margin-top: 5px;">Hurry! Offer ends soon!</div>
  `;

  const clockEl = container.querySelector('.timer-clock');
  const urgencyEl = container.querySelector('.timer-urgency-msg');

  // Pulse Animation
  if (!document.getElementById('timer-styles')) {
    const style = document.createElement('style');
    style.id = 'timer-styles';
    style.innerHTML = `
      @keyframes pulse-custom {
        0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
      }
      .pulse-animation { animation: pulse-custom 2s infinite; border: 2px solid white !important; }
    `;
    document.head.appendChild(style);
  }

  const interval = setInterval(() => {
    const now = new Date().getTime();
    const distance = actualEndTime - now;

    if (distance < 0) {
      clearInterval(interval);
      container.style.display = 'none';
      // Optional: Clear storage for evergreen so it restarts next visit?
      // localStorage.removeItem(`timer_expiry_${data.description.replace(/\s/g, '')}`);
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    clockEl.innerHTML = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    if (urgency.type !== 'none') {
        const minutesLeft = Math.floor(distance / 60000);
        if (minutesLeft <= urgency.minutes) {
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