"use client";

import { useState } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useChainId } from "wagmi";
import { parseEther } from "viem";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { hardhat } from "wagmi/chains";

export function DepositForm() {
  const [amount, setAmount] = useState("");
  const [inputError, setInputError] = useState("");
  const chainId = useChainId();

  const { data: hash, writeContract, status, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({
    hash,
  });

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setInputError("");
    if (!amount || parseFloat(amount) <= 0) {
      setInputError("Enter a valid amount (e.g. 0.1 or 1)");
      return;
    }
    try {
      const value = parseEther(amount);
      if (value <= 0n) return;
      writeContract(
        {
          address: CONTRACT_ADDRESS,
          abi: INVESTMENT_POOL_ABI,
          functionName: "deposit",
          value,
          chainId: hardhat.id,
        },
        {
          onError: (err) => {
            setInputError(err.message ?? "Transaction failed");
          },
        }
      );
      setAmount("");
    } catch (err: any) {
      setInputError(err?.message ?? "Invalid amount. Use a number like 0.1 or 1");
    }
  };

  const displayError = inputError || error?.message;

  return (
    <form onSubmit={handleDeposit} className="space-y-4">
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
        type="submit"
        disabled={!amount || status === "pending" || isConfirming}
        className="w-full py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
      >
        {status === "pending" || isConfirming ? "Confirming..." : "Deposit ETH"}
      </button>
      {isSuccess && (
        <p className="text-emerald-400 text-sm">Deposit successful!</p>
      )}
      {displayError && (
        <p className="text-red-400 text-sm break-words">Error: {displayError}</p>
      )}
      {chainId !== hardhat.id && (
        <p className="text-amber-400 text-sm">Switch to Hardhat (Chain 31337) to deposit.</p>
      )}
    </form>
  );
}
