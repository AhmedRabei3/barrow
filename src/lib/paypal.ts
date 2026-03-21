const PAYPAL_API_BASE =
  process.env.PAYPAL_API_BASE || "https://api-m.sandbox.paypal.com";

const getPaypalCredentials = () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing PayPal credentials");
  }

  return { clientId, clientSecret };
};

export const getPaypalAccessToken = async () => {
  const { clientId, clientSecret } = getPaypalCredentials();
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal token error: ${text}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
};

export const createPaypalOrder = async (params: {
  amount: number;
  currency?: string;
  description: string;
  customId: string;
  returnUrl: string;
  cancelUrl: string;
}) => {
  const token = await getPaypalAccessToken();
  const currency = params.currency || "USD";

  const response = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          custom_id: params.customId,
          description: params.description,
          amount: {
            currency_code: currency,
            value: params.amount.toFixed(2),
          },
        },
      ],
      application_context: {
        return_url: params.returnUrl,
        cancel_url: params.cancelUrl,
        user_action: "PAY_NOW",
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal create order error: ${text}`);
  }

  return (await response.json()) as {
    id: string;
    links: Array<{ href: string; rel: string; method: string }>;
  };
};

export const capturePaypalOrder = async (orderId: string) => {
  const token = await getPaypalAccessToken();

  const response = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${orderId}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal capture error: ${text}`);
  }

  return (await response.json()) as {
    status: string;
    id: string;
    purchase_units?: Array<{
      custom_id?: string;
      payments?: {
        captures?: Array<{
          id: string;
          status: string;
          amount: { value: string; currency_code: string };
        }>;
      };
    }>;
  };
};

export const createPaypalPayout = async (params: {
  amount: number;
  receiverEmail: string;
  note?: string;
  senderItemId?: string;
}) => {
  const token = await getPaypalAccessToken();
  const senderBatchId = `batch-${crypto.randomUUID()}`;

  const response = await fetch(`${PAYPAL_API_BASE}/v1/payments/payouts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender_batch_header: {
        sender_batch_id: senderBatchId,
        email_subject: "You have a payout",
      },
      items: [
        {
          recipient_type: "EMAIL",
          amount: {
            value: params.amount.toFixed(2),
            currency: "USD",
          },
          receiver: params.receiverEmail,
          note: params.note || "Payout from platform",
          sender_item_id: params.senderItemId || `item-${crypto.randomUUID()}`,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`PayPal payout error: ${text}`);
  }

  return (await response.json()) as {
    batch_header?: {
      payout_batch_id?: string;
      batch_status?: string;
    };
  };
};
