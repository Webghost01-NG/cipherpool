import {
  AbiCoder,
  BrowserProvider,
  Contract,
  FallbackProvider,
  JsonRpcProvider,
  ZeroHash,
  id,
  keccak256,
} from "ethers";

let cachedReadProvider: FallbackProvider | null = null;
let cachedReadProviderKey = "";

export function getSepoliaReadProvider(rpcUrls: readonly string[], chainId: number): FallbackProvider {
  const key = `${chainId}:${rpcUrls.join(",")}`;
  if (cachedReadProvider && cachedReadProviderKey === key) return cachedReadProvider;

  const providers = rpcUrls.map((url, index) => ({
    provider: new JsonRpcProvider(url, chainId, { staticNetwork: true }),
    priority: index + 1,
    stallTimeout: 1_200,
    weight: 1,
  }));
  cachedReadProvider = new FallbackProvider(providers, chainId, { quorum: 1 });
  cachedReadProviderKey = key;
  return cachedReadProvider;
}

// Keep the selected ethers surface tree-shakeable while public-chain and wallet
// routes share one lazy web3 chunk.
export const ethers = {
  AbiCoder,
  BrowserProvider,
  Contract,
  ZeroHash,
  id,
  keccak256,
};
