import React, { useState } from "react";
import { Card, Button, Badge } from "../common/UIPrimitives.js";
import { Sparkles, Dices, Award, HelpCircle } from "lucide-react";

export interface LotteryDrawCardProps {
  prizePool: string;
  totalDraws: number;
  onExecuteDraw: (prize: bigint) => Promise<void>;
  isLoading: boolean;
}

export const LotteryDrawCard: React.FC<LotteryDrawCardProps> = ({
  prizePool,
  totalDraws,
  onExecuteDraw,
  isLoading,
}) => {
  const [drawPrize, setDrawPrize] = useState<string>("5000");

  const handleDraw = async () => {
    const val = BigInt(drawPrize);
    if (val > 0n) {
      await onExecuteDraw(val);
    }
  };

  return (
    <Card
      title="Confidential Lottery Draw"
      subtitle="Homomorphic Modulo Derivation on fhEVM"
      headerAction={<Badge variant="success">Fairness Guaranteed</Badge>}
    >
      <div style={{ marginBottom: "var(--space-md)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
          <span style={{ fontSize: "0.8125rem", color: "var(--text-muted)", fontWeight: 500 }}>
            CURRENT ACCUMULATED YIELD PRIZE
          </span>
          <span className="mono" style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--accent-cyan)" }}>
            {Number(prizePool).toLocaleString()} USDC
          </span>
        </div>

        <div
          style={{
            backgroundColor: "var(--bg-primary)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "0.8125rem",
            color: "var(--text-secondary)",
            lineHeight: 1.6,
            marginBottom: "var(--space-md)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-primary)", fontWeight: 600, marginBottom: "4px" }}>
            <Dices size={16} color="var(--accent-emerald)" />
            <span>Cryptographic Randomness Mechanism</span>
          </div>
          Winner selection uses <code>FHE.randEuint64(upperBound)</code> to generate homomorphic random indices directly inside the ciphertext domain. The winner&apos;s ticket allocation and identity remain confidential on-chain.
        </div>
      </div>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <Button
          variant="primary"
          style={{ flex: 1 }}
          isLoading={isLoading}
          onClick={handleDraw}
        >
          <Sparkles size={16} /> Execute Confidential Round Draw
        </Button>
      </div>
    </Card>
  );
};
