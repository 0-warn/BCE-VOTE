// AdminPanel.jsx — the Election Officer's tools. Only rendered when the
// connected wallet is the admin (checked in App.jsx). Lets the admin
// register voters, add candidates, move the election window, and end
// the election.

import { useState } from "react";
import { ethers } from "ethers";
import DEMO_ACCOUNTS from "../demoAccounts";

export default function AdminPanel({ contract, candidates, onDone }) {
  const [voterAddress, setVoterAddress] = useState("");
  const [candidateName, setCandidateName] = useState("");
  const [partySymbol, setPartySymbol] = useState("");
  const [candidateAddress, setCandidateAddress] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  // For reviewing what was entered.
  const [showCandidates, setShowCandidates] = useState(false);
  const [checkAddress, setCheckAddress] = useState("");
  const [checkResult, setCheckResult] = useState("");
  // Candidate lookup by wallet address (admin-only in the contract).
  const [lookupAddress, setLookupAddress] = useState("");
  const [lookupResult, setLookupResult] = useState(null);

  // The contract stores voters in a mapping, which cannot be listed,
  // so we check one address at a time instead. Validate first — a
  // non-address string would make ethers try an ENS lookup, which this
  // local network does not support.
  async function checkVoter() {
    if (!ethers.isAddress(checkAddress)) {
      setCheckResult("Enter a valid 0x… Ethereum address");
      return;
    }
    setCheckResult("checking…");
    try {
      const registered = await contract.isRegistered(ethers.getAddress(checkAddress));
      setCheckResult(
        registered
          ? "✅ This address IS registered"
          : "❌ Not registered yet"
      );
    } catch (err) {
      setCheckResult(err.reason || err.message || "Check failed");
    }
  }

  // Same validation for the candidate lookup.
  async function findCandidate() {
    if (!ethers.isAddress(lookupAddress)) {
      setLookupResult("Enter a valid 0x… Ethereum address");
      return;
    }
    setLookupResult("searching…");
    try {
      const found = await contract.getCandidateByAddress(ethers.getAddress(lookupAddress));
      setLookupResult(
        `Found: ${found.name} · symbol "${found.partySymbol}" · ${Number(
          found.voteCount
        )} vote(s)`
      );
    } catch (err) {
      setLookupResult(err.reason || err.message || "Lookup failed");
    }
  }

  function flash(type, text) {
    setMessage({ type, text });
    // Clear the message after a few seconds so it doesn't linger.
    setTimeout(() => setMessage({ type: "", text: "" }), 6000);
  }

  async function run(label, action) {
    setBusy(label);
    setMessage({ type: "", text: "" });
    try {
      await action();
      flash("ok", `${label} done`);
      onDone();
    } catch (err) {
      flash("err", err.reason || err.message || `${label} failed`);
    } finally {
      setBusy("");
    }
  }

  const inputClass =
    "w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-navy focus:outline-none";

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-bold">Election Officer Panel</h2>
      <p className="mt-1 text-sm text-gray-600">
        Register voters, add candidates, manage the election window.
      </p>
      <p className="mt-2 rounded bg-blue-50 p-2 text-xs text-navy">
        🔒 Access control is enforced by the smart contract itself: even if
        someone opens this page from another wallet, every transaction they
        send gets reverted with &quot;Only the Election Officer can do this&quot;.
      </p>

      {message.text && (
        <p
          className={`mt-3 rounded p-2 text-sm ${
            message.type === "ok"
              ? "bg-green-50 text-indiagreen"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        {/* Register voter */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Register a voter</h3>
          {/* Quick-pick fills the box with a local test account's full
              address — in Demo Mode the voter can also just click their
              address in the header to copy it. */}
          <select
            onChange={(e) => setVoterAddress(e.target.value)}
            value=""
            className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-xs text-gray-600 focus:border-navy focus:outline-none"
          >
            <option value="">Quick pick (local test accounts)…</option>
            {DEMO_ACCOUNTS.slice(1).map((acc, i) => (
              <option key={i} value={acc.address}>
                {acc.label} — {acc.address}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={voterAddress}
              onChange={(e) => setVoterAddress(e.target.value)}
              placeholder="0x… voter wallet address"
              className={inputClass}
            />
            <button
              onClick={() =>
                run("Register voter", async () => {
                  if (!ethers.isAddress(voterAddress)) {
                    throw new Error("Enter a valid 0x… Ethereum address");
                  }
                  await contract.registerVoter(ethers.getAddress(voterAddress));
                  setVoterAddress("");
                })
              }
              disabled={busy !== "" || !voterAddress}
              className="shrink-0 rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {busy === "Register voter" ? "…" : "Register"}
            </button>
          </div>
        </div>

        {/* Add candidate */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">Add a candidate</h3>
          {/* Quick-pick a local test wallet to represent the candidate. */}
          <select
            onChange={(e) => setCandidateAddress(e.target.value)}
            value=""
            className="mb-2 w-full rounded border border-gray-300 px-3 py-2 text-xs text-gray-600 focus:border-navy focus:outline-none"
          >
            <option value="">Quick pick candidate wallet…</option>
            {DEMO_ACCOUNTS.slice(8).map((acc, i) => (
              <option key={i} value={acc.address}>
                {acc.label} — {acc.address}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={candidateName}
              onChange={(e) => setCandidateName(e.target.value)}
              placeholder="Candidate name"
              className={inputClass}
            />
            <input
              value={partySymbol}
              onChange={(e) => setPartySymbol(e.target.value)}
              placeholder="Party / symbol"
              className={inputClass}
            />
          </div>
          <div className="mt-2 flex gap-2">
            <input
              value={candidateAddress}
              onChange={(e) => setCandidateAddress(e.target.value)}
              placeholder="0x… candidate wallet address"
              className={inputClass}
            />
            <button
              onClick={() =>
                run("Add candidate", async () => {
                  if (!ethers.isAddress(candidateAddress)) {
                    throw new Error("Candidate wallet must be a valid 0x… address");
                  }
                  await contract.addCandidate(
                    candidateName,
                    partySymbol,
                    ethers.getAddress(candidateAddress)
                  );
                  setCandidateName("");
                  setPartySymbol("");
                  setCandidateAddress("");
                })
              }
              disabled={busy !== "" || !candidateName || !partySymbol || !candidateAddress}
              className="shrink-0 rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {busy === "Add candidate" ? "…" : "Add"}
            </button>
          </div>
        </div>

        {/* Election window */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">
            Election window (local time)
          </h3>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
            <input
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
            <button
              onClick={() =>
                run("Set window", () =>
                  contract.setElectionWindow(
                    Math.floor(new Date(startTime).getTime() / 1000),
                    Math.floor(new Date(endTime).getTime() / 1000)
                  )
                )
              }
              disabled={busy !== "" || !startTime || !endTime}
              className="shrink-0 rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
            >
              {busy === "Set window" ? "…" : "Set"}
            </button>
          </div>
        </div>

        {/* End election */}
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-500">End the election</h3>
          <p className="mb-2 text-xs text-gray-500">
            Ends voting and unlocks the results page for everyone.
          </p>
          <button
            onClick={() =>
              run("End election", () => contract.endElection())
            }
            disabled={busy !== ""}
            className="rounded bg-saffron px-4 py-2 text-sm font-bold text-navy hover:opacity-90 disabled:opacity-50"
          >
            {busy === "End election" ? "Ending…" : "End Election & Declare Results"}
          </button>
        </div>
      </div>

      {/* Review what was entered — so typos can be spotted before the
          election starts. Candidates come from App's live data. */}
      <div className="mt-6 border-t pt-4">
        <button
          onClick={() => setShowCandidates(!showCandidates)}
          className="rounded border border-navy px-4 py-2 text-sm font-semibold text-navy hover:bg-blue-50"
        >
          {showCandidates ? "Hide entered candidates" : "View entered candidates"}
        </button>

        {showCandidates && (
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-gray-500">
                <th className="py-2 pr-4">#</th>
                <th className="py-2 pr-4">Symbol</th>
                <th className="py-2 pr-4">Candidate (Party)</th>
                <th className="py-2">Wallet address</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={Number(c.id)} className="border-b border-gray-100">
                  <td className="py-2 pr-4">{Number(c.id)}</td>
                  <td className="py-2 pr-4 text-xl">{c.partySymbol}</td>
                  <td className="py-2 pr-4">{c.name}</td>
                  <td className="py-2 font-mono text-xs" title={c.candidateAddress}>
                    {c.candidateAddress.slice(0, 6)}…{c.candidateAddress.slice(-4)}
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr>
                  <td colSpan="4" className="py-2 text-gray-500">
                    No candidates added yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Candidate lookup by wallet address — the contract only lets
            the admin call this. */}
        <h3 className="mb-2 mt-5 text-sm font-semibold text-gray-500">
          Find candidate details by address
        </h3>
        <div className="flex gap-2">
          <input
            value={lookupAddress}
            onChange={(e) => setLookupAddress(e.target.value)}
            placeholder="0x… candidate wallet address"
            className={inputClass}
          />
          <button
            onClick={findCandidate}
            disabled={!lookupAddress}
            className="shrink-0 rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
          >
            Find
          </button>
        </div>
        {lookupResult && (
          <p className="mt-2 rounded bg-gray-50 p-2 text-sm">{lookupResult}</p>
        )}

        {/* Voter registration check (mappings can't be listed, so we
            verify one address at a time). */}
        <h3 className="mb-2 mt-5 text-sm font-semibold text-gray-500">
          Check if a voter is registered
        </h3>
        <div className="flex gap-2">
          <input
            value={checkAddress}
            onChange={(e) => setCheckAddress(e.target.value)}
            placeholder="0x… address to check"
            className={inputClass}
          />
          <button
            onClick={checkVoter}
            disabled={!checkAddress}
            className="shrink-0 rounded bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900 disabled:opacity-50"
          >
            Check
          </button>
        </div>
        {checkResult && (
          <p className="mt-2 rounded bg-gray-50 p-2 text-sm">{checkResult}</p>
        )}
      </div>
    </div>
  );
}