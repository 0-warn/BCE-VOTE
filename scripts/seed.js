// Adds sample candidates so a fresh demo has something on the ballot.
// Safe to run more than once — it skips if candidates already exist.
//
//   npx hardhat run scripts/seed.js --network localhost

const hre = require("hardhat");

// The symbol field accepts any text/emoji — the frontend shows it as
// the party logo circle on the ballot (e.g. 🪷 lotus, 🪳, ✋ hand).
const SAMPLE_CANDIDATES = [
  ["Narendra Modi", "BJP", "🪷"],
  ["Arjun Pal", "CJP", "🪳"],
  ["Rahul Das", "Congress", "✋"],
];

async function main() {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address) {
    throw new Error("Set CONTRACT_ADDRESS=<deployed address> before running");
  }

  const voting = await hre.ethers.getContractAt("Voting", address);

  const existing = await voting.candidateCount();
  if (existing > 0n) {
    console.log(`Ballot already has ${existing} candidate(s), nothing to do.`);
    return;
  }

  // Give each candidate a representative wallet from the node's test
  // accounts (8/9/10 — away from the admin #0 and typical voters #1+).
  const signers = await hre.ethers.getSigners();
  const candidateWallets = [signers[8].address, signers[9].address, signers[10].address];

  for (let i = 0; i < SAMPLE_CANDIDATES.length; i++) {
    const [name, party, symbol] = SAMPLE_CANDIDATES[i];
    const wallet = candidateWallets[i];
    // Contract stores "Party Symbol" as one text field — we combine the
    // party name and its logo so the ballot shows both.
    const tx = await voting.addCandidate(`${name} (${party})`, symbol, wallet);
    await tx.wait();
    console.log(`Added candidate: ${name} (${party}) ${symbol} — wallet ${wallet}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});