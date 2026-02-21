"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { parseEther, formatEther } from "viem";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

export function WithdrawForm() {
  const [amount, setAmount] = useState("");
  const { address } = useAccount();

  const { data: myDeposit } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "deposits",
    args: address ? [address] : undefined,
  });

  const { data: hash, writeContract, status, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const value = parseEther(amount);
      if (value <= 0n) return;
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: INVESTMENT_POOL_ABI,
        functionName: "withdraw",
        args: [value],
      });
      setAmount("");
    } catch (err) {
      console.error(err);
    }
  };

  const balance = myDeposit ? formatEther(myDeposit) : "0";

  return (
    <form onSubmit={handleWithdraw} className="space-y-4">
      <div className="text-sm text-zinc-500">
        Your deposit: <span className="text-zinc-300 font-mono">{balance} ETH</span>
      </div>
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
      <button
        type="button"
        onClick={() => setAmount(balance)}
        className="text-sm text-emerald-500 hover:text-emerald-400"
      >
        Max
      </button>
      <button
        type="submit"
        disabled={!amount || status === "pending" || isConfirming}
        className="w-full py-3 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors border border-zinc-600"
      >
        {status === "pending" || isConfirming ? "Confirming..." : "Withdraw ETH"}
      </button>
      {isSuccess && (
        <p className="text-emerald-400 text-sm">Withdrawal successful!</p>
      )}
      {error && (
        <p className="text-red-400 text-sm">Error: {error.message}</p>
      )}
    </form>
  );
}
