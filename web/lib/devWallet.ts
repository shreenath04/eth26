"use client";

import { createConnector } from "@wagmi/core";
import { createWalletClient, createPublicClient, http } from "viem";
import type { Chain } from "viem";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";
import { getAddress } from "viem";
import { hardhat } from "wagmi/chains";

// Well-known Hardhat node accounts (0–4); all have 10,000 ETH locally
const HARDHAT_KEYS = [
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // #0
  "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // #1
  "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a", // #2
  "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // #3
  "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a", // #4
] as const;

const HARDHAT_CHAIN_ID = 31337;
const RPC_URL = "http://127.0.0.1:8545";

const LABELS: Record<number, string> = {
  0: "Owner",
  1: "Depositor",
  2: "Borrower",
  3: "Account #3",
  4: "Account #4",
};

export function createDevWalletConnector(chains: Chain[] = [], accountIndex: number = 0) {
  const idx = Math.max(0, Math.min(4, accountIndex));
  const privateKey = HARDHAT_KEYS[idx];
  const chainsList = Array.isArray(chains) ? chains : [];
  const chain = chainsList.find((c) => c.id === HARDHAT_CHAIN_ID) ?? hardhat;
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(RPC_URL),
  });

  const publicClient = createPublicClient({
    chain,
    transport: http(RPC_URL),
  });

  const provider = createDevProvider(walletClient, account, publicClient);

  const connectorId = `devWallet-${idx}`;
  const storageKey = `devWalletConnected-${idx}`;
  return createConnector((config) => ({
    id: connectorId,
    name: `Dev Wallet (${LABELS[idx]} #${idx})`,
    type: "dev" as const,
    chains,
    getProvider: () => Promise.resolve(provider as any),
    getChainId: () => HARDHAT_CHAIN_ID,
    getAccounts: () => Promise.resolve([getAddress(account.address)]),
    isAuthorized: async () => {
      const stored = typeof window !== "undefined" && sessionStorage.getItem(storageKey);
      return stored === "true";
    },
    connect: async ({ chainId } = {}) => {
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, "true");
      }
      config.emitter.emit("connect", {
        accounts: [getAddress(account.address)],
        chainId: chainId ?? HARDHAT_CHAIN_ID,
      });
      return {
        accounts: [getAddress(account.address)],
        chainId: chainId ?? HARDHAT_CHAIN_ID,
      };
    },
    disconnect: async () => {
      if (typeof window !== "undefined") {
        sessionStorage.removeItem(storageKey);
      }
      config.emitter.emit("disconnect");
    },
    onAccountsChanged: (accounts) => {
      if (accounts.length === 0) config.emitter.emit("disconnect");
      else config.emitter.emit("change", { accounts: accounts.map(getAddress) });
    },
    onChainChanged: (chainId) => {
      config.emitter.emit("change", { chainId: Number(chainId) });
    },
    onDisconnect: () => {
      config.emitter.emit("disconnect");
    },
    switchChain: async ({ chainId }) => {
      config.emitter.emit("change", { chainId });
      return undefined;
    },
  }));
}

function createDevProvider(
  walletClient: ReturnType<typeof createWalletClient>,
  account: PrivateKeyAccount,
  publicClient: ReturnType<typeof createPublicClient>
) {
  return {
    request: async ({ method, params }: { method: string; params?: any[] }) => {
      switch (method) {
        case "eth_requestAccounts":
        case "eth_accounts":
          return [getAddress(account.address)];

        case "eth_chainId":
          return `0x${hardhat.id.toString(16)}`;

        case "eth_sendTransaction": {
          const tx = params?.[0];
          if (!tx) throw new Error("No transaction params");
          const hash = await walletClient!.sendTransaction({
            to: tx.to as `0x${string}`,
            value: tx.value ? BigInt(tx.value) : undefined,
            data: tx.data as `0x${string}` | undefined,
            gas: tx.gas ? BigInt(tx.gas) : undefined,
            gasPrice: tx.gasPrice ? BigInt(tx.gasPrice) : undefined,
            maxFeePerGas: tx.maxFeePerGas ? BigInt(tx.maxFeePerGas) : undefined,
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas
              ? BigInt(tx.maxPriorityFeePerGas)
              : undefined,
            nonce: tx.nonce !== undefined ? Number(tx.nonce) : undefined,
          });
          return hash;
        }

        case "personal_sign": {
          const [message] = params ?? [];
          const hash = await account.signMessage({
            message:
              typeof message === "string"
                ? { raw: message.startsWith("0x") ? (message as `0x${string}`) : message }
                : message,
          });
          return hash;
        }

        case "eth_signTypedData_v4": {
          const [, typedData] = params ?? [];
          const hash = await account.signTypedData(
            typedData.domain,
            typedData.types,
            typedData.message
          );
          return hash;
        }

        case "wallet_switchEthereumChain":
        case "wallet_addEthereumChain":
          return null;

        default:
          return (publicClient as any).request({ method, params });
      }
    },
  };
}
