"use client";

import { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount,
} from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { parseEther, formatEther } from "viem";

const REPAY_BUFFER_ETH = "0.01";
import toast from "react-hot-toast";
import { INVESTMENT_POOL_ABI } from "@/lib/abi";
import { CONTRACT_ADDRESS } from "@/lib/contract";

const STATUS: Record<number, string> = {
  0: "Requested",
  1: "Approved",
  2: "Withdrawn",
  3: "Repaid",
  4: "Denied",
  5: "Defaulted",
};

const COLLATERAL_BPS = 15000; // 150%

export function BorrowerSection() {
  return (
    <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-6">
      <RequestLoanCard />
      <MyLoansTable />
    </div>
  );
}

function RequestLoanCard() {
  const [amount, setAmount] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [purpose, setPurpose] = useState("");
  const queryClient = useQueryClient();
  const { writeContract, data: hash, status, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !purpose.trim()) {
      toast.error("Enter amount and purpose");
      return;
    }
    try {
      const value = parseEther(amount);
      const days = BigInt(durationDays || "1");
      const collateralWei = (value * BigInt(COLLATERAL_BPS)) / 10000n;
      writeContract({
        address: CONTRACT_ADDRESS,
        abi: INVESTMENT_POOL_ABI,
        functionName: "requestLoan",
        args: [value, days, purpose.trim()],
        value: collateralWei,
        gas: 400000n,
      });
      setAmount("");
      setPurpose("");
    } catch {
      toast.error("Invalid input");
    }
  };

  useEffect(() => {
    if (isSuccess) {
      toast.success("Loan requested!");
      queryClient.invalidateQueries();
    }
  }, [isSuccess, queryClient]);
  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  const loanAmountWei = amount ? (() => { try { return parseEther(amount); } catch { return 0n; } })() : 0n;
  const collateralWei = (loanAmountWei * BigInt(COLLATERAL_BPS)) / 10000n;
  const collateralStr = collateralWei > 0n ? formatEther(collateralWei) : "0";

  return (
    <form onSubmit={handleSubmit} className="space-y-2 mb-6">
      <input
        type="text"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Loan amount (ETH)"
        className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700 font-mono"
      />
      <p className="text-xs text-zinc-500">Collateral required (150%): {collateralStr} ETH — locked until repayment or denial</p>
      <input
        type="number"
        value={durationDays}
        onChange={(e) => setDurationDays(e.target.value)}
        placeholder="Duration (days)"
        className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700"
      />
      <input
        type="text"
        value={purpose}
        onChange={(e) => setPurpose(e.target.value)}
        placeholder="Purpose"
        className="w-full px-4 py-2 rounded-lg bg-zinc-900 border border-zinc-700"
      />
      <button
        type="submit"
        disabled={!amount || !purpose || status === "pending" || isConfirming}
        className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 font-medium"
      >
        {status === "pending" || isConfirming ? "Confirming..." : "Request Loan"}
      </button>
    </form>
  );
}

function MyLoansTable() {
  const { address } = useAccount();
  const { data: loanIds } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: INVESTMENT_POOL_ABI,
    functionName: "getUserLoanIds",
    args: address ? [address] : undefined,
    query: { refetchOnWindowFocus: true, staleTime: 0 },
  });

  if (!address) return null;
  if (loanIds === undefined) return <p className="text-zinc-500 text-sm">Loading your loans…</p>;
  if (loanIds.length === 0) {
    return (
      <p className="text-zinc-500 text-sm">
        No loans. Request a loan above; after the manager approves, you’ll see a Withdraw option here.
      </p>
    );
  }

  return (
    <div>
      <h4 className="text-sm font-medium text-zinc-500 mb-2">My Loans</h4>
      <div className="space-y-2">
        {loanIds.map((id) => (
          <LoanRow key={id.toString()} loanId={Number(id)} />
        ))}
      </div>
    </div>
  );
}

