// Ballot.jsx — lists the candidates and handles the two-phase
// commit-reveal voting:
//
//  1. VOTE   — the voter selects exactly ONE candidate (radio-style),
//              then presses the single Cast button. The frontend
//              generates a random 32-byte salt, sends
//              vote(candidateId, salt), and the contract stores only
//              keccak256(candidateId, salt). Nobody can see the choice.
//              The salt is saved in localStorage (and printed on the
//              VVPAT slip) because the voter needs it later to reveal.
//  2. REVEAL — after the election ends, the voter sends
//              reveal(candidateId, salt). The contract re-hashes the
//              pair, verifies it matches the stored commitment, and
//              only then counts the vote.

import { useState } from "react";
import { ethers } from "ethers";

// The voter's secret (candidateId + salt + tx hash) is kept in
// localStorage so it survives a page refresh.
function savedVoteKey(account) {
  return `bharat-vote-${account}`;
}

function loadSavedVote(account) {
  try {
    return JSON.parse(localStorage.getItem(savedVoteKey(account)));
  } catch {
    return null;
  }
}

export default function Ballot({
  contract,
  candidates,
  hasVoted,
  hasRevealed,
  isRegistered,
  electionOpen,
  electionEnded,
  account,
  onReload,
}) {
  const [selectedId, setSelectedId] = useState(null); // one selection only
  const [voting, setVoting] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);

  const savedVote = loadSavedVote(account);

  // The candidate whose circle is ticked right now. Careful: nothing
  // selected must stay null — Number(null) is 0, which would wrongly
  // match candidate #0!
  const selectedCandidate =
    selectedId === null
      ? undefined
      : candidates.find((c) => Number(c.id) === Number(selectedId));

  async function castVote() {
    if (selectedId === null) return;
    setError("");
    setReceipt(null);
    setVoting(true);
    try {
      // Random 32-byte salt — this is what keeps the hash unreadable.
      const salt = ethers.randomBytes(32);
      const tx = await contract.vote(selectedId, salt);
      const receipt = await tx.wait();

      // Keep the secret locally so we can reveal after the election.
      const secret = {
        candidateId: Number(selectedId),
        salt: ethers.hexlify(salt),
        txHash: receipt.hash,
      };
      localStorage.setItem(savedVoteKey(account), JSON.stringify(secret));

      setReceipt(secret);
      onReload();
    } catch (err) {
      setError(err.reason || err.message || "Vote failed");
    } finally {
      setVoting(false);
    }
  }

  async function revealVote() {
    setError("");
    setRevealing(true);
    try {
      if (!savedVote) throw new Error("No saved vote found for this wallet");
      await contract.reveal(savedVote.candidateId, savedVote.salt);
      onReload();
    } catch (err) {
      setError(err.reason || err.message || "Reveal failed");
    } finally {
      setRevealing(false);
    }
  }

  // --- Confirmation screen (VVPAT-style slip) -----------------------
  if (receipt) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-bold text-indiagreen">Your vote has been recorded!</h2>
        <p className="mt-1 text-sm text-gray-600">
          Your choice is hidden on the blockchain — only a salted hash was stored.
          Keep this slip safe: you will need the <b>salt</b> to reveal and count
          your vote after the election ends.
        </p>

        {/* The slip itself, printed-look with a dashed border */}
        <div className="mt-4 rounded border-2 border-dashed border-gray-400 bg-gray-50 p-4 font-mono text-xs">
          <p className="mb-2 border-b border-dashed border-gray-400 pb-2 font-bold tracking-widest">
            VVPAT · VOTER VERIFIABLE PAPER AUDIT TRAIL
          </p>
          <p className="text-gray-500">Voter address</p>
          <p className="break-all">{account}</p>
          <p className="mt-2 text-gray-500">Transaction hash</p>
          <p className="break-all text-navy">{receipt.txHash}</p>
          <p className="mt-2 text-gray-500">Secret salt (keep it private)</p>
          <p className="break-all">{receipt.salt}</p>
        </div>

        <button
          onClick={() => {
            setReceipt(null);
            onReload();
          }}
          className="mt-4 rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
        >
          Done
        </button>
      </div>
    );
  }

  // --- Reveal step (after the election ends) ------------------------
  if (hasVoted && electionEnded) {
    if (hasRevealed) {
      return (
        <div className="rounded-lg bg-white p-6 text-center shadow">
          <h2 className="text-xl font-bold text-indiagreen">Vote revealed &amp; counted</h2>
          <p className="mt-1 text-sm text-gray-600">
            Your vote has been revealed and counted in the results below.
          </p>
        </div>
      );
    }

    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Counting time</h2>
        <p className="mt-1 text-sm text-gray-600">
          The election is over. Reveal your vote so it gets counted — the
          contract will verify the hash against your stored commitment.
        </p>

        {!savedVote && (
          <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            No saved vote found for this wallet in this browser. If you voted
            from a different browser or cleared your data, you can reveal
            manually with the salt from your VVPAT slip.
          </p>
        )}

        <button
          onClick={revealVote}
          disabled={revealing}
          className="mt-4 rounded bg-indiagreen px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-800 disabled:opacity-50"
        >
          {revealing ? "Revealing…" : "Reveal My Vote"}
        </button>
      </div>
    );
  }

  // --- Already voted, election still running -------------------------
  if (hasVoted) {
    return (
      <div className="rounded-lg bg-white p-6 text-center shadow">
        <h2 className="text-xl font-bold text-indiagreen">Vote already cast</h2>
        <p className="mt-1 text-sm text-gray-600">
          This wallet has already voted. One wallet = one vote, so you cannot
          vote again. Your vote stays hidden until counting starts.
        </p>
      </div>
    );
  }

  // --- Election not open --------------------------------------------
  if (!electionOpen) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Ballot</h2>
        <p className="mt-2 text-sm text-gray-600">
          {electionEnded
            ? "The election has ended. Results are available below."
            : "Voting is not open right now. Wait for the election window to open."}
        </p>
      </div>
    );
  }

  // --- Not on the electoral roll --------------------------------------
  // The contract rejects votes from unregistered wallets, so instead of
  // letting them find out via an error, tell them upfront what to do.
  if (!isRegistered) {
    return (
      <div className="rounded-lg bg-white p-6 text-center shadow">
        <h2 className="text-xl font-bold">You are not registered to vote</h2>
        <p className="mt-2 text-sm text-gray-600">
          Only voters added to the electoral roll by the Election Officer can
          cast a vote — this is enforced by the smart contract itself.
        </p>
        <ol className="mx-auto mt-3 max-w-md list-decimal space-y-1 text-left text-sm text-gray-600">
          <li>
            Click your address <b>{account.slice(0, 6)}…{account.slice(-4)}</b> in
            the header to copy it.
          </li>
          <li>Ask the Election Officer to register it in the panel.</li>
          <li>This page updates automatically within a few seconds.</li>
        </ol>
      </div>
    );
  }

  // --- Ballot: select ONE candidate, then cast -----------------------
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-bold">Ballot</h2>
      <p className="mt-1 text-sm text-gray-600">
        Select <b>one</b> candidate. You can change your choice until you press
        the Cast button — after that it is locked forever (blockchain!).
      </p>

      <div className="mt-4 space-y-3">
        {candidates.map((candidate) => {
          // Same null-guard here: without it, Number(null) === 0 would
          // tick the first candidate before the user clicks anything.
          const isSelected =
            selectedId !== null && Number(candidate.id) === Number(selectedId);
          return (
            <label
              key={Number(candidate.id)}
              className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 p-4 transition ${
                isSelected
                  ? "border-indiagreen bg-green-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              {/* Radio indicator — only one can be ticked */}
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                  isSelected ? "border-indiagreen" : "border-gray-400"
                }`}
              >
                {isSelected && <span className="h-2.5 w-2.5 rounded-full bg-indiagreen" />}
              </span>

              {/* Party logo circle — the admin types a symbol/emoji as
                  the partySymbol (e.g. 🪷 lotus). Falls back to the
                  first letter of the name when empty. */}
              <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-saffron text-2xl font-bold text-white">
                {candidate.partySymbol || candidate.name.charAt(0).toUpperCase()}
              </span>

              <input
                type="radio"
                name="candidate"
                className="hidden"
                checked={isSelected}
                onChange={() => setSelectedId(candidate.id)}
              />

              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{candidate.name}</span>
                <span className="block truncate text-sm text-gray-500">
                  {candidate.partySymbol}
                </span>
                {/* Note: the candidate's wallet address is deliberately
                    NOT shown here — that is admin-only info. Voters only
                    see name, party and logo. */}
              </span>
            </label>
          );
        })}
      </div>

      {/* The single Cast button */}
      <button
        onClick={castVote}
        disabled={voting || selectedId === null}
        className="mt-5 w-full rounded bg-indiagreen px-6 py-3 text-base font-bold text-white shadow hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {voting
          ? "Casting your vote…"
          : selectedCandidate
            ? `Cast Your Vote for ${selectedCandidate.name}`
            : "Select a candidate to vote"}
      </button>

      {error && (
        <p className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}