// ConnectWallet.jsx — two ways to get a signer:
//
//  1. MetaMask  — the normal browser-wallet flow (window.ethereum).
//  2. Demo Mode — no extension needed. We connect straight to the
//                 local Hardhat node and sign with its well-known test
//                 accounts, picked from a dropdown. Handy when you
//                 cannot install/use MetaMask (college lab PC etc.).
//
// This component only knows how to connect; everything else lives in
// App.jsx.

import { useState } from "react";
import { ethers } from "ethers";
import DEMO_ACCOUNTS from "../demoAccounts";

// The local node that `npm run node` starts. Demo Mode talks to it.
const LOCAL_RPC_URL = "http://127.0.0.1:8545";

export default function ConnectWallet({ onConnected }) {
  const [connecting, setConnecting] = useState("");
  const [error, setError] = useState("");
  const [demoIndex, setDemoIndex] = useState(0);

  // --- Path 1: MetaMask ---------------------------------------------
  async function connectMetaMask() {
    setError("");
    setConnecting("metamask");
    try {
      // window.ethereum is injected by the MetaMask browser extension.
      if (!window.ethereum) {
        throw new Error(
          "MetaMask not found in this browser — use Demo Mode below instead"
        );
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      // Ask the user to approve the connection in the MetaMask popup.
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();

      onConnected(provider, signer, account, "metamask");
    } catch (err) {
      setError(err.reason || err.message || "Could not connect");
    } finally {
      setConnecting("");
    }
  }

  // --- Path 2: Demo Mode (no MetaMask) ------------------------------
  async function connectDemoMode() {
    setError("");
    setConnecting("demo");
    try {
      const chosen = DEMO_ACCOUNTS[demoIndex];

      // Plain JSON-RPC provider for the local node + a Wallet built
      // from the test account's private key. Same signer interface as
      // MetaMask, so the rest of the app works unchanged.
      const provider = new ethers.JsonRpcProvider(LOCAL_RPC_URL);
      const signer = new ethers.Wallet(chosen.privateKey, provider);
      const account = await signer.getAddress();

      onConnected(provider, signer, account, "demo");
    } catch (err) {
      setError(err.reason || err.message || "Demo mode failed");
    } finally {
      setConnecting("");
    }
  }

  return (
    <div>
      {/* MetaMask path */}
      <button
        onClick={connectMetaMask}
        disabled={connecting !== ""}
        className="rounded bg-navy px-6 py-3 font-semibold text-white shadow hover:bg-blue-900 disabled:opacity-50"
      >
        {connecting === "metamask" ? "Connecting…" : "Connect MetaMask"}
      </button>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
        <span className="h-px flex-1 bg-gray-300" />
        OR
        <span className="h-px flex-1 bg-gray-300" />
      </div>

      {/* Demo mode path */}
      <div className="mx-auto max-w-sm rounded border border-dashed border-indiagreen bg-green-50 p-4">
        <p className="text-sm font-semibold text-indiagreen">Demo Mode (no MetaMask)</p>
        <p className="mt-1 text-xs text-gray-600">
          Pick one of the local node&apos;s 20 test accounts and sign votes
          directly. <b>Account #0 (ADMIN)</b> is the Election Officer who
          deployed the contract — use it to add candidates and register
          voters.
        </p>

        <select
          value={demoIndex}
          onChange={(e) => setDemoIndex(Number(e.target.value))}
          disabled={connecting !== ""}
          className="mt-3 w-full rounded border border-gray-300 px-2 py-2 font-mono text-xs focus:border-navy focus:outline-none"
        >
          {DEMO_ACCOUNTS.map((acc, i) => (
            <option key={i} value={i}>
              {acc.label}
              {i === 0 ? " (ADMIN)" : ""} — {acc.address.slice(0, 6)}…
              {acc.address.slice(-4)}
            </option>
          ))}
        </select>

        <button
          onClick={connectDemoMode}
          disabled={connecting !== ""}
          className="mt-3 w-full rounded bg-indiagreen px-4 py-2 text-sm font-semibold text-white shadow hover:bg-green-800 disabled:opacity-50"
        >
          {connecting === "demo" ? "Connecting…" : "Enter Demo Mode"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 p-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}