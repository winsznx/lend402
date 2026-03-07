import { StacksMainnet, StacksTestnet } from "@stacks/network";
import {
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  getAddressFromPrivateKey,
  makeContractCall,
} from "@stacks/transactions";
import { getExplorerChain, normalizeTxid } from "@/lib/network";
import { getServerStacksConfig } from "@/lib/server-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getBearerToken(request: Request): string {
  const authHeader = request.headers.get("authorization")?.trim();

  if (authHeader?.toLowerCase().startsWith("bearer ")) {
    return authHeader.slice(7).trim();
  }

  return request.headers.get("x-refresh-secret")?.trim() ?? "";
}

function getNetworkClient(networkName: "mainnet" | "testnet") {
  return networkName === "mainnet" ? new StacksMainnet() : new StacksTestnet();
}

async function handler(request: Request): Promise<Response> {
  const sharedSecret =
    process.env.PRICE_CACHE_REFRESH_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim();
  const refresherPrivateKey =
    process.env.LEND402_CACHE_REFRESH_PRIVATE_KEY?.trim();

  if (!sharedSecret) {
    return Response.json(
      { error: "Missing PRICE_CACHE_REFRESH_SECRET or CRON_SECRET." },
      { status: 500 }
    );
  }

  if (!refresherPrivateKey) {
    return Response.json(
      { error: "Missing LEND402_CACHE_REFRESH_PRIVATE_KEY." },
      { status: 500 }
    );
  }

  const suppliedSecret = getBearerToken(request);
  if (!suppliedSecret || suppliedSecret !== sharedSecret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const stacksConfig = getServerStacksConfig();
  const network = getNetworkClient(stacksConfig.networkName);
  const senderAddress = getAddressFromPrivateKey(
    refresherPrivateKey,
    stacksConfig.transactionVersion
  );

  try {
    const transaction = await makeContractCall({
      contractAddress: stacksConfig.vaultContractAddress,
      contractName: stacksConfig.vaultContractName,
      functionName: "refresh-price-cache",
      functionArgs: [],
      senderKey: refresherPrivateKey,
      network,
      anchorMode: AnchorMode.Any,
      postConditionMode: PostConditionMode.Deny,
    });

    const txid = normalizeTxid(transaction.txid());
    const broadcastResult = await broadcastTransaction(transaction, network);

    if ("error" in broadcastResult) {
      const message = [broadcastResult.error, broadcastResult.reason]
        .filter(Boolean)
        .join(": ");

      return Response.json(
        {
          error: message || "Stacks node rejected refresh-price-cache transaction.",
          txid,
        },
        { status: 502 }
      );
    }

    const explorerBaseUrl =
      process.env.NEXT_PUBLIC_HIRO_EXPLORER_BASE_URL?.trim() ||
      "https://explorer.hiro.so";

    return Response.json(
      {
        ok: true,
        status: "submitted",
        txid,
        senderAddress,
        network: stacksConfig.caip2NetworkId,
        contract: stacksConfig.vaultContractId,
        explorerUrl: `${explorerBaseUrl}/txid/${txid}?chain=${getExplorerChain(
          stacksConfig.networkName
        )}`,
      },
      { status: 202 }
    );
  } catch (error) {
    return Response.json(
      {
        error: `Failed to submit refresh-price-cache transaction: ${
          (error as Error).message
        }`,
      },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };
