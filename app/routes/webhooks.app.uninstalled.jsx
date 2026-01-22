import { deactivateStore } from "../models/store.server";

export const action = async ({ request }) => {
  const payload = await request.json();
  const shop = payload.myshopify_domain;

  await deactivateStore(shop);

  return new Response(null, { status: 200 });
};
