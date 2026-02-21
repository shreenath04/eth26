# Deploying to Testnet (ADI Testnet)

## Is it ready?

**Yes, with a few checks.** The app and contracts are set up for testnet; follow the steps below.

---

## 1. Contract deployment

```bash
cd contracts
# Set your deployer private key (wallet with testnet tokens for gas)
export PRIVATE_KEY=0x...
# Optional: override RPC
# export ADI_TESTNET_RPC_URL=https://rpc.ab.testnet.adifoundation.ai

npm run deploy:adiTestnet
```

Copy the printed **InvestmentPool deployed to:** address.

---

## 2. Frontend env (web)

Create or edit `web/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<paste deployed address>
NEXT_PUBLIC_CHAIN_ID=99999
```

Optional:

- `NEXT_PUBLIC_ADI_RPC_URL` – only if you need a different ADI mainnet RPC (not used for testnet).
- `NEXT_PUBLIC_WALLETCONNECT_ID` – get a free ID from [WalletConnect Cloud](https://cloud.walletconnect.com/) for WalletConnect in the app.

---

## 3. Testnet checklist

| Item | Notes |
|------|--------|
| **RPC** | ADI Testnet RPC is already in the app (`rpc.ab.testnet.adifoundation.ai`). |
| **Chain guard** | Set `NEXT_PUBLIC_CHAIN_ID=99999` so the app asks users to switch to ADI Testnet. |
| **Contract address** | Must set `NEXT_PUBLIC_CONTRACT_ADDRESS`; no valid default on testnet. |
| **Gas / tokens** | Users need testnet ADI for gas. Get from ADI testnet faucet if available. |
| **WalletConnect** | For mobile/other wallets, set `NEXT_PUBLIC_WALLETCONNECT_ID`. |
| **Dev wallets** | “Local (one per tab)” wallets only work with Hardhat; on testnet users use MetaMask etc. |

---

## 4. Run the app

```bash
cd web
npm run dev
```

Open the app, connect a wallet, switch to **ADI Testnet** (Chain ID 99999), then use the pool as usual.

---

## 5. Optional: mainnet (ADI Chain)

Same flow, but:

- Deploy: `npm run deploy:adi` (in `contracts`).
- In `web/.env.local`: `NEXT_PUBLIC_CHAIN_ID=12227332` and `NEXT_PUBLIC_CONTRACT_ADDRESS=<address>`.

Use mainnet only after you’re satisfied on testnet.
