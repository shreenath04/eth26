"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatEther } from "viem";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";
import { LoanList } from "./LoanList";

export function ManagerPanel() {
  const { address } = useAccount();
  const { data: managerAddr } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "manager",
  });
  const isManager = address && managerAddr && address.toLowerCase() === managerAddr.toLowerCase();

  if (!address) return null;
  if (!isManager) return null;

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Manager Panel
      </h3>
      <p className="text-zinc-500 text-sm mb-4">
        Approve or deny pending loan requests.
      </p>
      <ManagerLoanActions />
      <div className="mt-6">
        <h4 className="text-sm font-medium text-zinc-500 mb-3">All Loans</h4>
        <LoanList />
      </div>
    </div>
  );
}

function ManagerLoanActions() {
  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoanCount",
  });

  if (!count || count === 0n) return null;

  return (
    <div className="space-y-2">
      <PendingLoansActions />
    </div>
  );
}

function PendingLoansActions() {
  const { data: count } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoanCount",
  });

  const ids = count ? Array.from({ length: Number(count) }, (_, i) => i) : [];
  const pendingRows = ids.map((id) => <PendingLoanActions key={id} loanId={id} />);

  return <div className="space-y-2">{pendingRows}</div>;
}

function PendingLoanActions({ loanId }: { loanId: number }) {
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoan",
    args: [BigInt(loanId)],
  });

  const { writeContract: approve, status: approveStatus } = useWriteContract();
  const { writeContract: deny, status: denyStatus } = useWriteContract();

  if (!data) return null;
  const [, amount, , purpose, status] = data;
  if (status !== 0n) return null; // Not pending

  const handleApprove = () => {
    approve({
      address: CONTRACT_ADDRESS,
      abi: INVESTMENT_POOL_ABI,
      functionName: "approveLoan",
      args: [BigInt(loanId)],
    });
  };

  const handleDeny = () => {
    deny({
      address: CONTRACT_ADDRESS,
      abi: INVESTMENT_POOL_ABI,
      functionName: "denyLoan",
      args: [BigInt(loanId)],
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-zinc-800/50 border border-zinc-700">
      <div>
        <p className="text-sm">#{loanId} · {purpose}</p>
        <p className="text-emerald-400 font-mono text-sm">{formatEther(amount)} ETH</p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleApprove}
          disabled={approveStatus === "pending" || denyStatus === "pending"}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm font-medium disabled:opacity-50"
        >
          Approve
        </button>
        <button
          onClick={handleDeny}
          disabled={approveStatus === "pending" || denyStatus === "pending"}
          className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm font-medium disabled:opacity-50"
        >
          Deny
        </button>
      </div>
    </div>
  );
}
