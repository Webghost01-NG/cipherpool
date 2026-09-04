export type DeploymentStatus = "pending" | "verified" | "failed";

export interface PoolStatusPresentation {
  label: string;
  isHealthy: boolean;
}

export function getPoolStatus(
  deploymentStatus: DeploymentStatus,
  isPaused: boolean
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
  return { label: "Pool active", isHealthy: true };
}
