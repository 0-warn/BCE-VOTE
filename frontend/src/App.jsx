// App.jsx — the main screen. Owns the wallet connection and all the
// contract data, then passes it down to the smaller components.
// No state management library — just useState/useEffect, which is
// plenty for a project this size.

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import ConnectWallet from "./components/ConnectWallet";
import Ballot from "./components/Ballot";
import Results from "./components/Results";
import AdminPanel from "./components/AdminPanel";
import VotingABI from "./contracts/Voting.json";

// Contract address comes from the frontend/.env file (VITE_CONTRACT_ADDRESS).
// Copy it from the deploy script output.
const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || "";

export default function App() {
  const [account, setAccount] = useState("");
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  // "metamask" or "demo" — demo mode signs with local test accounts.
  const [mode, setMode] = useState("");
  // Little feedback flag for the copy-address button.
  const [copied, setCopied] = useState(false);

  const [candidates, setCandidates] = useState([]);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [electionEnded, setElectionEnded] = useState(false);
  const [electionStart, setElectionStart] = useState(0);
  const [electionEnd, setElectionEnd] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Called by ConnectWallet once we have a signer (MetaMask or demo).
  function handleConnected(provider, signer, account, mode) {
    setAccount(account);
    setSigner(signer);
    setMode(mode);
    setContract(new ethers.Contract(CONTRACT_ADDRESS, VotingABI, signer));
  }

  // Reads everything we need from the contract in one go.
  // `silent` = background refresh (10s poll / after an action) — it does
  // NOT touch the loading flag, otherwise the whole page would unmount
  // every 10 seconds and wipe whatever the user is typing into forms.
  async function loadData(silent = false) {
    if (!contract || !account) return;
    if (!silent) setLoading(true);
    try {
      const [count, voted, revealed, regd, admin, ended, start, end] = await Promise.all([
        contract.candidateCount(),
        contract.hasVoted(account),
        contract.hasRevealed(account),
        contract.isRegistered(account),
        contract.admin(),
        contract.electionEnded(),
        contract.electionStartTime(),
        contract.electionEndTime(),
      ]);

      // Loop over the candidates (small list, so a loop is fine).
      const cands = [];
      for (let i = 0; i < count; i++) {
        cands.push(await contract.candidates(i));
      }

      setCandidates(cands);
      setHasVoted(voted);
      setHasRevealed(revealed);
      setIsRegistered(regd);
      setIsAdmin(admin.toLowerCase() === account.toLowerCase());
      setElectionEnded(ended);
      setElectionStart(Number(start));
      setElectionEnd(Number(end));
      if (!silent) setLoadError("");
    } catch (err) {
      console.error(err);
      // Silent polls keep the old data on screen instead of erroring out.
      if (!silent) {
        setLoadError(err.reason || err.message || "Could not load contract data");
      }
    } finally {
      if (!silent) setLoading(false);
    }
  }

  // Silent refresh for the poll timer and after-actions.
  const refreshData = () => loadData(true);

  // Full load whenever the wallet or the contract changes.
  useEffect(() => {
    loadData();
  }, [contract, account]);

  // Poll every 10 seconds so the "election open/closed" state stays
  // fresh even if we just leave the tab open.
  useEffect(() => {
    const id = setInterval(refreshData, 10000);
    return () => clearInterval(id);
  }, [contract, account]);

  const now = Math.floor(Date.now() / 1000);
  const electionOpen = !electionEnded && now >= electionStart && now <= electionEnd;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Tricolor flag strip across the top */}
      <div className="flex h-3">
        <div className="flex-1 bg-saffron" />
        <div className="flex-1 bg-white" />
        <div className="flex-1 bg-indiagreen" />
      </div>

      <header className="bg-navy text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold">Bhārat Secure Vote</h1>
            <p className="text-sm text-blue-100">
              A decentralized mock-election demo on the blockchain
            </p>
          </div>
          {account && (
            <div className="text-right text-xs">
              {/* Click to copy — handy when registering this wallet as a voter */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(account);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                title="Click to copy full address"
                className="font-mono underline decoration-dotted"
              >
                {copied ? "copied!" : `${account.slice(0, 6)}…${account.slice(-4)}`}
              </button>
              {isAdmin && (
                <p className="mt-1 rounded bg-saffron px-2 py-0.5 font-semibold text-navy">
                  Election Officer
                </p>
              )}
              {mode === "demo" && (
                <p className="mt-1 rounded bg-indiagreen px-2 py-0.5 font-semibold text-white">
                  Demo Mode
                </p>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {!CONTRACT_ADDRESS && (
          <div className="mb-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
            Contract address not set. Copy <code className="font-mono">frontend/.env.example</code> to{" "}
            <code className="font-mono">frontend/.env</code> and put your deployed contract address in{" "}
            <code className="font-mono">VITE_CONTRACT_ADDRESS</code>, then restart Vite.
          </div>
        )}

        {!account ? (
          <div className="mx-auto max-w-md py-16 text-center">
            <h2 className="mb-2 text-xl font-semibold">Connect your wallet to vote</h2>
            <p className="mb-6 text-sm text-gray-600">
              Connect with the MetaMask browser extension, or use Demo Mode to
              sign with the local node&apos;s test accounts — no extension
              needed. Make sure the app is pointed at the network where the
              contract was deployed (local Hardhat node or Sepolia).
            </p>
            <ConnectWallet onConnected={handleConnected} />
          </div>
        ) : (
          <div className="space-y-8">
            {loadError && (
              <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                {loadError}
              </div>
            )}

            {loading ? (
              <p className="py-8 text-center text-gray-500">Loading election data…</p>
            ) : (
              <>
                {isAdmin ? (
                  // The Election Officer manages the election but does
                  // not vote — the ballot only makes sense for voters.
                  <div className="rounded-lg bg-white p-6 text-center shadow">
                    <h2 className="text-xl font-bold">Election Officer Mode</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      You are connected as the admin, so there is no ballot for
                      this wallet. Use the panel below to register voters, add
                      candidates and run the election. To test voting, switch
                      to a voter account (Demo Mode accounts #1–#19).
                    </p>
                  </div>
                ) : (
                  <Ballot
                    contract={contract}
                    candidates={candidates}
                    hasVoted={hasVoted}
                    hasRevealed={hasRevealed}
                    isRegistered={isRegistered}
                    electionOpen={electionOpen}
                    electionEnded={electionEnded}
                    account={account}
                    onReload={refreshData}
                  />
                )}

                {isAdmin && (
                  <AdminPanel
                    contract={contract}
                    candidates={candidates}
                    onDone={refreshData}
                  />
                )}

                <Results contract={contract} electionEnded={electionEnded} />
              </>
            )}
          </div>
        )}
      </main>

      <footer className="border-t bg-white py-4 text-center text-xs text-gray-500">
        Built for a college blockchain project · For learning/demo purposes only, not for real elections
      </footer>
    </div>
  );
}