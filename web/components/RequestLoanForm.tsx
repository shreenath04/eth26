"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

const DURATIONS = [
  { label: "7 days", seconds: 86400 * 7 },
  { label: "30 days", seconds: 86400 * 30 },
  { label: "90 days", seconds: 86400 * 90 },
];

export function RequestLoanForm() {
  const [amount, setAmount] = useState("");
  const [durationIndex, setDurationIndex] = useState(0);
  const [purpose, setPurpose] = useState("");

  const { data: hash, writeContract, status, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const value = parseEther(amount);
      const duration = BigInt(DURATIONS[durationIndex].seconds);
      if (value <= 0n || !purpose.trim()) return;
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: INVESTMENT_POOL_ABI,
        functionName: "requestLoan",
        args: [value, duration, purpose.trim()],
      });
      setAmount("");
      setPurpose("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-zinc-500 mb-2">Amount (ETH)</label>
        <input
          type="text"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.0"
          className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none font-mono"
        />
      </div>
      <div>
        <label className="block text-sm text-zinc-500 mb-2">Duration</label>
        <select
          value={durationIndex}
          onChange={(e) => setDurationIndex(Number(e.target.value))}
          className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        >
          {DURATIONS.map((d, i) => (
            <option key={i} value={i}>
              {d.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm text-zinc-500 mb-2">Purpose</label>
        <input
          type="text"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          placeholder="e.g. Business expansion"
          className="w-full px-4 py-3 rounded-lg bg-zinc-900 border border-zinc-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
      </div>
      <button
        type="submit"
        disabled={!amount || !purpose || status === "pending" || isConfirming}
        className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
      >
        {status === "pending" || isConfirming ? "Confirming..." : "Request Loan"}
      </button>
      {isSuccess && (
        <p className="text-emerald-400 text-sm">Loan request submitted! Awaiting manager approval.</p>
      )}
      {error && (
        <p className="text-red-400 text-sm">Error: {error.message}</p>
      )}
    </form>
  );
}
