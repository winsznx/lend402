import { updateCallWebhookDelivered } from "@/lib/db";
import { isAllowedUrl } from "@/lib/ssrf";

interface CallSettledWebhookPayload {
  event: "call.settled";
  vaultId: string;
  txid: string;
  payer: string;
  amountUsdcx: number;
  timestamp: string;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function deliverCallSettledWebhook(params: {
  webhookUrl: string | null;
  callId: string;
  payload: CallSettledWebhookPayload;
}): Promise<void> {
  if (!params.webhookUrl) return;

  const ssrfCheck = isAllowedUrl(params.webhookUrl);
  if (!ssrfCheck.allowed) {
    console.error(
      `[webhook] blocked delivery to ${params.webhookUrl}: ${ssrfCheck.reason}`
    );
    await updateCallWebhookDelivered(params.callId, false);
    return;
  }

  const attemptDelivery = async (): Promise<boolean> => {
    const response = await fetch(params.webhookUrl!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params.payload),
      signal: AbortSignal.timeout(10_000),
    });

    return response.ok;
  };

  let delivered = false;

  try {
    delivered = await attemptDelivery();
    if (!delivered) {
      await sleep(2_000);
      delivered = await attemptDelivery();
    }
  } catch (error) {
    console.error("[webhook] delivery failed:", (error as Error).message);
  }

  await updateCallWebhookDelivered(params.callId, delivered);
}
