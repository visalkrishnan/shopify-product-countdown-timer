import { ObjectId } from "mongodb";
import { getDb } from "../db.server";

// Fetch all timers for the dashboard list
export async function getTimers(shop) {
  const db = await getDb();
  return await db.collection("timers").find({ shop }).sort({ createdAt: -1 }).toArray();
}

// Create or Update
export async function upsertTimer(data) {
  const db = await getDb();
  const { _id, shop, ...fields } = data;

  if (_id) {
    // Update existing
    return await db.collection("timers").updateOne(
      { _id: new ObjectId(_id), shop },
      { $set: { ...fields, updatedAt: new Date() } }
    );
  } else {
    // Create new
    return await db.collection("timers").insertOne({
      shop,
      ...fields,
      createdAt: new Date(),
    });
  }
}

export async function deleteTimer(id, shop) {
  const db = await getDb();
  await db.collection("timers").deleteOne({ _id: new ObjectId(id), shop });
}

// 🔥 CORE LOGIC: Find the single best timer based on rules
export async function findBestTimerForProduct(shop, productId) {
  const db = await getDb();
  const now = new Date().toISOString();

  // 1. Fetch ALL active timers that match this shop AND (Product ID OR "ALL")
  // We check where startDate <= now <= endDate
  const candidates = await db.collection("timers").find({
    shop,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { targetType: "all" },
      { productIds: productId } // changing from single ID to array check
    ]
  }).toArray();

  if (candidates.length === 0) return null;

  // 2. Apply Rule 2: Priority Order
  // Priority: Active (already filtered) -> Closest Ending -> Most Recent
  
  candidates.sort((a, b) => {
    // Sort by End Date (Ascending) - Closest ending first
    const timeA = new Date(a.endDate).getTime();
    const timeB = new Date(b.endDate).getTime();
    if (timeA !== timeB) return timeA - timeB;

    // Fallback: Created At (Descending) - Newest first
    const createdA = new Date(a.createdAt).getTime();
    const createdB = new Date(b.createdAt).getTime();
    return createdB - createdA;
  });

  // Return the winner
  return candidates[0];
}