import {
  addressFromHashMode,
  addressToString,
  broadcastTransaction,
  deserializeTransaction,
  TransactionVersion,
  txidFromData,
} from "@stacks/transactions";
import { StacksMainnet, StacksNetwork, StacksTestnet } from "@stacks/network";
import type { SettlementReceipt, SettlementRequest } from "@/types/x402";
import { getHiroApiBaseUrl, normalizeTxid } from "@/lib/network";

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 60_000;

interface TxStatusResponse {
  tx_status: string;
  block_height: number;
  burn_block_time: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function networkForRequest(network: SettlementRequest["network"]): StacksNetwork {
  return network === "stacks:1" ? new StacksMainnet() : new StacksTestnet();
}

function txVersionForRequest(network: SettlementRequest["network"]): TransactionVersion {
  return network === "stacks:1"
    ? TransactionVersion.Mainnet
    : TransactionVersion.Testnet;
}

function isRecoverableBroadcastRejection(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("conflictingnonceinmempool") ||
    lower.includes("transactionalreadyinmempool") ||
    lower.includes("alreadyinmempool") ||
    lower.includes("already")
  );
}

async function pollForConfirmation(
  txid: string,
  network: SettlementRequest["network"]
): Promise<Pick<SettlementReceipt, "blockHeight" | "confirmedAt">> {
  const hiroApiBaseUrl =
    network === "stacks:1"
      ? getHiroApiBaseUrl("mainnet")
      : getHiroApiBaseUrl("testnet");
  const maxAttempts = Math.ceil(POLL_TIMEOUT_MS / POLL_INTERVAL_MS);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await sleep(POLL_INTERVAL_MS);

    const response = await fetch(`${hiroApiBaseUrl}/extended/v1/tx/${txid}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5_000),
    });

    if (response.status === 404) {
      continue;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "no body");
      throw new Error(`Stacks API returned ${response.status} while polling ${txid}: ${body}`);
    }

    const transaction = (await response.json()) as TxStatusResponse;

    if (transaction.tx_status === "success" && transaction.block_height > 0) {
      return {
        blockHeight: transaction.block_height,
        confirmedAt: transaction.burn_block_time,
      };
    }

    if (
      transaction.tx_status.startsWith("abort") ||
      transaction.tx_status.startsWith("dropped")
    ) {
      throw new Error(`Transaction aborted on-chain: ${transaction.tx_status}`);
    }
  }

  throw new Error(`Confirmation timeout after ${POLL_TIMEOUT_MS / 1000} seconds`);
}

export async function settleStacksPayment(
  request: SettlementRequest
): Promise<SettlementReceipt> {
  const signedTransactionHex = request.payload.signedTransaction.replace(/^0x/i, "");

  if (!signedTransactionHex) {
    throw new Error("Settlement payload is missing signedTransaction");
  }

  const transaction = deserializeTransaction(signedTransactionHex);
  const expectedVersion = txVersionForRequest(request.network);
  if (transaction.version !== expectedVersion) {
    throw new Error(
      `Signed transaction version mismatch: expected ${expectedVersion}, received ${transaction.version}`
    );
  }

  const txid = normalizeTxid(txidFromData(Buffer.from(signedTransactionHex, "hex")));
  const spendingCondition = transaction.auth.spendingCondition;
  const payer = addressToString(
    addressFromHashMode(
      spendingCondition.hashMode,
      transaction.version,
      spendingCondition.signer
    )
  );

  const network = networkForRequest(request.network);

  try {
    const broadcastResult = await broadcastTransaction(transaction, network);

    if ("error" in broadcastResult) {
      const message = [broadcastResult.error, broadcastResult.reason]
        .filter(Boolean)
        .join(": ");

      if (!isRecoverableBroadcastRejection(message)) {
        throw new Error(message || "Stacks node rejected the transaction");
      }
    }
  } catch (error) {
    throw new Error(`Broadcast failed: ${(error as Error).message}`);
  }

  const confirmation = await pollForConfirmation(txid, request.network);

  return {
    success: true,
    txid,
    network: request.network,
    blockHeight: confirmation.blockHeight,
    confirmedAt: confirmation.confirmedAt,
    payer,
  };
}
