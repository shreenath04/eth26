"use client";

import { useState, useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther } from "viem";
import toast from "react-hot-toast";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

export function LPSection() {
  const { address } = useAccount();
  const { data: shares } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "lpShares",
    args: address ? [address] : undefined,
  });
  const { data: poolBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "totalPoolBalance",
  });
  const { data: totalShares } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "totalShares",
  });

  const shareValue =
    shares && totalShares && poolBalance && totalShares > 0n
      ? (Number(shares) / Number(totalShares)) * Number(poolBalance) / 1e18
      : 0;

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
      <DepositCard />
      <div className="mt-4 p-3 rounded-lg bg-zinc-800/50">
        <p className="text-sm text-zinc-500">My shares: {shares ? shares.toString() : "0"}</p>
        <p className="text-sm text-emerald-400">Claim value: ~{shareValue.toFixed(6)} ETH</p>
      </div>
      <WithdrawCard />
    </div>
  );
}

function DepositCard() {
  const [amount, setAmount] = useState("");
  const queryClient = useQueryClient();
  const { writeContract, data: hash, status, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Enter valid amount");
      return;
    }
    try {
      const value = parseEther(amount);
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: INVESTMENT_POOL_ABI,
        functionName: "deposit",
        value,
      });
      setAmount("");
    } catch {
      toast.error("Invalid amount");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Deposit successful!");
      queryClient.invalidateQueries();
    }
  }, [isSuccess, queryClient]);
  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  return (
    <form onSubmit={handleDeposit} className="space-y-2">
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="ETH amount"
        className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 font-mono"
      />
      <button
        type="submit"
        disabled={!amount || status === "pending" || isConfirming}
        className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 font-medium"
      >
        {status === "pending" || isConfirming ? "Confirming..." : "Deposit"}
      </button>
    </form>
  );
}

function WithdrawCard() {
  const [sharesToBurn, setSharesToBurn] = useState("");
  const queryClient = useQueryClient();
  const { address } = useAccount();
  const { data: myShares } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "lpShares",
    args: address ? [address] : undefined,
  });
  const { writeContract, data: hash, status, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sharesToBurn || BigInt(sharesToBurn) <= 0n) {
      toast.error("Enter valid shares");
      return;
    }
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: INVESTMENT_POOL_ABI,
      functionName: "withdrawInvestment",
      args: [BigInt(sharesToBurn)],
    });
    setSharesToBurn("");
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Withdrawal successful!");
      queryClient.invalidateQueries();
    }
  }, [isSuccess, queryClient]);
  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  return (
    <form onSubmit={handleWithdraw} className="mt-4 space-y-2">
      <input
        type="text"
        value={sharesToBurn}
        onChange={(e) => setSharesToBurn(e.target.value)}
        placeholder="Shares to burn"
        className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 font-mono"
      />
      <button
        type="button"
        onClick={() => setSharesToBurn(myShares?.toString() ?? "0")}
        className="text-sm text-emerald-500"
      >
        Max
      </button>
      <button
        type="submit"
        disabled={!sharesToBurn || status === "pending" || isConfirming || !myShares || myShares === 0n}
        className="w-full py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50 font-medium"
      >
        {status === "pending" || isConfirming ? "Confirming..." : "Withdraw"}
      </button>
    </form>
  );
}