function LoanRow({ loanId }: { loanId: number }) {
  const { address } = useAccount();
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

  const queryClient = useQueryClient();
  const { writeContract: withdrawLoan, data: hashW, status: statusW } = useWriteContract();
  const { isLoading: confirmW, isSuccess: successW } = useWaitForTransactionReceipt({ hash: hashW });

  useEffect(() => {
    if (successW) {
      toast.success("Loan withdrawn!");
      queryClient.invalidateQueries();
    }
  }, [successW, queryClient]);

  if (!data || !address) return null;
  const [borrower, amount, durationDays, purpose, status, , , , , collateral] = data;
  if (borrower.toLowerCase() !== address.toLowerCase()) return null;

  const statusNum = Number(status);
  const canWithdraw = statusNum === 1; // Approved
  const canRepay = statusNum === 2;    // Withdrawn

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-lg bg-zinc-800/50">
      <div>
        <p className="text-sm">#{loanId} · {purpose} · {formatEther(amount)} ETH</p>
        <p className="text-xs text-zinc-500">Status: {STATUS[statusNum]} · Collateral: {formatEther(collateral ?? 0n)} ETH</p>
        {canRepay && owed !== undefined && owed > 0n && (
          <p className="text-xs text-amber-400">Owed: {formatEther(owed)} ETH</p>
        )}
      </div>
      <div className="flex gap-2">
        {canWithdraw && (
          <button
            onClick={() =>
              withdrawLoan({
                address: CONTRACT_ADDRESS,
                abi: INVESTMENT_POOL_ABI,
                functionName: "withdrawLoan",
                args: [BigInt(loanId)],
              })
            }
            disabled={statusW === "pending" || confirmW}
            className="px-3 py-1 rounded bg-emerald-600 text-sm disabled:opacity-50"
          >
            Withdraw
          </button>
        )}
        {canRepay && owed !== undefined && owed > 0n && (
          <RepayButton loanId={loanId} amountOwed={owed} />
        )}
      </div>
    </div>
  );
}

function RepayButton({ loanId, amountOwed }: { loanId: number; amountOwed: bigint }) {
  const queryClient = useQueryClient();
  const buffer = parseEther(REPAY_BUFFER_ETH);
  const minRepay = amountOwed + buffer;
  const [amountStr, setAmountStr] = useState(() => formatEther(minRepay));

  const { writeContract, data: hash, status, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      toast.success("Repaid!");
      queryClient.invalidateQueries();
    }
  }, [isSuccess, queryClient]);
  useEffect(() => {
    if (error) toast.error(error.message);
  }, [error]);

  const handleRepay = () => {
    let valueWei: bigint;
    try {
      valueWei = parseEther(amountStr.trim() || "0");
    } catch {
      toast.error("Invalid amount");
      return;
    }
    if (valueWei < amountOwed) {
      toast.error(`Minimum to repay is ${formatEther(amountOwed)} ETH`);
      return;
    }
    writeContract({
      address: CONTRACT_ADDRESS,
      abi: INVESTMENT_POOL_ABI,
      functionName: "repayLoan",
      args: [BigInt(loanId)],
      value: valueWei,
      gas: 300000n,
    });
  };

  const busy = status === "pending" || isConfirming;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        type="text"
        value={amountStr}
        onChange={(e) => setAmountStr(e.target.value)}
        placeholder={`Min ${formatEther(amountOwed)} ETH`}
        className="w-32 px-2 py-1.5 rounded bg-zinc-800 border border-zinc-600 text-sm font-mono"
      />
      <span className="text-xs text-zinc-500">ETH</span>
      <button
        type="button"
        onClick={handleRepay}
        disabled={busy}
        className="px-3 py-1.5 rounded bg-cyan-600 text-sm disabled:opacity-50 hover:bg-cyan-500"
      >
        {busy ? "Confirming…" : "Repay"}
      </button>
    </div>
  );
}
