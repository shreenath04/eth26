"use client";

import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { formatEther } from "viem";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

export function RepayForm() {
  const { address } = useAccount();
  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoanCount",
  });

  const ids = count ? Array.from({ length: Number(count) }, (_, i) => i) : [];

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-zinc-500">Repay Your Loans</h4>
      {ids.length === 0 ? (
        <p className="text-zinc-600 text-sm">No loans yet.</p>
      ) : (
        ids.map((id) => (
          <RepayLoanRow key={id} loanId={id} userAddress={address} />
        ))
      )}
    </div>
  );
}

function RepayLoanRow({ loanId, userAddress }: { loanId: number; userAddress?: `0x${string}` }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoan",
    args: [BigInt(loanId)],
  });

  const { writeContract, data: hash, status } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  if (!data || !userAddress) return null;
  const [borrower, amount, , purpose, statusNum] = data;
  if (borrower.toLowerCase() !== userAddress.toLowerCase()) return null;
  if (statusNum !== 1n) return null; // Not approved

  const handleRepay = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: INVESTMENT_POOL_ABI,
      functionName: "repayLoan",
      args: [BigInt(loanId)],
      value: amount,
    });
  };

  return (
    <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-zinc-500">#{loanId} · {purpose}</p>
        <p className="text-emerald-400 font-mono">{formatEther(amount)} ETH</p>
      </div>
      <button
        onClick={handleRepay}
        disabled={status === "pending" || isConfirming}
        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium disabled:opacity-50"
      >
        {status === "pending" || isConfirming ? "Confirming..." : "Repay"}
      </button>
      {isSuccess && <span className="text-emerald-400 text-sm">Repaid!</span>}
    </div>
  );
}
