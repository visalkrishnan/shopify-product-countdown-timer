import { useState } from "react";
import { useActionData, useLoaderData } from "react-router";
import { Page, Card, FormLayout, TextField, Button, Text, BlockStack, AppProvider as PolarisAppProvider } from "@shopify/polaris";
import enTranslations from "@shopify/polaris/locales/en.json";
import { login } from "../../shopify.server";
import { loginErrorMessage } from "./error.server";

export const loader = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export const action = async ({ request }) => {
  const errors = loginErrorMessage(await login(request));
  return { errors };
};

export default function Auth() {
  const loaderData = useLoaderData();
  const actionData = useActionData();
  const [shop, setShop] = useState("");
  const { errors } = actionData || loaderData;

  return (
    <PolarisAppProvider i18n={enTranslations}>
      <Page>
        <div style={{ maxWidth: "400px", margin: "0 auto", marginTop: "50px" }}>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Log in to Countdown Timer
              </Text>
              
              {/* ⚠️ CRITICAL CHANGE: Standard HTML form with target="_top" */}
              <form method="post" action="/auth/login" target="_top">
                <FormLayout>
                  <TextField
                    type="text"
                    name="shop"
                    label="Shop domain"
                    helpText="e.g. countdown-timer-basic.myshopify.com"
                    value={shop}
                    onChange={(value) => setShop(value)}
                    autoComplete="on"
                    error={errors.shop}
                  />
                  <Button submit variant="primary">
                    Log in
                  </Button>
                </FormLayout>
              </form>

            </BlockStack>
          </Card>
        </div>
      </Page>
    </PolarisAppProvider>
  );
}