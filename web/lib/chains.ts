import { defineChain } from "viem";

/** ADI Chain mainnet — $ADI */
export const adi = defineChain({
  id: 12227332,
  name: "ADI Chain",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.adifoundation.ai/"] },
  },
  blockExplorers: {
    default: { name: "ADI Explorer", url: "https://explorer.adifoundation.ai" },
  },
});

/** ADI Testnet */
export const adiTestnet = defineChain({
  id: 99999,
  name: "ADI Testnet",
  nativeCurrency: { name: "ADI", symbol: "ADI", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.ab.testnet.adifoundation.ai"] },
  },
  blockExplorers: {
    default: { name: "ADI Testnet Explorer", url: "https://explorer.testnet.adifoundation.ai" },
  },
});
