import React, { useState } from "react";
import { Layout } from "./components/layout/Layout.js";
import { Card, Badge, Button, StatBox } from "./components/common/UIPrimitives.js";
import { Lock, Sparkles, ArrowRight, ShieldCheck, Database, Cpu } from "lucide-react";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState("pool");

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {/* Judge-First Hero Section */}
      <section style={{ marginBottom: "var(--space-2xl)" }}>
        <div style={{ maxWidth: "840px" }}>
          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "var(--space-md)" }}>
            <Badge variant="success">Fully Homomorphic Encryption</Badge>
            <Badge variant="info">Zero-Loss Savings</Badge>
          </div>
          <h1
            style={{
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginBottom: "var(--space-md)",
            }}
          >
            Confidential Prize Savings on <span style={{ color: "var(--accent-cyan)" }}>Zama fhEVM</span>
          </h1>
          <p
            style={{
              fontSize: "1.125rem",
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              marginBottom: "var(--space-lg)",
            }}
          >
            Deposit custody assets to earn yield while entering confidential lottery draws.
            Your deposit balance, ticket distribution, and lottery selections remain <strong>100% encrypted on-chain</strong> at all times.
          </p>

          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <Button variant="primary" onClick={() => setActiveTab("pool")}>
              Launch Pool Application <ArrowRight size={16} />
            </Button>
            <Button variant="secondary" onClick={() => setActiveTab("docs")}>
              <ShieldCheck size={16} color="var(--accent-emerald)" /> View Cryptographic Audits
            </Button>
          </div>
        </div>
      </section>

      {/* Protocol Metrics Grid */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-md)",
          marginBottom: "var(--space-2xl)",
        }}
      >
        <StatBox
          label="TOTAL ENCRYPTED PRINCIPAL"
          value="1,420,500 USDC"
          subtext="100% Capital Preserved"
          badge={<Badge variant="info">Encrypted</Badge>}
        />
        <StatBox
          label="ESTIMATED PRIZE POOL"
          value="24,850 USDC"
          subtext="Harvested Strategy Yield"
          badge={<Badge variant="success">Active</Badge>}
        />
        <StatBox
          label="DRAWS COMPLETED"
          value="12 Rounds"
          subtext="Homomorphic Modulo Derivation"
          badge={<Badge variant="neutral">Verified</Badge>}
        />
        <StatBox
          label="KMS RELAYER STATUS"
          value="Online (15s)"
          subtext="Threshold EIP-712 Signers"
          badge={<Badge variant="success">Operational</Badge>}
        />
      </section>

      {/* Technical Architecture Storytelling Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "var(--space-lg)",
          marginBottom: "var(--space-2xl)",
        }}
      >
        <Card
          title="1. Confidential Deposit"
          subtitle="InputVerifier Coprocessor Proof"
        >
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            <p style={{ marginBottom: "var(--space-md)" }}>
              Users encrypt their deposit amount client-side. The Zama InputVerifier validates the ZK proof on-chain without revealing the deposited value to miners or validators.
            </p>
            <div
              className="mono"
              style={{
                backgroundColor: "var(--bg-primary)",
                padding: "10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                color: "var(--accent-cyan)",
              }}
            >
              FHE.asEuint64(encryptedInput)
            </div>
          </div>
        </Card>

        <Card
          title="2. Private Lottery Draw"
          subtitle="Homomorphic Bounded Randomness"
        >
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            <p style={{ marginBottom: "var(--space-md)" }}>
              The contract derives a cryptographic winner homomorphically using <code>FHE.randEuint64</code>. The winning index is evaluated in ciphertext without exposing winner identity or ticket distribution.
            </p>
            <div
              className="mono"
              style={{
                backgroundColor: "var(--bg-primary)",
                padding: "10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                color: "var(--accent-emerald)",
              }}
            >
              FHE.select(isWinner, prize, zero)
            </div>
          </div>
        </Card>

        <Card
          title="3. 2-Step Async Withdrawal"
          subtitle="Storage-Anchored KMS Settlement"
        >
          <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem", lineHeight: 1.6 }}>
            <p style={{ marginBottom: "var(--space-md)" }}>
              Withdrawals evaluate sufficiency homomorphically and store an ephemeral handle. The off-chain Zama KMS produces an EIP-712 threshold signature proof verified before custody disbursement.
            </p>
            <div
              className="mono"
              style={{
                backgroundColor: "var(--bg-primary)",
                padding: "10px",
                borderRadius: "6px",
                fontSize: "0.75rem",
                color: "var(--accent-amber)",
              }}
            >
              FHE.checkSignatures(handle, cleartext, proof)
            </div>
          </div>
        </Card>
      </section>
    </Layout>
  );
};
