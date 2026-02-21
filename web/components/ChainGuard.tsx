"use client";

import { useAccount, useSwitchChain } from "wagmi";
import { adi } from "@/lib/chains";

const TARGET_CHAIN_ID = process.env.NEXT_PUBLIC_CHAIN_ID ? Number(process.env.NEXT_PUBLIC_CHAIN_ID) : 31337;

const CHAIN_HINTS: Record<number, string> = {
  [adi.id]: "ADI Chain: RPC https://rpc.adifoundation.ai — Chain ID: 12227332",
  99999: "ADI Testnet: RPC https://rpc.ab.testnet.adifoundation.ai — Chain ID: 99999",
  31337: "Local: RPC http://127.0.0.1:8545 — Chain ID: 31337",
};

export function ChainGuard() {
  const { chain, isConnected } = useAccount();
  const { switchChain, isPending } = useSwitchChain();

  if (!isConnected || !chain) return null;
  if (chain.id === TARGET_CHAIN_ID) return null;

  const chainName = TARGET_CHAIN_ID === adi.id ? "ADI Chain" : TARGET_CHAIN_ID === 99999 ? "ADI Testnet" : `Chain ${TARGET_CHAIN_ID}`;

  return (
    <div className="rounded-xl bg-amber-500/10 border border-amber-500/50 p-4 mb-6">
      <p className="text-amber-400 text-sm mb-2">
        Wrong network: you're on <strong>{chain.name}</strong>. Switch to <strong>{chainName}</strong> to use this app.
      </p>
      {CHAIN_HINTS[TARGET_CHAIN_ID] && (
        <p className="text-amber-400/80 text-xs mb-3">{CHAIN_HINTS[TARGET_CHAIN_ID]}</p>
      )}
      <button
        onClick={() => switchChain({ chainId: TARGET_CHAIN_ID })}
        disabled={isPending}
        className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-medium disabled:opacity-50"
      >
        {isPending ? "Switching..." : `Switch to ${chainName}`}
      </button>
    </div>
  );
}
