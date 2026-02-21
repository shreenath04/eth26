import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { createStorage, http, noopStorage } from "wagmi";
import { hardhat } from "wagmi/chains";
import {
  metaMaskWallet,
  injectedWallet,
  walletConnectWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { devWalletOwner, devWalletDepositor, devWalletBorrower } from "./devWalletRainbowKit";
import { adi, adiTestnet } from "./chains";

const chains = [adi, adiTestnet, hardhat] as const;

export const config = getDefaultConfig({
  appName: "ETH Pool DeFi",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_ID || "YOUR_PROJECT_ID",
  chains,
  ssr: true,
  transports: {
    [adi.id]: http(process.env.NEXT_PUBLIC_ADI_RPC_URL || "https://rpc.adifoundation.ai"),
    [adiTestnet.id]: http("https://rpc.ab.testnet.adifoundation.ai"),
    [hardhat.id]: http("http://127.0.0.1:8545"),
  },
  storage: createStorage({
    storage: typeof window !== "undefined" ? window.sessionStorage : noopStorage,
  }),
  wallets: [
    {
      groupName: "Recommended",
      wallets: [metaMaskWallet, injectedWallet, walletConnectWallet],
    },
    {
      groupName: "Local (one per tab)",
      wallets: [devWalletOwner, devWalletDepositor, devWalletBorrower],
    },
  ],
});
