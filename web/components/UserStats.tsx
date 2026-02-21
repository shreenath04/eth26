"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

export function UserStats() {
  const { address } = useAccount();
  const { data: shares } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "lpShares",
    args: address ? [address] : undefined,
  });
  const { data: loanIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getUserLoanIds",
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

  if (!address) return null;

  const shareValue =
    shares && totalShares && poolBalance && totalShares > 0n
      ? (Number(shares) / Number(totalShares)) * Number(formatEther(poolBalance))
      : 0;

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
      <h4 className="text-sm font-medium text-zinc-500 mb-2">Your Summary</h4>
      <p className="font-mono text-zinc-300">
        LP Shares: {shares ? shares.toString() : "0"}
      </p>
      <p className="font-mono text-zinc-300 mt-1">
        Claim Value: ~{shareValue.toFixed(4)} ETH
      </p>
      <p className="font-mono text-zinc-300 mt-1">
        Your Loans: {loanIds ? loanIds.length : 0}
      </p>
    </div>
  );
}
