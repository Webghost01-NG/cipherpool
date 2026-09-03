export const DEFAULT_POOL_ADDRESS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_POOL_ADDRESS) ||
  "0x602AE8011F478EBbe87Da760C054B5C25911612a";

export const DEFAULT_VAULT_ADDRESS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_VAULT_ADDRESS) ||
  "0x79e6B29e253eCA1d506AF330Bb17937Cba9327a7";

export const DEFAULT_USDC_ADDRESS =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_USDC_ADDRESS) ||
  "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238";

export const DEFAULT_BACKEND_URL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_BACKEND_URL) ||
  "http://localhost:3001";
