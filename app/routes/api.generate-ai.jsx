import { authenticate } from "../shopify.server";
import { z } from "zod"; // A popular library for schema validation

// --- 1. DEFINE THE AI RESPONSE SCHEMA (for validation) ---
const AiResponseSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().min(10).max(250),
  type: z.enum(["fixed", "evergreen"]),
  duration: z.number().int().positive().optional(), // Duration in minutes
});


export const action = async ({ request }) => {
  // --- 2. SECURITY ---
  // Authenticate the admin user and get an API client
  const { admin, session } = await authenticate.admin(request);
  const { prompt, productIds, collectionIds } = await request.json();

  // --- 3. FETCH CONTEXT FROM SHOPIFY ---
  let contextText = "";
  if (productIds && productIds.length > 0) {
    const response = await admin.graphql(
      `#graphql
      query getProductsByIds($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on Product {
            title
            descriptionHtml
            productType
          }
        }
      }`,
      { variables: { ids: productIds } }
    );
    const { nodes } = await response.json();
    contextText = "Products: " + nodes.map(p => `Title: ${p.title}, Type: ${p.productType}`).join('; ');
  }
  // (You could add a similar GraphQL query for collections if needed)

  // --- 4. PROMPT ENGINEERING ---
  const systemPrompt = `You are a Shopify marketing expert. Your task is to generate a countdown timer configuration based on user intent and product context. 
  You MUST return a single, valid JSON object and nothing else. 
  The JSON object must have these keys: "title" (string, max 50 chars), "description" (string, max 150 chars), "type" (string, must be 'fixed' or 'evergreen'), and "duration" (number, in minutes). 
  If the prompt suggests a specific timeframe (e.g., "24 hours"), set the duration in minutes. Otherwise, default to a reasonable duration (e.g., 60 mins for a flash sale).
  Do not invent discounts. Your tone should be exciting and create urgency.`;
  
  const userPrompt = `User Intent: "${prompt}". Product Context: "${contextText}"`;

  // --- 5. CALL AZURE OPENAI ---
  const {
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_API_BASE,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT
  } = process.env;

  // Construct the Azure-specific URL
  const azureUrl = `${AZURE_OPENAI_API_BASE}`;

  try {
    const response = await fetch(azureUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": AZURE_OPENAI_API_KEY,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Azure API Error: ${response.status} ${errorBody}`);
    }

    const data = await response.json();
    const aiContent = data.choices[0].message.content;

    console.log(aiContent)

    // --- 6. VALIDATE & SANITIZE ---
    // Try parsing the content first
    let aiJson;
    try {
        aiJson = JSON.parse(aiContent);
    } catch (e) {
        throw new Error("AI returned invalid JSON.");
    }

    // Now validate against our schema
    const validationResult = AiResponseSchema.safeParse(aiJson);
    if (!validationResult.success) {
        console.error("AI Schema Validation Failed:", validationResult.error);
        throw new Error("AI response did not match the required format.");
    }
    
    // If we get here, the data is valid and safe
    return Response.json({ success: true, ...validationResult.data });

  } catch (error) {
    console.error("AI Generation Error:", error.message);
    return Response.json({ success: false, error: "Failed to generate AI suggestions. Please try again." }, { status: 500 });
  }
};