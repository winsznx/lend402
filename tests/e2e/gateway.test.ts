/**
 * Lend402 Gateway — x402 V2 End-to-End Tests
 *
 * Phase 1 (Challenge): Always runs. Hits the live gateway, verifies the 402
 * response matches the x402 V2 spec exactly. Proves mainnet liveness and
 * protocol conformance without requiring a funded agent wallet.
 *
 * Phase 2 (Payment): Runs only when LEND402_AGENT_PRIVATE_KEY and
 * E2E_VAULT_URL are set. Constructs a real borrow-and-pay transaction,
 * submits it via payment-signature, and asserts a 200 response with a
 * payment-response header containing a confirmed Stacks txid.
 *
 * Usage:
 *   # Challenge only (safe for CI):
 *   E2E_VAULT_URL=https://gateway.lend402.xyz/v/<vault_id> npx vitest run tests/e2e
 *
 *   # Full payment flow (requires deployed contract + funded agent):
 *   E2E_VAULT_URL=... LEND402_AGENT_PRIVATE_KEY=... LEND402_AGENT_ADDRESS=... \
 *     LEND402_VAULT_CONTRACT_ID=... npx vitest run tests/e2e
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  decodePaymentRequired,
  decodePaymentResponse,
  X402_HEADERS,
} from "x402-stacks";
import type {
  PaymentRequiredV2,
  PaymentRequirementsV2,
  ResourceInfo,
} from "x402-stacks";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const VAULT_URL = process.env.E2E_VAULT_URL ?? "";
const HAS_VAULT_URL = Boolean(VAULT_URL);

const HAS_PAYMENT_CREDS = Boolean(
  process.env.LEND402_AGENT_PRIVATE_KEY &&
    process.env.LEND402_AGENT_ADDRESS &&
    process.env.LEND402_VAULT_CONTRACT_ID
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function decodeBase64<T>(encoded: string): T {
  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8")) as T;
}

function isResourceInfo(obj: unknown): obj is ResourceInfo {
  return (
    typeof obj === "object" &&
    obj !== null &&
    typeof (obj as ResourceInfo).url === "string" &&
    (obj as ResourceInfo).url.length > 0
  );
}

function isPaymentRequirements(obj: unknown): obj is PaymentRequirementsV2 {
  if (typeof obj !== "object" || obj === null) return false;
  const req = obj as Partial<PaymentRequirementsV2>;
  return (
    typeof req.scheme === "string" &&
    typeof req.network === "string" &&
    typeof req.amount === "string" &&
    typeof req.asset === "string" &&
    typeof req.payTo === "string" &&
    typeof req.maxTimeoutSeconds === "number"
  );
}

// ---------------------------------------------------------------------------
// Phase 1: Challenge
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_VAULT_URL)(
  "Phase 1 — Gateway Challenge (x402 V2 conformance)",
  () => {
    let response: Response;
    let body: PaymentRequiredV2;
    let paymentRequiredHeader: string | null;

    beforeAll(async () => {
      try {
        response = await fetch(VAULT_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(10_000),
        });
        body = (await response.json()) as PaymentRequiredV2;
        paymentRequiredHeader = response.headers.get(X402_HEADERS.PAYMENT_REQUIRED);
      } catch (err) {
        throw new Error(
          `Gateway unreachable at ${VAULT_URL}: ${(err as Error).message}. ` +
            "Ensure the gateway is deployed and E2E_VAULT_URL points to a live vault."
        );
      }
    });

    it("responds with HTTP 402", () => {
      expect(response.status).toBe(402);
    });

    it(`sets ${X402_HEADERS.PAYMENT_REQUIRED} response header`, () => {
      expect(paymentRequiredHeader).not.toBeNull();
      expect(typeof paymentRequiredHeader).toBe("string");
      expect(paymentRequiredHeader!.length).toBeGreaterThan(0);
    });

    it("payment-required header is valid base64 JSON matching body", () => {
      const decoded = decodePaymentRequired(paymentRequiredHeader!) as PaymentRequiredV2;
      expect(decoded).not.toBeNull();
      expect(decoded.x402Version).toBe(2);
      expect(decoded.accepts).toEqual(body.accepts);
    });

    it("body.x402Version === 2", () => {
      expect(body.x402Version).toBe(2);
    });

    it("body.resource is a ResourceInfo object (not an inline string)", () => {
      expect(isResourceInfo(body.resource)).toBe(true);
      expect(typeof body.resource).toBe("object");
    });

    it("body.resource.url is a valid URL", () => {
      expect(() => new URL((body.resource as ResourceInfo).url)).not.toThrow();
    });

    it("body.accepts is a non-empty array", () => {
      expect(Array.isArray(body.accepts)).toBe(true);
      expect(body.accepts.length).toBeGreaterThan(0);
    });

    it("accepts[0] has all six required x402 V2 fields", () => {
      const option = body.accepts[0];
      expect(isPaymentRequirements(option)).toBe(true);
    });

    it("accepts[0].scheme === 'exact'", () => {
      expect(body.accepts[0].scheme).toBe("exact");
    });

    it("accepts[0].network matches Stacks CAIP-2 format (stacks:<id>)", () => {
      expect(body.accepts[0].network).toMatch(/^stacks:/);
    });

    it("accepts[0].network is mainnet or testnet CAIP-2 id", () => {
      expect(["stacks:1", "stacks:2147483648"]).toContain(body.accepts[0].network);
    });

    it("accepts[0].amount is a non-empty numeric string (micro-USDCx)", () => {
      expect(typeof body.accepts[0].amount).toBe("string");
      expect(body.accepts[0].amount).toMatch(/^\d+$/);
      expect(Number(body.accepts[0].amount)).toBeGreaterThan(0);
    });

    it("accepts[0].asset is a Stacks contract identifier", () => {
      // format: SP<address>.<contract-name>
      expect(body.accepts[0].asset).toMatch(/^S[PTM][A-Z0-9]+\.[a-z0-9-]+$/i);
    });

    it("accepts[0].payTo is a Stacks principal", () => {
      expect(body.accepts[0].payTo).toMatch(/^S[PTM][A-Z0-9]+$/i);
    });

    it("accepts[0].maxTimeoutSeconds is a positive integer", () => {
      expect(typeof body.accepts[0].maxTimeoutSeconds).toBe("number");
      expect(body.accepts[0].maxTimeoutSeconds).toBeGreaterThan(0);
      expect(Number.isInteger(body.accepts[0].maxTimeoutSeconds)).toBe(true);
    });

    it("response includes CORS headers", () => {
      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    });

    it("response exposes payment-required in Access-Control-Expose-Headers", () => {
      const expose = response.headers.get("access-control-expose-headers") ?? "";
      expect(expose.toLowerCase()).toContain(X402_HEADERS.PAYMENT_REQUIRED);
    });
  }
);

// ---------------------------------------------------------------------------
// Phase 2: Full payment flow
// ---------------------------------------------------------------------------

describe.skipIf(!HAS_VAULT_URL || !HAS_PAYMENT_CREDS)(
  "Phase 2 — Full Payment Flow (mainnet settlement)",
  () => {
    /**
     * This phase requires:
     *  - A deployed lend402-vault.clar contract at LEND402_VAULT_CONTRACT_ID
     *  - An agent wallet with sBTC balance (LEND402_AGENT_PRIVATE_KEY)
     *  - LP liquidity in the vault
     *
     * The test constructs a real borrow-and-pay Stacks transaction, submits it
     * via the payment-signature header, and asserts that:
     *  - The gateway responds 200
     *  - The payment-response header is present and parseable
     *  - The receipt contains a valid txid and blockHeight
     */

    let paymentResponse: Response;
    let paymentRequiredBody: PaymentRequiredV2;

    beforeAll(async () => {
      // Step 1: Get the 402 challenge to extract payment requirements
      const challengeRes = await fetch(VAULT_URL, {
        method: "GET",
        headers: { Accept: "application/json" },
      });
      expect(challengeRes.status).toBe(402);
      paymentRequiredBody = (await challengeRes.json()) as PaymentRequiredV2;
    });

    it("can parse and select a matching payment option", () => {
      const option = paymentRequiredBody.accepts.find(
        (o) => o.scheme === "exact" && o.network.startsWith("stacks:")
      );
      expect(option).toBeDefined();
    });

    it(
      "receives 200 with payment-response header after submitting signed payment",
      async () => {
        /**
         * Dynamically import the agent SDK to avoid loading Stacks.js in tests
         * that run without credentials (the import itself is safe; the test
         * body is only reached when HAS_PAYMENT_CREDS is true).
         */
        const {
          makeContractCall,
          uintCV,
          principalCV,
          AnchorMode,
          PostConditionMode,
          FungibleConditionCode,
          createAssetInfo,
          makeStandardFungiblePostCondition,
          makeContractFungiblePostCondition,
          serializeTransaction,
        } = await import("@stacks/transactions");
        const { StacksMainnet } = await import("@stacks/network");
        const { encodePaymentPayload } = await import("x402-stacks");

        const privateKey = process.env.LEND402_AGENT_PRIVATE_KEY!;
        const agentAddress = process.env.LEND402_AGENT_ADDRESS!;
        const vaultContractId = process.env.LEND402_VAULT_CONTRACT_ID!;
        const [vaultAddress, vaultName] = vaultContractId.split(".");

        const option = paymentRequiredBody.accepts.find(
          (o) => o.scheme === "exact" && o.network === "stacks:1"
        )!;

        const amountUsdcx = BigInt(option.amount);

        // Derive required collateral using same math as the contract:
        //   min_sbtc = borrow_usdcx * 1.50 * usdcx_price * 100 / sbtc_price
        // Use a conservative sBTC price of $50,000 for the test collateral calc.
        // The simulate-borrow read-only call would give the exact value in prod;
        // here we over-collateralise by 2x to ensure the ratio check passes.
        const SBTC_PRICE_USD8 = 5_000_000_000_000n; // $50,000 with 8 decimals
        const USDCX_PRICE_USD8 = 100_000_000n;
        const COLLATERAL_RATIO_BPS = 15_000n;
        const minSbtc =
          (amountUsdcx * COLLATERAL_RATIO_BPS * USDCX_PRICE_USD8 * 100n) /
          (10_000n * SBTC_PRICE_USD8);
        // 2× buffer to absorb oracle price movement between sim and broadcast
        const collateralSbtc = minSbtc * 2n;
        const protocolFeeBps = 30n;
        const protocolFee = (amountUsdcx * protocolFeeBps) / 10_000n;
        const netPayment = amountUsdcx - protocolFee;

        const sbtcAsset = createAssetInfo(
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4",
          "sbtc-token",
          "sbtc"
        );
        const usdcxAsset = createAssetInfo(
          "SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE",
          "usdcx",
          "usdc"
        );

        const tx = await makeContractCall({
          contractAddress: vaultAddress,
          contractName: vaultName,
          functionName: "borrow-and-pay",
          functionArgs: [
            uintCV(amountUsdcx),
            principalCV(option.payTo),
            uintCV(collateralSbtc),
          ],
          anchorMode: AnchorMode.Any,
          postConditionMode: PostConditionMode.Deny,
          postConditions: [
            makeStandardFungiblePostCondition(
              agentAddress,
              FungibleConditionCode.Equal,
              collateralSbtc,
              sbtcAsset
            ),
            makeContractFungiblePostCondition(
              vaultAddress,
              vaultName,
              FungibleConditionCode.Equal,
              netPayment,
              usdcxAsset
            ),
          ],
          senderKey: privateKey,
          network: new StacksMainnet(),
          fee: 2000n,
        });

        const signedHex = Buffer.from(serializeTransaction(tx)).toString("hex");

        const paymentPayload = {
          x402Version: 2 as const,
          resource: paymentRequiredBody.resource,
          accepted: option,
          payload: { transaction: signedHex },
        };

        const encodedPayment = encodePaymentPayload(paymentPayload);

        paymentResponse = await fetch(VAULT_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
            [X402_HEADERS.PAYMENT_SIGNATURE]: encodedPayment,
          },
        });

        expect(paymentResponse.status).toBe(200);
      },
      // Long timeout: includes Stacks broadcast + confirmation polling (up to 20s)
      45_000
    );

    it("payment-response header is present on the 200 response", () => {
      expect(paymentResponse).toBeDefined();
      const header = paymentResponse.headers.get(X402_HEADERS.PAYMENT_RESPONSE);
      expect(header).not.toBeNull();
    });

    it("payment-response decodes to a valid settlement receipt with txid and blockHeight", () => {
      const header = paymentResponse.headers.get(X402_HEADERS.PAYMENT_RESPONSE)!;
      const receipt = decodePaymentResponse(header);
      expect(receipt).not.toBeNull();
      expect(receipt!.success).toBe(true);
      expect(typeof receipt!.transaction).toBe("string");
      expect(receipt!.transaction.length).toBeGreaterThan(0);

      // Extended receipt fields (Lend402 adds blockHeight + confirmedAt)
      const extended = decodeBase64<{ blockHeight: number; confirmedAt: number }>(header);
      expect(typeof extended.blockHeight).toBe("number");
      expect(extended.blockHeight).toBeGreaterThan(0);
    });
  }
);
