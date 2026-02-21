"use client";

import { useAccount } from "wagmi";
import { Header } from "@/components/Header";
import { ChainGuard } from "@/components/ChainGuard";
import { PoolStats } from "@/components/PoolStats";
import { UserStats } from "@/components/UserStats";
import { LPSection } from "@/components/LPSection";
import { BorrowerSection } from "@/components/BorrowerSection";
import { AdminSection } from "@/components/AdminSection";

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-12">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            Investment Pool
          </h2>
          <p className="text-zinc-500">One account: invest & withdraw · request & repay loans · on ADI Chain</p>
        </div>

        {!isConnected ? (
          <div className="rounded-xl bg-zinc-900/50 border border-zinc-800 p-12 text-center">
            <p className="text-zinc-500 mb-4">Connect your wallet to participate</p>
            <p className="text-sm text-zinc-600">Use the Connect Wallet button in the header</p>
          </div>
        ) : (
          <div className="space-y-12">
            <ChainGuard />

            <section>
              <h3 className="text-xl font-bold mb-4">Pool Overview</h3>
              <PoolStats />
            </section>

            <section>
              <h3 className="text-xl font-bold mb-4">Your Account</h3>
              <p className="text-zinc-500 text-sm mb-3">Use this wallet to invest, withdraw, request loans, and repay.</p>
              <UserStats />
            </section>

            <section>
              <h3 className="text-xl font-bold mb-2">Invest & Withdraw</h3>
              <p className="text-zinc-500 text-sm mb-3">Deposit to earn from the pool; withdraw your share anytime.</p>
              <LPSection />
            </section>

            <section>
              <h3 className="text-xl font-bold mb-2">Request & Repay Loans</h3>
              <p className="text-zinc-500 text-sm mb-3">Request a loan; after approval, withdraw and repay with interest.</p>
              <BorrowerSection />
            </section>

            <section>
              <AdminSection />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
