"use client";

import { useReadContract } from "wagmi";
import { formatEther } from "viem";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

function StatCard({
  label,
  value,
  unit,
}: {
  label: string;
  value: string;
  unit: string;
}) {
  const numValue = parseFloat(value);
  const display =
    unit === "ETH"
      ? numValue >= 1
        ? numValue.toFixed(2)
        : numValue >= 0.001
          ? numValue.toFixed(4)
          : numValue.toFixed(6)
      : value;

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-4">
      <p className="text-zinc-500 text-sm mb-1">{label}</p>
      <p className="text-lg font-bold font-mono">
        {display} {unit}
      </p>
    </div>
  );
}

export function PoolStats() {
  const { data: balance, isError } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "totalPoolBalance",
  });
  const { data: available } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "availableLiquidity",
  });
  const { data: totalLoaned } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "totalLoaned",
  });
  const { data: totalRepaid } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "totalRepaid",
  });

  if (isError) {
    return (
      <div className="rounded-xl bg-red-500/10 border border-red-500/50 p-4">
        <p className="text-red-400 font-medium">Cannot reach contract</p>
        <p className="text-red-400/80 text-sm mt-1">
          Ensure: 1) Hardhat/Anvil node running 2) Contract deployed 3) On Chain 31337
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Total Pool Balance"
        value={balance ? formatEther(balance) : "0"}
        unit="ETH"
      />
      <StatCard
        label="Available Liquidity"
        value={available ? formatEther(available) : "0"}
        unit="ETH"
      />
      <StatCard
        label="Total Loaned"
        value={totalLoaned ? formatEther(totalLoaned) : "0"}
        unit="ETH"
      />
      <StatCard
        label="Total Repaid"
        value={totalRepaid ? formatEther(totalRepaid) : "0"}
        unit="ETH"
      />
    </div>
  );
}
