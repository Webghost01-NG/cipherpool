import { Router, Request, Response } from "express";
import { z } from "zod";
import { IndexerStore } from "../indexer/store.js";
import { KMSRelayerService } from "../relayer/relayer.js";

export function createApiRouter(store: IndexerStore, relayer?: KMSRelayerService): Router {
  const router = Router();

  const addressParamSchema = z.object({
    address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid 20-byte EVM address format"),
  });

  const processBodySchema = z.object({
    requestHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Invalid 32-byte requestHash format"),
  });

  router.get("/pool/state", (_req: Request, res: Response) => {
    const latest = store.getLatestDraw();
    res.status(200).json({
      totalDeposits: store.getTotalDeposits().toString(),
      totalDraws: store.getDrawCount(),
      latestDraw: latest
        ? {
            drawId: latest.drawId.toString(),
            prizeAmount: latest.prizeAmount.toString(),
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

    const deposit = store.getUserDeposit(params.data.address);
    res.status(200).json({
      user: params.data.address,
      plainDepositAmount: deposit.toString(),
    });
  });

  router.get("/users/:address/withdrawal", (req: Request, res: Response) => {
    const params = addressParamSchema.safeParse(req.params);
    if (!params.success) {
      return res.status(400).json({ error: "ValidationError", details: params.error.flatten() });
    }

    const pending = store.getPendingWithdrawalByUser(params.data.address);
    if (!pending) {
      return res.status(200).json({ user: params.data.address, hasPendingWithdrawal: false });
    }

    res.status(200).json({
      user: params.data.address,
      hasPendingWithdrawal: true,
      withdrawal: {
        requestHash: pending.requestHash,
        requestedAmount: pending.requestedAmount.toString(),
        handle: pending.handle,
        nonce: pending.nonce.toString(),
        timestamp: pending.timestamp,
        status: pending.status,
      },
    });
  });

  router.post("/relayer/process", async (req: Request, res: Response) => {
    const body = processBodySchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ error: "ValidationError", details: body.error.flatten() });
    }

    if (!relayer) {
      return res.status(503).json({ error: "RelayerNotConfigured", message: "Relayer service is offline" });
    }

    const success = await relayer.processRequest(body.data.requestHash);
    if (!success) {
      return res.status(422).json({
        error: "ProcessingFailed",
        message: "Failed to finalize withdrawal or request already in-flight",
      });
    }

    res.status(200).json({ status: "success", requestHash: body.data.requestHash });
  });

  return router;
}
