import {
  AbiCoder,
  BrowserProvider,
  Contract,
  ZeroHash,
  id,
  keccak256,
} from "ethers";

// Keep the selected ethers surface tree-shakeable while the module itself stays
// behind a dynamic import on connected-wallet paths.
export const ethers = {
  AbiCoder,
  BrowserProvider,
  Contract,
  ZeroHash,
  id,
  keccak256,
};
