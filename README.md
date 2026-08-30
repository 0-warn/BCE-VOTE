# Bhārat Secure Vote 🇮🇳

A simple **decentralized voting system** built on Ethereum (Solidity + Hardhat + React) for a college/mock-election demo, themed around the Indian voting experience. One wallet = one vote, votes are recorded on the blockchain, and results are declared by the Election Officer (admin).

> ⚠️ **This is a learning/demo project — it is NOT meant for real elections.** See the [Limitations](#limitations) section.

## What it does

- **Voter registration** — the admin (Election Officer) registers voter wallet addresses ahead of time. One wallet address = one vote.
- **Smart contract** — a single `Voting.sol` contract holds the candidate list, voter registry, and vote counts. Every rule (registered voter, no double voting, election window) is enforced in the contract, never trusted to the frontend.
- **Hidden ballots (commit-reveal)** — when you vote, the contract stores only a *salted hash* of your choice (`keccak256(candidateId, salt)`), so nobody — not even the admin — can see who you voted for. After the election ends, each voter "reveals" their choice and the contract verifies the hash before counting it.
- **Frontend** — a React app (Indian tricolor theme 🇮🇳) where voters see a ballot, cast their vote via MetaMask, and get a VVPAT-style receipt slip with their transaction hash and secret salt.
- **Results** — locked until the admin ends the election, then filled in as voters reveal their votes, with a winner announcement.

No backend server is needed — the frontend talks to the contract directly. (A real production system would add a backend for admin/off-chain data, but that is skipped here to keep the project focused.)

## Tech stack

| Layer | Tech |
| --- | --- |
| Smart contract | Solidity `^0.8.19`, Hardhat |
| Frontend | React (Vite) + Tailwind CSS + ethers.js v6 + MetaMask *(or extension-free Demo Mode)* |
| Chain | Local Hardhat node (demo) or Sepolia testnet |

## Project structure

```
bce-vote/
├── contracts/Voting.sol        # the smart contract (core of the project)
├── test/Voting.test.js         # Hardhat tests
├── scripts/deploy.js           # deploy script
├── scripts/seed.js             # adds sample candidates for a demo
├── hardhat.config.js
├── .env.example                # copy to .env for deployment keys
└── frontend/                   # React app
    ├── src/App.jsx
    ├── src/components/         # ConnectWallet, Ballot, Results, AdminPanel
    ├── src/demoAccounts.js     # local node test accounts for Demo Mode
    └── src/contracts/Voting.json   # contract ABI
```

## Setup & run

### 1. Install dependencies (Node.js 18+ required)

```bash
npm install
cd frontend && npm install && cd ..
```

### 2. Compile the contract & run the tests

```bash
npm run compile
npm test
```

### 3. Run a local blockchain + deploy

Terminal 1 — start a local Hardhat node:

```bash
npm run node
```

Terminal 2 — deploy the contract to it:

```bash
npm run deploy:local
```

Copy the printed contract address into `frontend/.env`:

```bash
cd frontend
cp .env.example .env
# edit .env and set VITE_CONTRACT_ADDRESS=<the address printed above>
```

Optionally add two sample candidates to the ballot:

```bash
$env:CONTRACT_ADDRESS = "<the address printed above>"; npx hardhat run scripts/seed.js --network localhost
```

### 4. Run the frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

### 5. Connect a wallet

**Option A — MetaMask.** Install the extension, add the `Localhost 8545` network (Chain ID `31337`, RPC `http://127.0.0.1:8545`), and import one of the Hardhat node's test accounts (it prints 20 private keys; account #0 is the admin who deployed the contract).

**Option B — Demo Mode (no extension needed).** On the connect screen, just pick one of the 20 test accounts from the dropdown and click **Enter Demo Mode**. The app connects directly to `http://127.0.0.1:8545` and signs with that account's well-known test key — handy when you can't install MetaMask (college lab PC, restricted browser, etc.).

> ⚠️ Demo Mode only works on your **local** node — those private keys are publicly known and must never be used on a real network.

### 6. Demo flow
2. Connect the wallet (MetaMask or Demo Mode) → you should see the **Election Officer** badge when using account #0.
3. In the **Election Officer Panel**: add a couple of candidates, register some voter addresses, and set the election window around the current time. *(Or just run `scripts/seed.js` for sample candidates.)*
4. Switch to a registered voter account — in Demo Mode that means picking a different account from the dropdown and connecting again — then **Cast Your Vote**. You get a VVPAT-style receipt with the transaction hash and your secret salt.
5. Switch back to the admin, **End Election & Declare Results** → counting opens.
6. Switch back to each voter wallet and click **Reveal My Vote** (the salt was saved in the browser per-account, so it's automatic). The contract verifies the hash and the votes appear in the results table.
7. Try voting twice from the same wallet — the contract rejects it.

### Deploying to Sepolia (optional)

1. Put `PRIVATE_KEY` and `SEPOLIA_RPC_URL` in your `.env` (see `.env.example`). Get test ETH from a Sepolia faucet.
2. Set `START_TIME`/`END_TIME` (unix seconds) if you want a specific election window, then:

```bash
npm run deploy:sepolia
```

3. Use the deployed address in `frontend/.env` and connect MetaMask to Sepolia.

## How the smart contract works (quick walkthrough)

- `registerVoter(address)` — admin adds a wallet to the electoral roll (`mapping(address => bool) isRegistered`).
- `addCandidate(name, partySymbol)` — admin adds candidates to the ballot.
- `vote(candidateId, salt)` — commit phase. Checks in order: registered? → not voted yet? → election window open? → candidate id valid? → salt not empty? Then stores `commitments[msg.sender] = keccak256(candidateId, salt)` and sets `hasVoted`. The candidate id is **never stored or emitted**.
- `reveal(candidateId, salt)` — counting phase, only after the election ends. Re-hashes the pair and counts the vote only if it matches the stored commitment. Emits a `VoteRevealed` event.
- `endElection()` — admin ends the election; `getResults()` only works after this.
- All admin actions are guarded by an `onlyAdmin` modifier.

## Who can do what (access control)

Security here has **two layers**:

1. **UI layer** — the Election Officer Panel only renders when the connected wallet equals `contract.admin()`. A normal voter never sees the admin tools.
2. **Contract layer (the real one)** — never trust the frontend! Every admin function (`addCandidate`, `registerVoter`, `setElectionWindow`, `endElection`) is guarded by an `onlyAdmin` modifier that runs `require(msg.sender == admin, ...)`. Even if someone bypasses the UI and sends the transaction directly to the contract, the chain rejects it — this was verified in the test suite ("rejects adding a candidate by a non-admin").

So a non-admin cannot break into the admin page *or* perform admin actions any other way; the blockchain itself enforces who is authorized, because authority comes from holding the admin wallet's private key, not from the website.

## Privacy design choice

Voting uses a **commit-and-reveal scheme** (a standard intro-crypto pattern):

1. When you vote, the contract stores only `keccak256(candidateId, salt)` where `salt` is a random 32-byte value your browser generates. Because of the random salt, nobody can brute-force the hash and read your choice from the blockchain.
2. The `VoteCast` event logs only *which wallet* voted, not who they voted for.
3. After the election ends, you reveal `(candidateId, salt)`; the contract re-hashes, verifies, and counts.

Keep your salt safe (the frontend saves it in `localStorage` and prints it on the VVPAT slip) — without it, your vote cannot be revealed or counted.

That said, this is **pseudonymous, not fully anonymous**: at counting time the revealed choice is public, and it's tied to a wallet address, not a real identity. A real system would need cryptographic anonymity (zk-proofs / ring signatures), which is beyond this project.

## Limitations

Honest list — worth mentioning in a viva:

- **No real identity verification.** Anyone with a wallet address can be registered by the admin. A real election would need Aadhaar / e-KYC style verification to prove "one person = one vote".
- **Pseudonymous, not anonymous.** Votes are hidden until counting (salted hash), but at reveal time the choice is public and linked to a wallet address.
- **Lost salt = lost vote.** If a voter loses their salt (clears browser data), their vote is committed but can never be revealed or counted. This is the classic trade-off of commit-reveal schemes.
- **Demo Mode keys are public.** The extension-free Demo Mode signs with Hardhat's well-known test private keys — fine on a local node, catastrophic anywhere else. It is hardcoded to `http://127.0.0.1:8545` so it cannot accidentally hit a real network.
- **Not audited.** The contract follows standard patterns (require checks, checks-effects-interactions) but has not been professionally audited.
- **Admin trust.** The admin (Election Officer) is fully trusted — they can register arbitrary voters, move the election window, and end the election early.
- **Gas costs.** Every vote is a transaction that costs gas, which real-world elections would need to handle differently.
- **Built for learning/demo only.** Do not use this for any real or legally binding election.

## License

MIT — see [LICENSE](LICENSE).