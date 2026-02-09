import { ObjectId } from "mongodb";
import { getDb } from "../db.server";

export async function getTimers(shop) {
  const db = await getDb();
  return await db.collection("timers").find({ shop }).sort({ createdAt: -1 }).toArray();
}

// Create or Update
export async function upsertTimer(data) {
  const db = await getDb();
  const { _id, shop, ...fields } = data;

  if (_id && typeof _id === 'string' && _id.length === 24) {
    return await db.collection("timers").updateOne(
      { _id: new ObjectId(_id), shop },
      { $set: { ...fields, updatedAt: new Date() } }
    );
  } else {
    // Create new
    return await db.collection("timers").insertOne({
      shop,
      ...fields,
      views: 0, // ✅ Initialize Analytics
      createdAt: new Date(),
    });
  }
}

export async function deleteTimer(id, shop) {
  const db = await getDb();
  await db.collection("timers").deleteOne({ _id: new ObjectId(id), shop });
}

export async function incrementTimerViews(id) {
  const db = await getDb();
  await db.collection("timers").updateOne(
    { _id: new ObjectId(id) },
    { $inc: { views: 1 } }
  );
}

export async function findBestTimerForProduct(shop, productId, collectionIds = []) {
  const db = await getDb();
  const now = new Date().toISOString();

  // 1. Fetch candidates
  const candidates = await db.collection("timers").find({
    shop,
    startDate: { $lte: now },
    endDate: { $gte: now },
    $or: [
      { targetType: "all" },
      { productIds: productId },
      { collectionIds: { $in: collectionIds } } // ✅ Check if any product collection matches
    ]
  }).toArray();

  if (candidates.length === 0) return null;

  // 2. Priority Order: 

  
  candidates.sort((a, b) => {
    // Priority 1: Specificity (Targeting 'all' is lowest priority)
    const aScore = a.targetType === 'all' ? 0 : 1;
    const bScore = b.targetType === 'all' ? 0 : 1;
    if (aScore !== bScore) return bScore - aScore; // Higher score first

    // Priority 2: Closest Ending (Urgency) - Only relevant for Fixed timers
    const timeA = new Date(a.endDate).getTime();
    const timeB = new Date(b.endDate).getTime();
    if (timeA !== timeB) return timeA - timeB;

    // Priority 3: Most Recent
    const createdA = new Date(a.createdAt).getTime();
    const createdB = new Date(b.createdAt).getTime();
    return createdB - createdA;
  });

  return candidates[0];
}