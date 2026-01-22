import { getDb } from "../db.server";

export async function upsertStore({ shop, accessToken }) {
  const db = await getDb();
  await db.collection("stores").updateOne(
    { shop },
    {
      $set: {
        shop,
        accessToken,
        isActive: true,
        updatedAt: new Date(),
      },
    },
    { upsert: true }
  );
}

export async function deactivateStore(shop) {
  const db = await getDb();
  await db.collection("stores").updateOne(
    { shop },
    { $set: { isActive: false, updatedAt: new Date() } }
  );
}