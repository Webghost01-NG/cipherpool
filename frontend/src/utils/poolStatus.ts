export type DeploymentStatus = "pending" | "verified" | "failed";

export interface PoolStatusPresentation {
  label: string;
  isHealthy: boolean;
}

export function getPoolStatus(
  deploymentStatus: DeploymentStatus,
  isPaused: boolean,
  hasPendingDraw = false
): PoolStatusPresentation {
  if (deploymentStatus === "pending") {
    return { label: "Pool checking", isHealthy: false };
  }
  if (deploymentStatus === "failed") {
    return { label: "Pool unavailable", isHealthy: false };
  }
  if (isPaused) {
    return { label: "Pool paused", isHealthy: false };
  }
  if (hasPendingDraw) {
    return { label: "Draw settlement pending", isHealthy: false };
  }
  return { label: "Pool active", isHealthy: true };
}
