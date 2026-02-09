import { findBestTimerForProduct, incrementTimerViews } from "../models/timer.server";

export const loader = async ({ request }) => {
  const url = new URL(request.url);
  const shop = url.searchParams.get("shop");
  const productId = url.searchParams.get("productId");
  // ✅ Get Collection IDs (comma separated string -> array)
  const collectionIdsParam = url.searchParams.get("collectionIds");
  const collectionIds = collectionIdsParam ? collectionIdsParam.split(",") : [];

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

  // 🔥 NEW LOGIC: Pass collections to the finder
  const timer = await findBestTimerForProduct(shop, formattedProductId, collectionIds);

  if (!timer) {
    return Response.json({ active: false }, { headers });
  }

  // ✅ ANALYTICS: Track view (Fire and forget, don't await to keep response fast)
  incrementTimerViews(timer._id).catch(console.error);

  return Response.json({
    active: true,
    type: timer.type || "fixed", // 'fixed' or 'evergreen'
    duration: timer.duration,     // Minutes (for evergreen)
    endDate: timer.endDate,       // Date (for fixed)
    description: timer.description,
    display: timer.display,
    urgency: timer.urgency
  }, { headers });
};