# Frontend Bundle Performance

Issue #77 established a 500 kB maximum for minified JavaScript chunks. The limit remains Vite's default and is verified after every frontend build by `npm run verify:frontend-bundle`.

## Loading strategy

- `react`, `ethers`, and `lucide-react` are isolated into stable vendor chunks for effective browser caching.
- `@zama-fhe/relayer-sdk/web` remains behind the dynamic import in `InputEncryption.ts`.
- The FHE JavaScript, worker, and WASM assets are absent from `index.html` and load only when an encryption or decryption flow requests an SDK instance.
- The Zama SDK's generated wrapper methods receive a narrowly scoped second minification pass. Application-facing SDK methods and WebAssembly import/export names are not renamed.

## Production measurements

Sizes are minified output from `npm run build:frontend` on Node.js 22. Values use decimal kilobytes, matching Vite's report.

| Asset | Before | After | Loading |
| --- | ---: | ---: | --- |
| Application entry | 536.67 kB | 50.75 kB | Initial |
| React vendor | Included in entry | 192.71 kB | Initial |
| Web3 vendor | Included in entry/SDK | 268.59 kB | Initial |
| Icon vendor | Included in entry | 14.03 kB | Initial |
| FHE SDK JavaScript | 536.11 kB | 494.62 kB | On demand |
| FHE worker | 380.91 kB | 380.90 kB | On demand |
| KMS WASM | 648.86 kB | 648.86 kB | On demand |
| TFHE WASM | 4,746.90 kB | 4,746.90 kB | On demand |

The WASM payloads are intentionally not evaluated as JavaScript chunks. They are required cryptographic binaries and remain deferred behind the FHE interaction boundary.
