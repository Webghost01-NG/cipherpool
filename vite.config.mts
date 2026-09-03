import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { minify } from "terser";

const normalizeModuleId = (id: string) => id.replaceAll("\\", "/");

const frontendVendorChunk = (id: string) => {
  const moduleId = normalizeModuleId(id);

  if (moduleId.includes("/node_modules/@zama-fhe/relayer-sdk/")) {
    return "fhe";
  }

  if (
    moduleId.includes("/node_modules/react/")
    || moduleId.includes("/node_modules/react-dom/")
    || moduleId.includes("/node_modules/scheduler/")
  ) {
    return "react";
  }

  if (
    moduleId.includes("/node_modules/ethers/")
    || moduleId.includes("/node_modules/@adraffy/ens-normalize/")
    || moduleId.includes("/node_modules/@noble/")
    || moduleId.includes("/node_modules/aes-js/")
  ) {
    return "web3";
  }

  if (moduleId.includes("/node_modules/lucide-react/")) {
    return "icons";
  }
};

// These wasm-bindgen wrapper methods stay inside the lazy FHE chunk. Keep
// application-facing SDK methods and fixed WebAssembly symbol names out of this list.
const generatedFheWrapperMethods = [
  "__destroy_into_raw",
  "__unwrap",
  "__wrap",
  "decrypt",
  "decompress",
  "deserialize",
  "encrypt_with_client_key",
  "encrypt_with_compressed_public_key",
  "encrypt_with_public_key",
  "free",
  "safe_deserialize",
  "safe_deserialize_conformant",
  "safe_serialize",
  "serialize",
];
const generatedFheWrapperMethod = new RegExp(`^(?:${generatedFheWrapperMethods.join("|")})$`);

const minifyLazyFheChunk = (): Plugin => ({
  name: "minify-lazy-fhe-chunk",
  enforce: "post",
  async renderChunk(code, chunk) {
    if (chunk.name !== "fhe") return null;

    const result = await minify(code, {
      ecma: 2022,
      module: true,
      compress: {
        passes: 3,
      },
      mangle: {
        toplevel: true,
        properties: {
          regex: generatedFheWrapperMethod,
          keep_quoted: true,
        },
      },
    });

    if (!result.code) {
      throw new Error("Terser did not emit the lazy FHE chunk.");
    }

    return { code: result.code, map: null };
  },
});

export default defineConfig({
  plugins: [react(), minifyLazyFheChunk()],
  root: "./frontend",
  build: {
    target: "es2022",
    outDir: "../dist-frontend",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: frontendVendorChunk,
      },
    },
  },
  server: {
    port: 3000,
  },
});
