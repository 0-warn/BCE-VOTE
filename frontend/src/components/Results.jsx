// Results.jsx — shows the vote counts, but only after the admin has
// ended the election (the contract itself enforces this by reverting
// getResults() while the election is still running).

import { useEffect, useState } from "react";

export default function Results({ contract, electionEnded }) {
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!contract || !electionEnded) {
      setResults(null);
      return;
    }
    contract
      .getResults()
      .then(setResults)
      .catch((err) => setError(err.reason || err.message || "Could not load results"));
  }, [contract, electionEnded]);

  if (!electionEnded) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Results</h2>
        <p className="mt-2 text-sm text-gray-600">
          Results are locked while the election is running. The Election Officer
          will declare them after the election ends.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Results</h2>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="text-xl font-bold">Results</h2>
        <p className="mt-2 text-sm text-gray-600">Loading…</p>
      </div>
    );
  }

  // Simple winner = highest vote count. Ties just show both as winners.
  const maxVotes = Math.max(...results.map((c) => Number(c.voteCount)));
  const winners = results
    .filter((c) => Number(c.voteCount) === maxVotes && maxVotes > 0)
    .map((c) => c.name);

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-xl font-bold">Results</h2>
      <p className="mt-1 text-sm text-gray-600">
        Votes are counted as voters reveal them — check back as more people
        reveal their votes.
      </p>
      {winners.length > 0 && (
        <p className="mt-1 text-sm font-semibold text-indiagreen">
          {winners.length > 1 ? "Tie between" : "Winner"} : {winners.join(" and ")}
        </p>
      )}

      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-gray-500">
            <th className="py-2 pr-4">#</th>
            <th className="py-2 pr-4">Symbol</th>
            <th className="py-2 pr-4">Candidate</th>
            <th className="py-2 text-right">Votes</th>
          </tr>
        </thead>
        <tbody>
          {results.map((candidate, index) => (
            <tr key={index} className="border-b border-gray-100">
              <td className="py-2 pr-4">{index + 1}</td>
              {/* Party symbol (emoji/text) set by the Election Officer */}
              <td className="py-2 pr-4 text-xl">{candidate.partySymbol}</td>
              <td className="py-2 pr-4 font-semibold">{candidate.name}</td>
              <td className="py-2 text-right font-semibold text-navy">
                {Number(candidate.voteCount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}