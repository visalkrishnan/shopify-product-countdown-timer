# Product Countdown Timer + AI & Analytics ⏳

A full-stack Shopify App built with the **MERN Stack** (MongoDB, Express/Node, React) and **Shopify CLI 3.0**. This app helps merchants drive urgency with smart countdown timers, utilizing AI for configuration and providing real-time analytics.

## 🚀 Key Features

*   **Dual Timer Modes**:
    *   **Fixed Date**: Global countdowns for specific sales events (e.g., Black Friday).
    *   **Evergreen**: Personalized timers that reset for *each visitor* (e.g., "Offer expires in 30 minutes").
*   **Advanced Targeting**: Apply timers to **Specific Collections**, **Specific Products**, or **All Products** globally.
*   **🤖 AI-Powered Assistant**: Integrated with **Azure OpenAI** to generate high-converting titles and settings based on product context and merchant intent.
*   **📊 Analytics**: Tracks and displays **Impression Counts** (Views) for every timer directly in the dashboard.
*   **Smart Priority Logic**: Automatically enforces the "One Timer Per Product" rule:
    1.  Specific Targeting > Global Targeting
    2.  Closest Ending Time > Most Recent
*   **Urgency Mode 🚨**: Automatically changes the widget color (e.g., to Red) and triggers a **Pulse Animation** when time is running low.
*   **Theme App Extension**: Zero-code installation for merchants via Shopify's Theme Editor.

## 🛠 Tech Stack

*   **Frontend**: React, Shopify Polaris, Shopify App Bridge
*   **Backend**: Node.js, Remix (Shopify's recommended framework)
*   **Database**: MongoDB (via native driver)
*   **AI/Validation**: Azure OpenAI, Zod (Schema Validation)
*   **Storefront Widget**: Vanilla JavaScript (Zero-dependency, optimized for <15KB bundle size)

> **Note on Architecture:**
> The storefront widget uses highly optimized Vanilla JavaScript instead of a framework like Preact. This ensures minimal impact on the merchant's Core Web Vitals while still handling complex logic like Evergreen local storage and DOM manipulation.

## 📂 Project Structure

```text
product-countdown-timer/
├── app/
│   ├── routes/
│   │   ├── app._index.jsx        # 🏠 Main Dashboard (SPA). Handles List, Create, Edit, AI Modal.
│   │   ├── app.jsx               # App Layout & Navigation.
│   │   ├── api.countdown.jsx     # 🔌 Public API. Serves timer logic to storefront & tracks views.
│   │   ├── api.generate-ai.jsx   # 🧠 Secure Backend Endpoint for AI Generation.
│   │   └── auth.login/           # Custom Login page.
│   │
│   ├── models/
│   │   ├── timer.server.js       # ⚙️ Core Logic: CRUD, Priority Sorting, Analytics increments.
│   │   └── store.server.js       # Shop installation handling.
│
├── extensions/
│   └── countdown-timer-theme/    # 🎨 Theme App Extension
│       ├── assets/
│       │   └── timer.js          # Widget Logic: Fetch API, Handle Evergreen Storage, Render UI.
│       ├── blocks/
│       │   └── timer.liquid      # Injects Product & Collection context into the DOM.
│       └── shopify.extension.toml
