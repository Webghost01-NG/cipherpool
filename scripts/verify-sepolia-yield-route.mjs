import { ethers } from "ethers";

const CHAIN_ID = 11155111n;
const ZERO_ADDRESS = ethers.ZeroAddress;

// Zama-managed Sepolia deployments. Sources are recorded in
// docs/operations/reserve-funding.md and every relationship is re-read on-chain.
const addresses = {
  cUsdc: "0x7c5BF43B851c1dff1a4feE8dB225b87f2C223639",
  cVaultShare: "0x13F7d34A4f0102734F19E3Ff16e068Fe194B28c4",
  vault: "0x6AB54988261AEC573a2CA13cF802d3B1114f864C",
  underlying: "0x9b5Cd13b8eFbB58Dc25A05CF411D8056058aDFfF",
  depositBatcher: "0x48758559c14d4d92b4C74A99660B6a8dbe85F53b",
  redeemBatcher: "0xe94E9afdDd43a19C2914739e9279cb6Fe287BEb0",
};

const wrapperAbi = ["function underlying() view returns (address)", "function symbol() view returns (string)"];
const batcherAbi = [
  "function fromToken() view returns (address)",
  "function toToken() view returns (address)",
  "function vault() view returns (address)",
  "function paused() view returns (bool)",
];
const vaultAbi = [
  "function asset() view returns (address)",
  "function maxRate() view returns (uint64)",
  "function liquidityAdapter() view returns (address)",
  "function adaptersLength() view returns (uint256)",
  "function totalAssets() view returns (uint256)",
  "function totalSupply() view returns (uint256)",
];

function sameAddress(left, right) {
  return ethers.getAddress(left) === ethers.getAddress(right);
}

function assertAddress(actual, expected, label) {
  if (!sameAddress(actual, expected)) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

async function inspect() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  if (!rpcUrl) throw new Error("SEPOLIA_RPC_URL is required; credentials and RPC configuration stay outside the repository.");

  const provider = new ethers.JsonRpcProvider(rpcUrl, Number(CHAIN_ID), { staticNetwork: true });
  try {
    const network = await provider.getNetwork();
    if (network.chainId !== CHAIN_ID) throw new Error(`Expected Sepolia chain ${CHAIN_ID}, received ${network.chainId}.`);

    const cUsdc = new ethers.Contract(addresses.cUsdc, wrapperAbi, provider);
    const cVaultShare = new ethers.Contract(addresses.cVaultShare, wrapperAbi, provider);
    const vault = new ethers.Contract(addresses.vault, vaultAbi, provider);
    const depositBatcher = new ethers.Contract(addresses.depositBatcher, batcherAbi, provider);
    const redeemBatcher = new ethers.Contract(addresses.redeemBatcher, batcherAbi, provider);

    const [
      cUsdcUnderlying,
      cVaultShareUnderlying,
      cUsdcSymbol,
      cVaultShareSymbol,
      vaultAsset,
      maxRate,
      liquidityAdapter,
      adaptersLength,
      totalAssets,
      totalSupply,
      depositFrom,
      depositTo,
      depositVault,
      depositPaused,
      redeemFrom,
      redeemTo,
      redeemVault,
      redeemPaused,
    ] = await Promise.all([
      cUsdc.underlying(),
      cVaultShare.underlying(),
      cUsdc.symbol(),
      cVaultShare.symbol(),
      vault.asset(),
      vault.maxRate(),
      vault.liquidityAdapter(),
      vault.adaptersLength(),
      vault.totalAssets(),
      vault.totalSupply(),
      depositBatcher.fromToken(),
      depositBatcher.toToken(),
      depositBatcher.vault(),
      depositBatcher.paused(),
      redeemBatcher.fromToken(),
      redeemBatcher.toToken(),
      redeemBatcher.vault(),
      redeemBatcher.paused(),
    ]);

    assertAddress(cUsdcUnderlying, addresses.underlying, "cUSDC underlying");
    assertAddress(cVaultShareUnderlying, addresses.vault, "confidential vault-share underlying");
    assertAddress(vaultAsset, addresses.underlying, "vault asset");
    assertAddress(depositFrom, addresses.cUsdc, "deposit batcher source");
    assertAddress(depositTo, addresses.cVaultShare, "deposit batcher destination");
    assertAddress(depositVault, addresses.vault, "deposit batcher vault");
    assertAddress(redeemFrom, addresses.cVaultShare, "redeem batcher source");
    assertAddress(redeemTo, addresses.cUsdc, "redeem batcher destination");
    assertAddress(redeemVault, addresses.vault, "redeem batcher vault");

    const economicallyActive = maxRate > 0n && (adaptersLength > 0n || !sameAddress(liquidityAdapter, ZERO_ADDRESS));
    const report = {
      chainId: network.chainId.toString(),
      status: economicallyActive ? "compatible-and-active" : "compatible-but-passive",
      wrappers: { cUsdc: cUsdcSymbol, vaultShare: cVaultShareSymbol },
      batchers: { depositPaused, redeemPaused },
      vault: {
        maxRate: maxRate.toString(),
        liquidityAdapter,
        adaptersLength: adaptersLength.toString(),
        totalAssets: totalAssets.toString(),
        totalSupply: totalSupply.toString(),
      },
    };

    console.log(JSON.stringify(report, null, 2));
    if (process.argv.includes("--require-live-yield") && !economicallyActive) {
      throw new Error("The compatible Sepolia vault has no configured yield strategy; production-yield claims remain blocked.");
    }
  } finally {
    provider.destroy();
  }
}

const timeout = new Promise((_, reject) => {
  setTimeout(() => reject(new Error("Sepolia yield-route inspection timed out after 30 seconds.")), 30_000).unref();
});

Promise.race([inspect(), timeout]).catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
