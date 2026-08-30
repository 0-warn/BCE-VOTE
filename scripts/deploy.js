// Deploy script for the Voting contract.
//
//   npx hardhat run scripts/deploy.js --network localhost
//   npx hardhat run scripts/deploy.js --network sepolia
//
// The election window comes from START_TIME / END_TIME env vars (unix
// seconds). If they are not set, the window defaults to "now" -> "now
// + 1 hour" so a local demo works immediately.

const hre = require("hardhat");

async function main() {
  const now = Math.floor(Date.now() / 1000);

  const startTime = parseInt(process.env.START_TIME || "0", 10) || now;
  const endTime = parseInt(process.env.END_TIME || "0", 10) || now + 60 * 60;

  const Voting = await hre.ethers.getContractFactory("Voting");
  const voting = await Voting.deploy(startTime, endTime);
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  const admin = await voting.admin();

  console.log(`Voting contract deployed to: ${address}`);
  console.log(`Admin (Election Officer): ${admin}`);
  console.log(
    `Election window: ${new Date(startTime * 1000).toISOString()} -> ${new Date(
      endTime * 1000
    ).toISOString()}`
  );
  console.log("");
  console.log("Next steps:");
  console.log(`  1. Copy the address above into frontend/.env as VITE_CONTRACT_ADDRESS`);
  console.log("  2. npx hardhat console --network localhost  (or use the frontend)");
  console.log("  3. Register some voters and add candidates from the Admin panel");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});