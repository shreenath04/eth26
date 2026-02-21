# Investment Pool — DeFi on ADI Chain

One account per wallet: invest & withdraw, request & repay loans. Ready to deploy on **$ADI Chain**.

## Repo Summary

| Item | Location |
|------|----------|
| Wagmi config | `web/lib/wagmi.ts` |
| Chains (ADI) | `web/lib/chains.ts` |
| Contract address | `web/lib/contract.ts` (from `NEXT_PUBLIC_CONTRACT_ADDRESS`) |
| ABI | `web/lib/abi.ts` |
| Contract | `contracts/contracts/InvestmentPool.sol` |
| Deploy script | `contracts/scripts/deploy.js` |

## Features

- **One account**: Each wallet can invest, withdraw, request loans, and repay.
- **Invest & withdraw**: Deposit to get LP shares; withdraw by burning shares.
- **Loans**: Request → admin approves → withdraw loan → repay (principal + 5% APR).
- **Admin**: Contract owner approves/denies requests.
- **ADI Chain**: Default target chain 12227332; testnet 99999 supported.

---

## How to Run on Windows

### 1. Install dependencies

```powershell
cd d:\ethdenver\contracts
npm install

cd d:\ethdenver\web
npm install
```

### 2. Environment variables

Create `web/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_WALLETCONNECT_ID=
```

(Replace with deployed address after deploy.)

### 3. Start local chain and deploy

```powershell
# Terminal 1: Start Hardhat node (Chain 31337)
cd d:\ethdenver\contracts
npx hardhat node

# Terminal 2: Deploy
cd d:\ethdenver\contracts
npx hardhat run scripts/deploy.js --network localhost
```

Copy the printed address into `web/.env.local` as `NEXT_PUBLIC_CONTRACT_ADDRESS`.

### 4. Start frontend

```powershell
cd d:\ethdenver\web
npm run dev
```

Open http://localhost:3000

### 5. MetaMask for local testing

- **Add Network**: RPC `http://127.0.0.1:8545`, Chain ID `31337`
- **Import account** (e.g. Hardhat #0):  
  `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

---

## Deploy on ADI Chain

### 1. Set deployer key

In `contracts/` create `.env`:

```env
PRIVATE_KEY=your_deployer_private_key
ADI_RPC_URL=https://rpc.adifoundation.ai
```

### 2. Deploy contract

```powershell
cd contracts
npm run deploy:adi
```

Copy the printed contract address.

### 3. Configure frontend

In `web/.env.local`:

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=<deployed_address>
NEXT_PUBLIC_CHAIN_ID=12227332
```

### 4. Add ADI Network in wallet

- **Network name**: ADI Chain  
- **RPC**: https://rpc.adifoundation.ai  
- **Chain ID**: 12227332  
- **Currency**: ADI  

---

## Required .env Keys

| Key | Example | Description |
|-----|---------|-------------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | (after deploy) | Pool contract on ADI |
| `NEXT_PUBLIC_CHAIN_ID` | `12227332` | ADI mainnet; use `31337` for local |
| `NEXT_PUBLIC_WALLETCONNECT_ID` | (optional) | From cloud.walletconnect.com |

---

## Files Changed / Added

**Contract**
- `contracts/contracts/InvestmentPool.sol` — rewritten: LP shares, request→approve→withdraw→repay, Ownable, ReentrancyGuard
- `contracts/package.json` — added `@openzeppelin/contracts`
- `contracts/scripts/deploy.js` — `owner()` instead of `manager()`

**Frontend**
- `web/lib/abi.ts` — updated ABI
- `web/lib/contract.ts` — uses `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `web/lib/wagmi.ts` — unchanged
- `web/app/providers.tsx` — added Toaster
- `web/app/page.tsx` — Dashboard + LP + Borrower + Admin
- `web/components/PoolStats.tsx` — totalPoolBalance, availableLiquidity, totalLoaned, totalRepaid
- `web/components/UserStats.tsx` — new
- `web/components/LPSection.tsx` — new (deposit, withdraw)
- `web/components/BorrowerSection.tsx` — new (request, my loans, withdraw, repay)
- `web/components/AdminSection.tsx` — new (approve/deny)
- `web/package.json` — added react-hot-toast
- `web/.env.example` — `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `web/.env.local` — updated key
