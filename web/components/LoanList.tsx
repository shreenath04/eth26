"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

const STATUS_LABELS: Record<number, string> = {
  0: "Pending",
  1: "Approved",
  2: "Denied",
  3: "Repaid",
  4: "Defaulted",
};

const STATUS_COLORS: Record<number, string> = {
  0: "bg-amber-500/20 text-amber-400 border-amber-500/50",
  1: "bg-emerald-500/20 text-emerald-400 border-emerald-500/50",
  2: "bg-red-500/20 text-red-400 border-red-500/50",
  3: "bg-zinc-500/20 text-zinc-400 border-zinc-500/50",
  4: "bg-red-500/20 text-red-400 border-red-500/50",
};

export function LoanList() {
  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoanCount",
  });

  if (!count || count === 0n) {
    return (
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-8 text-center text-zinc-500">
        No loan requests yet.
      </div>
    );
  }

  const ids = Array.from({ length: Number(count) }, (_, i) => i);

  return (
    <div className="space-y-3">
      {ids.map((id) => (
        <LoanRow key={id} loanId={id} />
      ))}
    </div>
  );
}

function LoanRow({ loanId }: { loanId: number }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoan",
    args: [BigInt(loanId)],
  });

  if (!data) return null;

  const [borrower, amount, , purpose, status, requestTime] = data;
  const statusLabel = STATUS_LABELS[status] ?? "Unknown";
  const statusColor = STATUS_COLORS[status] ?? "bg-zinc-500/20 text-zinc-400";

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="font-mono text-sm text-zinc-500">
          #{loanId} · {borrower.slice(0, 6)}...{borrower.slice(-4)}
        </p>
        <p className="text-zinc-300">{purpose}</p>
        <p className="text-emerald-400 font-mono mt-1">{formatEther(amount)} ETH</p>
      </div>
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}
      >
        {statusLabel}
      </span>
    </div>
  );
}
