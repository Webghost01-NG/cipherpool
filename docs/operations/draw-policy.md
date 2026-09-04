# Permissionless Draw Policy

CipherPool removes operator discretion from draw requests with immutable deployment parameters. The reviewed Sepolia policy is a `500,000` base-unit prize (0.5 cUSDC), a seven-day minimum interval, and a one-day settlement timeout.

Any address may call `requestDraw`, but the supplied prize must exactly equal `drawPrizeAmount()` and the block timestamp must be at least `nextDrawRequestTimestamp()`. The first valid request snapshots the encrypted aggregate and reserve, advances the next eligible timestamp by `drawInterval()`, and locks balance mutations until settlement or cancellation. Because callers cannot request early, change the prize, or create a second active request, owner timing and prize-size discretion are removed. The draw’s random ticket is generated only during proof-bound finalization, not from the request caller or timestamp.

Any keeper may submit the KMS proof. A valid proof either executes the fixed prize or emits `DrawSkipped` and releases the lock when the verified pool is empty or the verified reserve cannot fund the fixed prize. Invalid or substituted proofs revert without consuming the request. After `drawCancellationDelay()`, anyone may cancel an unavailable KMS settlement.

The constructor requires the draw interval to be at least twice the cancellation delay. With the reviewed seven-day/one-day policy, a timed-out request therefore leaves almost six days in which deposits and withdrawals are unlocked before another request can begin. This bounds griefing even if a requester disappears.

The policy does not depend on a privileged keeper, but production availability still benefits from independent automation that monitors `DrawRequested`, relays KMS proofs, and calls timeout cancellation. The currently active Sepolia address predates this policy and must not be described as permissionless-requesting until a new runtime is deployed and verified.
