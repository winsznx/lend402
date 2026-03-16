import { readFileSync } from "fs";
import { mnemonicToSeedSync } from "@scure/bip39";
import pkg from "@stacks/transactions";
const { makeContractDeploy, AnchorMode, PostConditionMode } = pkg;
import networkPkg from "@stacks/network";
const { StacksMainnet } = networkPkg;
import { HDKey } from "@scure/bip32";

const MNEMONIC = process.env.DEPLOYER_MNEMONIC;
if (!MNEMONIC) throw new Error("Set DEPLOYER_MNEMONIC env var before running");
const CONTRACT_NAME = "lend402-vault-v3";
const CONTRACT_PATH = new URL(
  "../contracts/lend402-vault-v3.clar",
  import.meta.url
);

const network = new StacksMainnet({ url: "https://api.hiro.so" });
const codeBody = readFileSync(CONTRACT_PATH, "utf8");

const seed = mnemonicToSeedSync(MNEMONIC);
const root = HDKey.fromMasterSeed(seed);
const child = root.derive("m/44'/5757'/0'/0/0");
const privateKey = Buffer.from(child.privateKey).toString("hex") + "01";

const tx = await makeContractDeploy({
  contractName: CONTRACT_NAME,
  codeBody,
  senderKey: privateKey,
  network,
  anchorMode: AnchorMode.Any,
  postConditionMode: PostConditionMode.Allow,
  clarityVersion: 4,
  fee: 450000,
  nonce: 756,
});

const serialized = tx.serialize();
console.log("Tx serialized, broadcasting via fetch...");
const res = await fetch("https://api.hiro.so/v2/transactions", {
  method: "POST",
  headers: { "Content-Type": "application/octet-stream" },
  body: serialized,
});

const text = await res.text();
console.log("Status:", res.status);
console.log("Response:", text);
