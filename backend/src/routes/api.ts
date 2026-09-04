import { Request, Response, Router } from "express";
import { z } from "zod";
import { IndexerStore } from "../indexer/store.js";

export function createApiRouter(store: IndexerStore): Router {
  const router = Router();
  const addressParamSchema = z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid 20-byte EVM address format"),
  });

  if (process.env.NODE_ENV !== "production") {
    router.get("/debug/error", () => {
      throw new Error("Simulated unhandled route failure");
    });
  }

  router.get("/pool/state", (_req: Request, res: Response) => {
    const latest = store.getLatestDraw();
    res.status(200).json({
      depositEvents: store.getTotalDepositEvents().toString(),
      confidentialWithdrawalEvents: store.getConfidentialWithdrawalCount().toString(),
      prizeReserveFundingEvents: store.getPrizeReserveFundingCount().toString(),
      lastVerifiedTotalAccountedBalance: store.getTotalAccountedBalance().toString(),
      totalDraws: store.getDrawCount(),
      latestDraw: latest
        ? {
            drawId: latest.drawId.toString(),
            requestHash: latest.requestHash,
            prizeAmount: latest.prizeAmount.toString(),
            totalWeight: latest.totalWeight.toString(),
            remainingPrizeReserve: latest.remainingPrizeReserve.toString(),
            timestamp: latest.timestamp,
            participantCount: latest.participantCount,
          }
        : null,
    });
  });

  router.get("/users/:address/deposit", (req: Request, res: Response) => {
    const params = addressParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "ValidationError", details: params.error.flatten() });
    }

    res.status(410).json({
      error: "PrivateMetric",
      message: "CipherPool does not index plaintext user deposits. Reveal the encrypted position with the connected wallet.",
    });
  });

  return router;
}
