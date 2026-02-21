import type { Wallet } from "@rainbow-me/rainbowkit";
import { hardhat } from "wagmi/chains";
import { createDevWalletConnector } from "./devWallet";

function createDevWallet(accountIndex: number, label: string): Wallet {
  return (): Wallet => ({
    id: `devWallet-${accountIndex}`,
    name: `Dev Wallet (${label} #${accountIndex})`,
    iconUrl: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMzNGM3NTkiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMTIgMmgxMGw0IDQtNHQgMTBIMTBWMTJoLTJ2OGgtNlY0aDZ2NmgyeiIvPjwvc3ZnPg==",
    iconBackground: "#166534",
    createConnector: (walletDetails) =>
      createDevWalletConnector(walletDetails.chains ?? [hardhat], accountIndex),
  });
}

/** Use in Tab 1: pool owner, approve/deny loans */
export const devWalletOwner = createDevWallet(0, "Owner");
/** Use in Tab 2: invest & withdraw */
export const devWalletDepositor = createDevWallet(1, "Depositor");
/** Use in Tab 3: request & repay loans */
export const devWalletBorrower = createDevWallet(2, "Borrower");

/** All three for multi-tab testing (one account per tab) */
export const devWallets = [devWalletOwner, devWalletDepositor, devWalletBorrower];
