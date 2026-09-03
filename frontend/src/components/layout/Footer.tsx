import React from "react";
import { Lock, FileCheck, Code2, ExternalLink } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border-subtle)",
        backgroundColor: "var(--bg-primary)",
        paddingTop: "var(--space-2xl)",
        paddingBottom: "var(--space-2xl)",
        marginTop: "var(--space-2xl)",
      }}
    >
      <div className="container">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: "var(--space-xl)",
            marginBottom: "var(--space-xl)",
          }}
        >
          {/* Protocol Column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-sm)" }}>
              <Lock size={18} color="var(--accent-cyan)" />
              <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>CipherPool Protocol</span>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", lineHeight: 1.6 }}>
              A no-loss confidential prize savings protocol on Zama fhEVM. Balances, tickets, and lottery draws remain 100% encrypted on-chain.
            </p>
          </div>

          {/* Forensic Audits & Proofs */}
          <div>
            <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-sm)" }}>
              Cryptographic Proofs
            </h4>
            <ul style={{ listStyle: "none", fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "8px" }}>
              <li>
                <a href="https://github.com/Webghost01-NG/fhevm-pooltogether-security/blob/main/docs/security/replay-boundaries.md" target="_blank" rel="noreferrer">
                  EIP-712 Replay Boundaries Audit
                </a>
              </li>
              <li>
                <a href="https://github.com/Webghost01-NG/fhevm-pooltogether-security/blob/main/docs/security/stale-handles.md" target="_blank" rel="noreferrer">
                  Stale Handle & Race Condition Audit
                </a>
              </li>
              <li>
                <a href="https://github.com/Webghost01-NG/fhevm-pooltogether-security/blob/main/docs/spec/adversarial-test-plan.md" target="_blank" rel="noreferrer">
                  Adversarial Test Plan (ADV-01..12)
                </a>
              </li>
            </ul>
          </div>

          {/* Verified Infrastructure */}
          <div>
            <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-sm)" }}>
              Verified Infrastructure
            </h4>
            <ul style={{ listStyle: "none", fontSize: "0.8125rem", display: "flex", flexDirection: "column", gap: "8px", color: "var(--text-secondary)" }}>
              <li>fhEVM Solidity v0.13.3</li>
              <li>Zama Threshold KMS Verifier</li>
              <li>Sepolia Testnet (Chain ID 11155111)</li>
              <li>ERC-4626 Strategy Custody</li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            borderTop: "1px solid var(--border-subtle)",
            paddingTop: "var(--space-md)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "var(--space-md)",
            fontSize: "0.75rem",
            color: "var(--text-muted)",
          }}
        >
          <div>
            CipherPool Protocol &copy; {new Date().getFullYear()} — Built for Zama fhEVM Bounty Track
          </div>
          <div style={{ display: "flex", gap: "16px" }}>
            <a
              href="https://github.com/Webghost01-NG/fhevm-pooltogether-security"
              target="_blank"
              rel="noreferrer"
              style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}
            >
              <Code2 size={14} /> GitHub Repository
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
