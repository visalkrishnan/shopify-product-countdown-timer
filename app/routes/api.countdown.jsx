import { findBestTimerForProduct } from "../models/timer.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("productId");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Content-Type": "application/json",
  };

  if (!shop || !productId) {
    return Response.json({ error: "Missing parameters" }, { status: 400, headers });
  }

  // Ensure GID format
  const formattedProductId = productId.includes("gid://") 
    ? productId 
    : `gid://shopify/Product/${productId}`;

  // 🔥 NEW LOGIC: Get the ONE best timer
  const timer = await findBestTimerForProduct(shop, formattedProductId);

  if (!timer) {
    return Response.json({ active: false }, { headers });
  }

  return Response.json({
    active: true,
    endDate: timer.endDate,
    description: timer.description,
    display: timer.display, // Includes position, size, color
    urgency: timer.urgency
  }, { headers });
};