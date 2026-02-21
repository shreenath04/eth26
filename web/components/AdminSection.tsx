"use client";

import { useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { formatEther } from "viem";
import toast from "react-hot-toast";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

export function AdminSection() {
  const { address } = useAccount();
  const { data: owner } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "owner",
  });

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  if (!address) return null;

  if (!isOwner) {
    return (
      <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
        <h3 className="text-lg font-bold mb-2">Admin</h3>
        <p className="text-zinc-500">Admin only. Connect as owner to approve loans.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
      <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
        Admin — Loans
      </h3>
      <p className="text-zinc-500 text-sm mb-2">Approve/deny new requests; close defaulted loans (collateral covers debt).</p>
      <p className="text-zinc-600 text-xs mb-4">
        Same chain required. Pool must have enough ETH to approve. After repayment, loan closes automatically; if borrower does not repay, use &quot;Close as default&quot;.
      </p>
      <AdminLoanList />
    </div>
  );
}

function AdminLoanList() {
  const queryClient = useQueryClient();
  const { data: count, refetch, isRefetching } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoanRequestCount",
    query: {
      refetchOnWindowFocus: true,
      refetchOnMount: true,
      staleTime: 0,
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries();
    refetch();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-zinc-500 text-sm">
          Total requests: {count !== undefined ? String(count) : "…"}
        </p>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefetching}
          className="text-sm px-3 py-1.5 rounded-lg bg-zinc-700 hover:bg-zinc-600 disabled:opacity-50"
        >
          {isRefetching ? "Refreshing…" : "Refresh"}
        </button>
      </div>
      {!count || count === 0n ? (
        <p className="text-zinc-500 text-sm">No requests. Ask borrower to request a loan, then refresh.</p>
      ) : (
        <div className="space-y-2">
          {Array.from({ length: Number(count) }, (_, i) => i).map((id) => (
            <AdminLoanRow key={id} loanId={id} />
          ))}
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<number, string> = {
  0: "Requested",
  1: "Approved",
  2: "Withdrawn",
  3: "Repaid",
  4: "Denied",
  5: "Defaulted",
};

function AdminLoanRow({ loanId }: { loanId: number }) {
  const queryClient = useQueryClient();
  const { data } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getLoanRequest",
    args: [BigInt(loanId)],
    query: { refetchOnWindowFocus: true, staleTime: 0 },
  });
  const { data: owed } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getAmountOwed",
    args: [BigInt(loanId)],
    query: { refetchOnWindowFocus: true, staleTime: 0 },
  });

  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Transaction confirmed!");
      queryClient.invalidateQueries();
    }
  }, [isSuccess, queryClient]);
  useEffect(() => {
    if (writeError) {
      const msg = writeError.message || String(writeError);
      toast.error(msg.length > 80 ? msg.slice(0, 80) + "…" : msg);
    }
  }, [writeError]);

  if (!data) return null;
  const [borrower, amount, durationDays, purpose, status, , , , , collateral] = data;
  const statusNum = Number(status);
  const busy = isWritePending || isConfirming;

  const handleApprove = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: INVESTMENT_POOL_ABI,
      functionName: "approveLoan",
      args: [BigInt(loanId)],
    });
  };
  const handleDeny = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: INVESTMENT_POOL_ABI,
      functionName: "denyLoan",
      args: [BigInt(loanId)],
    });
  };
  const handleCloseDefault = () => {
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: INVESTMENT_POOL_ABI,
      functionName: "closeLoanAsDefault",
      args: [BigInt(loanId)],
    });
  };

  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-lg bg-zinc-800/50">
      <div>
        <p className="text-sm">#{loanId} · {purpose} · {formatEther(amount)} ETH</p>
        <p className="text-xs text-zinc-400">
          Borrower: {String(borrower).slice(0, 6)}…{String(borrower).slice(-4)} · Collateral: {formatEther(collateral ?? 0n)} ETH
        </p>
        <p className="text-xs text-emerald-400">
          Status: {STATUS_LABEL[statusNum] ?? statusNum}
          {statusNum === 2 && owed !== undefined && owed > 0n && ` · Owed: ${formatEther(owed)} ETH`}
        </p>
        {writeError && (
          <p className="text-xs text-red-400 mt-1">{String(writeError.message).slice(0, 120)}</p>
        )}
      </div>
      <div className="flex gap-2">
        {statusNum === 0 && (
          <>
            <button type="button" onClick={handleApprove} disabled={busy} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-sm disabled:opacity-50">
              {busy ? "Confirming…" : "Approve"}
            </button>
            <button type="button" onClick={handleDeny} disabled={busy} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-sm disabled:opacity-50">
              {busy ? "Confirming…" : "Deny"}
            </button>
          </>
        )}
        {statusNum === 2 && (
          <button type="button" onClick={handleCloseDefault} disabled={busy} className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm disabled:opacity-50">
            {busy ? "Confirming…" : "Close as default"}
          </button>
        )}
        {(statusNum === 3 || statusNum === 5) && (
          <span className="text-xs text-zinc-500">{statusNum === 3 ? "Closed (repaid)" : "Defaulted"}</span>
        )}
      </div>
    </div>
  );
}
