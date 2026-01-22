# Product Countdown Timer ⏳

A feature-rich Shopify App that allows merchants to create, schedule, and display countdown timers on product pages to drive urgency and increase conversions.

This project was built as a sample implementation using the **MERN Stack** (MongoDB, Express/Node, React) and **Shopify CLI 3.0**.

## 🚀 Key Features

*   **Single-Page Dashboard**: A unified interface to Search, Create, Edit, and Delete timers using a seamless modal experience.
*   **Smart Priority Logic**: Automatically enforces the "One Timer Per Product" rule using industry-standard priority:
    1.  Active Timer (Running now)
    2.  Closest Ending Time (Highest Urgency)
    3.  Most Recently Created
*   **Targeting Options**: Apply timers to specific products OR all products globally.
*   **Visual Customization**: Merchants can customize the timer's Position (Top/Bottom), Size, and Color.
*   **Urgency Mode 🚨**: Automatically changes the timer background color (e.g., to Red) and triggers a pulse animation when the timer hits a specific limit (e.g., last 5 minutes).
*   **Theme App Extension**: Zero-code installation for merchants using Shopify's modern App Blocks.

## 🛠 Tech Stack

*   **Frontend**: React, Shopify Polaris (UI Library), Shopify App Bridge
*   **Backend**: Node.js, Remix (Shopify's recommended framework)
*   **Database**: MongoDB (via native driver)
*   **Storefront Widget**: Vanilla JavaScript (Optimized for performance)

> **Note on Technical Choices:**
> While the initial spec suggested Preact for the widget, I opted for **Vanilla JavaScript**. This eliminates the need to load an external library on the merchant's storefront, significantly reducing bundle size and ensuring zero impact on the store's Core Web Vitals (Lighthouse score).

## 📂 Project Structure

Here is a breakdown of the key files and their responsibilities:

```text
product-countdown-timer/
├── app/
│   ├── routes/
│   │   ├── app._index.jsx        # 🏠 Main Dashboard. Handles List, Search, and Create/Edit Modal.
│   │   ├── app.jsx               # App Layout & Navigation wrapper (Polaris Provider).
│   │   ├── api.countdown.jsx     # 🔌 Public API endpoint. Delivers JSON logic to the storefront.
│   │   └── auth.login/           # Custom Login page styling.
│   │
│   ├── models/
│   │   ├── timer.server.js       # 🧠 Core Business Logic. Handles CRUD & Priority Sorting rules.
│   │   └── store.server.js       # Handles Shop installation & session data.
│   │
│   ├── components/
│   │   └── Link.jsx              # Helper to fix navigation within Shopify Admin.
│   │
│   ├── db.server.js              # MongoDB Connection handler.
│   └── shopify.server.js         # Shopify Auth & Session storage configuration.
│
├── extensions/
│   └── countdown-timer-theme/    # 🎨 Theme App Extension
│       ├── assets/
│       │   └── timer.js          # Client-side Widget logic (Fetch data, render UI, handle Urgency).
│       ├── blocks/
│       │   └── timer.liquid      # The HTML entry point for the Theme Editor.
│       └── shopify.extension.toml
