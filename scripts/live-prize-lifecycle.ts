import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { ethers, type Eip1193Provider } from "ethers";
import { createInstance, SepoliaConfig, type FhevmInstance } from "@zama-fhe/relayer-sdk/node";

const ACTIONS = ["preflight", "deposit", "activate", "deactivate", "draw", "reveal-prize", "claim-prize", "withdraw"] as const;
export type LifecycleAction = typeof ACTIONS[number];

const POOL_ABI = [
  "function DEPOSIT_ACTION() view returns (bytes32)",
  "function custodyAsset() view returns (address)",
  "function owner() view returns (address)",
  "function paused() view returns (bool)",
  "function currentDrawId() view returns (uint256)",
  "function getParticipantCount() view returns (uint256)",
  "function drawInterval() view returns (uint64)",
  "function drawPrizeAmount() view returns (uint64)",
  "function nextDrawRequestTimestamp() view returns (uint64)",
  "function participants(uint256) view returns (address)",
  "function getPendingDraw() view returns (tuple(bytes32 totalHandle,bytes32 reserveHandle,bytes32 readinessHandle,uint64 prizeAmount,uint64 timestamp,bool active,bytes32 requestHash))",
  "function getPendingParticipantActivation(address) view returns (tuple(bytes32 eligibilityHandle,uint64 timestamp,bool active,bytes32 requestHash))",
  "function getPendingParticipantDeactivation(address) view returns (tuple(bytes32 zeroBalanceHandle,uint64 timestamp,bool active,bytes32 requestHash))",
  "function getBalanceHandle(address) view returns (bytes32)",
  "function getPrizeHandle(address) view returns (bytes32)",
  "function getTotalEligibleBalanceHandle() view returns (bytes32)",
  "function getPrizeReserveHandle() view returns (bytes32)",
  "function withdraw(bytes32 encryptedAmount,bytes inputProof)",
  "function finalizeParticipantActivation(address user,bool eligible,bytes decryptionProof)",
  "function finalizeParticipantDeactivation(address user,bool zeroBalance,bytes decryptionProof)",
  "function requestDraw(uint64 prizeAmount)",
  "function finalizeDraw(bool ready,bytes decryptionProof)",
  "event Deposited(address indexed user,uint256 indexed nonce,bytes32 indexed encryptedAmountHandle)",
  "event Withdrawn(address indexed user,uint256 indexed nonce,bytes32 indexed encryptedAmountHandle)",
  "event ParticipantActivationRequested(address indexed user,uint256 indexed nonce,bytes32 indexed requestHash,bytes32 eligibilityHandle)",
  "event ParticipantActivationFinalized(address indexed user,bytes32 indexed requestHash,bool eligible,uint256 participantCount)",
  "event ParticipantDeactivationFinalized(address indexed user,bytes32 indexed requestHash,bool zeroBalance,uint256 participantCount)",
  "event DrawRequested(uint256 indexed nonce,bytes32 indexed requestHash,uint64 prizeAmount,bytes32 totalHandle,bytes32 reserveHandle,bytes32 readinessHandle)",
  "event DrawSkipped(bytes32 indexed requestHash,uint64 requiredPrizeAmount,uint256 timestamp)",
  "event DrawExecuted(uint256 indexed drawId,bytes32 indexed requestHash,uint64 prizeAmount,uint256 timestamp,uint256 participantCount)",
];

const TOKEN_ABI = [
  "function confidentialTransferAndCall(address to,bytes32 encryptedAmount,bytes inputProof,bytes data) returns (bytes32)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
];

const UINT64_LIMIT = 2n ** 64n;

export function parseLifecycleAction(value: string | undefined): LifecycleAction {
  const action = value?.trim() || "preflight";
  if (!ACTIONS.includes(action as LifecycleAction)) {
    throw new Error(`LIFECYCLE_ACTION must be one of: ${ACTIONS.join(", ")}.`);
  }
  return action as LifecycleAction;
}

export function parseLifecycleAmount(value: string | undefined, decimals: number): bigint {
  if (!value?.trim()) throw new Error("LIFECYCLE_AMOUNT is required for this action.");
  const amount = ethers.parseUnits(value.trim(), decimals);
  if (amount <= 0n || amount >= UINT64_LIMIT) {
    throw new Error("LIFECYCLE_AMOUNT must fit a positive uint64 base-unit value.");
  }
  return amount;
}

export function assertExpectedParticipants(observed: string[], expectedCsv: string): void {
  const normalizedExpected = expectedCsv.trim();
  const expected = normalizedExpected.toLowerCase() === "none"
    ? []
    : normalizedExpected
      .split(",")
      .map((address) => ethers.getAddress(address.trim()).toLowerCase())
      .sort();
  const actual = observed.map((address) => ethers.getAddress(address).toLowerCase()).sort();
  if (expected.join(",") !== actual.join(",")) {
    throw new Error(`Participant set mismatch. Expected ${expected.join(",") || "none"}; observed ${actual.join(",") || "none"}.`);
  }
}

export function buildConfirmationPhrase(
  action: LifecycleAction,
  amount: string,
  drawId: bigint,
  poolAddress: string,
  walletAddress: string
): string {
  return [
    action,
    amount,
    `draw-${drawId}`,
    ethers.getAddress(poolAddress).toLowerCase(),
    ethers.getAddress(walletAddress).toLowerCase(),
  ].join(":");
}

export function readClearValue(clearValues: Record<string, bigint>, handle: string): bigint {
  const entry = Object.entries(clearValues).find(([key]) => key.toLowerCase() === handle.toLowerCase());
  if (typeof entry?.[1] !== "bigint") throw new Error(`Zama KMS did not return a value for handle ${handle}.`);
  return entry[1];
}

export function readClearBoolean(clearValues: Record<string, unknown>, handle: string): boolean {
  const entry = Object.entries(clearValues).find(([key]) => key.toLowerCase() === handle.toLowerCase());
  if (typeof entry?.[1] === "boolean") return entry[1];
  if (typeof entry?.[1] === "bigint") return entry[1] !== 0n;
  throw new Error(`Zama KMS did not return a boolean for handle ${handle}.`);
}

function requiredEnvironment(key: string): string {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function readBoolean(key: string): boolean {
  return process.env[key]?.trim().toLowerCase() === "true";
}

function readKeystorePassword(): string {
  if (process.env.LIFECYCLE_KEYSTORE_PASSWORD) return process.env.LIFECYCLE_KEYSTORE_PASSWORD;
  const passwordFile = process.env.LIFECYCLE_KEYSTORE_PASSWORD_FILE?.trim();
  if (!passwordFile) {
    throw new Error("Set LIFECYCLE_KEYSTORE_PASSWORD or LIFECYCLE_KEYSTORE_PASSWORD_FILE through a secret manager.");
  }
  return fs.readFileSync(passwordFile, "utf8").trimEnd();
}

function parseReceiptEvent(receipt: ethers.ContractTransactionReceipt, contract: ethers.Contract, name: string) {
  return receipt.logs
    .map((log) => {
      try { return contract.interface.parseLog(log); } catch { return null; }
    })
    .find((event) => event?.name === name);
}

function requireConfirmedReceipt(receipt: ethers.ContractTransactionReceipt | null) {
  if (!receipt || receipt.status !== 1) throw new Error("Transaction was not confirmed on Ethereum Sepolia.");
  return receipt;
}

function printEvidence(evidence: Record<string, unknown>): void {
  console.log(JSON.stringify(evidence, (_key, value) => typeof value === "bigint" ? value.toString() : value, 2));
}

async function readPublic<T>(label: string, operation: () => Promise<T>): Promise<T> {
  const maximumAttempts = 3;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === maximumAttempts) throw new Error(`Public read '${label}' failed after ${maximumAttempts} attempts: ${message}`);
      printEvidence({ phase: "public-read-retry", label, attempt, reason: message });
    }
  }
  throw new Error(`Public read '${label}' did not complete.`);
}

async function initializeFhevm(network: Eip1193Provider): Promise<FhevmInstance> {
  const maximumAttempts = 3;
  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    try {
      return await createInstance({ ...SepoliaConfig, network });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (attempt === maximumAttempts) throw new Error(`FHEVM initialization failed after ${maximumAttempts} attempts: ${message}`);
      printEvidence({ phase: "fhevm-initialization-retry", attempt, reason: message });
    }
  }
  throw new Error("FHEVM initialization did not complete.");
}

interface PrivateHandles {
  walletBalance: string;
  poolPosition: string;
  prize: string;
}

interface PrivateValues {
  walletBalance?: bigint;
  poolPosition?: bigint;
  prize?: bigint;
}

type PrivateValueName = keyof PrivateValues;

async function decryptPrivateValues(
  instance: FhevmInstance,
  wallet: ethers.Wallet,
  poolAddress: string,
  tokenAddress: string,
  handles: PrivateHandles,
  requestedNames: PrivateValueName[]
): Promise<PrivateValues> {
  const pairs = [
    { name: "walletBalance" as const, handle: handles.walletBalance, contractAddress: tokenAddress },
    { name: "poolPosition" as const, handle: handles.poolPosition, contractAddress: poolAddress },
    { name: "prize" as const, handle: handles.prize, contractAddress: poolAddress },
  ];
  const requested = pairs.filter(({ name }) => requestedNames.includes(name));
  const nonzero = requested.filter(({ handle }) => handle !== ethers.ZeroHash);
  const values: PrivateValues = Object.fromEntries(
    requested.filter(({ handle }) => handle === ethers.ZeroHash).map(({ name }) => [name, 0n])
  );
  if (nonzero.length === 0) return values;

  const keypair = instance.generateKeypair();
  const startTimestamp = Math.floor(Date.now() / 1000);
  const durationDays = 1;
  const contractAddresses = [...new Set(nonzero.map(({ contractAddress }) => contractAddress))];
  const typedData = instance.createEIP712(keypair.publicKey, contractAddresses, startTimestamp, durationDays);
  const signature = await wallet.signTypedData(
    typedData.domain,
    { UserDecryptRequestVerification: typedData.types.UserDecryptRequestVerification },
    typedData.message
  );
  const clearValues = await instance.userDecrypt(
    nonzero.map(({ handle, contractAddress }) => ({ handle, contractAddress })),
    keypair.privateKey,
    keypair.publicKey,
    signature,
    contractAddresses,
    wallet.address,
    startTimestamp,
    durationDays
  );
  for (const pair of nonzero) values[pair.name] = readClearValue(clearValues, pair.handle);
  return values;
}

function requiredPrivateValue(values: PrivateValues | null, name: PrivateValueName): bigint {
  const value = values?.[name];
  if (typeof value !== "bigint") throw new Error(`Private ${name} preflight was not completed.`);
  return value;
}

function privateValueNamesForAction(action: LifecycleAction): PrivateValueName[] {
  if (action === "deposit") return ["walletBalance"];
  if (action === "reveal-prize") return ["prize"];
  if (action === "claim-prize") return ["poolPosition", "prize"];
  if (action === "withdraw") return ["poolPosition"];
  if (action === "preflight") return ["walletBalance", "poolPosition", "prize"];
  return [];
}

async function main(): Promise<void> {
  const action = parseLifecycleAction(process.env.LIFECYCLE_ACTION);
  const rpcUrl = requiredEnvironment("RPC_URL");
  const poolAddress = ethers.getAddress(requiredEnvironment("POOL_CONTRACT_ADDRESS"));
  const custodyAssetAddress = ethers.getAddress(requiredEnvironment("CUSTODY_ASSET_ADDRESS"));
  const expectedRuntimeHash = requiredEnvironment("POOL_RUNTIME_CODE_HASH").toLowerCase();
  if (!ethers.isHexString(expectedRuntimeHash, 32)) throw new Error("POOL_RUNTIME_CODE_HASH must be bytes32.");
  const actorAddress = ethers.getAddress(requiredEnvironment("LIFECYCLE_WALLET_ADDRESS"));
  const provider = new ethers.JsonRpcProvider(
    rpcUrl,
    { chainId: 11155111, name: "sepolia" },
    { batchMaxCount: 1, staticNetwork: true }
  );
  printEvidence({ phase: "public-preflight-requested", action });
  const chainId = BigInt(await readPublic("network", () => provider.send("eth_chainId", [])));
  if (chainId !== 11155111n) throw new Error(`Expected Ethereum Sepolia, received chain ${chainId}.`);

  const poolCode = await readPublic("pool runtime bytecode", () => provider.getCode(poolAddress));
  if (poolCode === "0x" || ethers.keccak256(poolCode).toLowerCase() !== expectedRuntimeHash) {
    throw new Error("The pool runtime bytecode does not match POOL_RUNTIME_CODE_HASH.");
  }

  const pool = new ethers.Contract(poolAddress, POOL_ABI, provider);
  const owner = await readPublic("pool owner", () => pool.owner() as Promise<string>);
  const custodyAsset = await readPublic("custody asset", () => pool.custodyAsset() as Promise<string>);
  const paused = await readPublic("pause status", () => pool.paused() as Promise<boolean>);
  const currentDrawId = await readPublic("current draw ID", () => pool.currentDrawId() as Promise<bigint>);
  const participantCount = await readPublic("participant count", () => pool.getParticipantCount() as Promise<bigint>);
  const drawInterval = await readPublic("draw interval", () => pool.drawInterval() as Promise<bigint>);
  const drawPrizeAmount = await readPublic("draw prize amount", () => pool.drawPrizeAmount() as Promise<bigint>);
  const nextDrawRequestTimestamp = await readPublic("next draw request timestamp", () => pool.nextDrawRequestTimestamp() as Promise<bigint>);
  const pendingDraw = await readPublic("pending draw", () => pool.getPendingDraw() as Promise<{
      totalHandle: string;
      reserveHandle: string;
      readinessHandle: string;
      prizeAmount: bigint;
      timestamp: bigint;
      active: boolean;
      requestHash: string;
    }>);
  if (ethers.getAddress(custodyAsset) !== custodyAssetAddress) {
    throw new Error("The pool custody asset does not match CUSTODY_ASSET_ADDRESS.");
  }

  const participants: string[] = [];
  for (let index = 0; index < Number(participantCount); index += 1) {
    participants.push(await readPublic(`participant ${index}`, () => pool.participants(index) as Promise<string>));
  }
  const token = new ethers.Contract(custodyAssetAddress, TOKEN_ABI, provider);
  const decimals = await readPublic("token decimals", () => token.decimals() as Promise<bigint>);
  const symbol = await readPublic("token symbol", () => token.symbol() as Promise<string>);
  const walletBalanceHandle = await readPublic("wallet balance handle", () => token.confidentialBalanceOf(actorAddress) as Promise<string>);
  const poolPositionHandle = await readPublic("pool position handle", () => pool.getBalanceHandle(actorAddress) as Promise<string>);
  const prizeHandle = await readPublic("prize handle", () => pool.getPrizeHandle(actorAddress) as Promise<string>);
  const aggregateHandle = await readPublic("eligible aggregate handle", () => pool.getTotalEligibleBalanceHandle() as Promise<string>);
  const reserveHandle = await readPublic("reserve handle", () => pool.getPrizeReserveHandle() as Promise<string>);
  const ethBalance = await readPublic("wallet ETH balance", () => provider.getBalance(actorAddress));
  const blockNumber = await readPublic("block number", () => provider.getBlockNumber());
  const privateHandles = {
    walletBalance: walletBalanceHandle,
    poolPosition: poolPositionHandle,
    prize: prizeHandle,
  };

  const writeAction = action === "deposit" || action === "activate" || action === "deactivate" || action === "draw" || action === "claim-prize" || action === "withdraw";
  if (writeAction || process.env.LIFECYCLE_EXPECTED_PARTICIPANTS?.trim()) {
    assertExpectedParticipants(participants, requiredEnvironment("LIFECYCLE_EXPECTED_PARTICIPANTS"));
  }
  if (writeAction) {
    if (paused) throw new Error("The pool is paused.");
    if (pendingDraw.active) throw new Error(`A draw is already pending: ${pendingDraw.requestHash}.`);
    const expectedDrawId = BigInt(requiredEnvironment("LIFECYCLE_EXPECTED_DRAW_ID"));
    if (currentDrawId !== expectedDrawId) {
      throw new Error(`Draw ID mismatch. Expected ${expectedDrawId}; observed ${currentDrawId}.`);
    }
    if (action === "draw" && BigInt(Math.floor(Date.now() / 1000)) < nextDrawRequestTimestamp) {
      throw new Error(`The next permissionless draw window opens at ${nextDrawRequestTimestamp}.`);
    }
  }


  const disclose = readBoolean("LIFECYCLE_DISCLOSE_PRIVATE_VALUES");
  printEvidence({
    phase: "public-preflight",
    action,
    network: "Ethereum Sepolia",
    blockNumber,
    pool: poolAddress,
    runtimeHash: ethers.keccak256(poolCode),
    owner: ethers.getAddress(owner),
    actor: actorAddress,
    actorIsOwner: actorAddress === ethers.getAddress(owner),
    custodyAsset: custodyAssetAddress,
    token: { symbol, decimals },
    paused,
    currentDrawId,
    drawPolicy: { prizeAmount: drawPrizeAmount, interval: drawInterval, nextRequestTimestamp: nextDrawRequestTimestamp },
    pendingDraw: { active: pendingDraw.active, requestHash: pendingDraw.requestHash, timestamp: pendingDraw.timestamp },
    participants,
    handles: {
      walletBalanceInitialized: walletBalanceHandle !== ethers.ZeroHash,
      poolPositionInitialized: poolPositionHandle !== ethers.ZeroHash,
      prizeInitialized: prizeHandle !== ethers.ZeroHash,
      aggregateInitialized: aggregateHandle !== ethers.ZeroHash,
      reserveInitialized: reserveHandle !== ethers.ZeroHash,
    },
    walletEth: ethers.formatEther(ethBalance),
  });

  let wallet: ethers.Wallet | null = null;
  let instance: FhevmInstance | null = null;
  if (action !== "preflight" || readBoolean("LIFECYCLE_DECRYPT_PRIVATE")) {
    const keystore = fs.readFileSync(requiredEnvironment("LIFECYCLE_KEYSTORE_PATH"), "utf8");
    wallet = (await ethers.Wallet.fromEncryptedJson(keystore, readKeystorePassword())).connect(provider);
    if (wallet.address !== actorAddress) throw new Error(`Keystore address ${wallet.address} does not match ${actorAddress}.`);
    const networkProvider: Eip1193Provider = {
      request: async ({ method, params }) => {
        if (params !== undefined && !Array.isArray(params)) {
          throw new Error(`Unsupported object parameters for JSON-RPC method ${method}.`);
        }
        return provider.send(method, params ?? []);
      },
    };
    printEvidence({ phase: "fhevm-initialization-requested" });
    instance = await initializeFhevm(networkProvider);
  }

  let privateValues: PrivateValues | null = null;
  const privateValueNames = privateValueNamesForAction(action);
  if (instance && wallet && privateValueNames.length > 0) {
    printEvidence({ phase: "private-preflight-requested", requestedValues: privateValueNames });
    privateValues = await decryptPrivateValues(
      instance,
      wallet,
      poolAddress,
      custodyAssetAddress,
      privateHandles,
      privateValueNames
    );
    printEvidence({
      phase: "private-preflight-complete",
      privateValues: disclose
        ? privateValues
        : Object.fromEntries(
            Object.entries(privateValues).map(([name, value]) => [`${name}IsZero`, value === 0n])
          ),
    });
  }

  if (action === "preflight" || action === "reveal-prize") return;
  if (!wallet || !instance) throw new Error("The signing context was not initialized.");
  const numericDecimals = Number(decimals);
  const amountLabel = action === "claim-prize" || action === "activate" || action === "deactivate"
    ? "auto"
    : action === "draw"
      ? ethers.formatUnits(drawPrizeAmount, numericDecimals)
      : requiredEnvironment("LIFECYCLE_AMOUNT").trim();
  const expectedConfirmation = buildConfirmationPhrase(action, amountLabel, currentDrawId, poolAddress, actorAddress);
  if (requiredEnvironment("LIFECYCLE_CONFIRM") !== expectedConfirmation) {
    throw new Error(`Write confirmation mismatch. Set LIFECYCLE_CONFIRM exactly to: ${expectedConfirmation}`);
  }

  const signedPool = pool.connect(wallet) as ethers.Contract;
  const signedToken = token.connect(wallet) as ethers.Contract;

  if (action === "activate") {
    const activation = await pool.getPendingParticipantActivation(actorAddress) as {
      eligibilityHandle: string;
      active: boolean;
      requestHash: string;
    };
    if (!activation.active) throw new Error("This wallet has no pending participant activation.");
    const decrypted = await instance.publicDecrypt([activation.eligibilityHandle]);
    const eligible = readClearBoolean(decrypted.clearValues, activation.eligibilityHandle);
    const transaction = await signedPool.finalizeParticipantActivation(
      actorAddress,
      eligible,
      decrypted.decryptionProof
    );
    const receipt = requireConfirmedReceipt(await transaction.wait());
    const event = parseReceiptEvent(receipt, pool, "ParticipantActivationFinalized");
    if (!event || event.args.requestHash !== activation.requestHash) {
      throw new Error("Confirmed receipt is missing the expected participant activation result.");
    }
    printEvidence({
      phase: "participant-activation-finalized",
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      eligible,
      requestHash: activation.requestHash,
    });
    return;
  }

  if (action === "deactivate") {
    const deactivation = await pool.getPendingParticipantDeactivation(actorAddress) as {
      zeroBalanceHandle: string;
      active: boolean;
      requestHash: string;
    };
    if (!deactivation.active) throw new Error("This wallet has no pending participant deactivation.");
    const decrypted = await instance.publicDecrypt([deactivation.zeroBalanceHandle]);
    const zeroBalance = readClearBoolean(decrypted.clearValues, deactivation.zeroBalanceHandle);
    const transaction = await signedPool.finalizeParticipantDeactivation(
      actorAddress,
      zeroBalance,
      decrypted.decryptionProof
    );
    const receipt = requireConfirmedReceipt(await transaction.wait());
    const event = parseReceiptEvent(receipt, pool, "ParticipantDeactivationFinalized");
    if (!event || event.args.requestHash !== deactivation.requestHash) {
      throw new Error("Confirmed receipt is missing the expected participant deactivation result.");
    }
    printEvidence({
      phase: "participant-deactivation-finalized",
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      zeroBalance,
      participantCount: event.args.participantCount,
      requestHash: deactivation.requestHash,
    });
    return;
  }

  if (action === "deposit") {
    const walletBalance = requiredPrivateValue(privateValues, "walletBalance");
    const amount = parseLifecycleAmount(process.env.LIFECYCLE_AMOUNT, numericDecimals);
    if (walletBalance < amount) throw new Error("The confidential wallet balance cannot cover the deposit.");
    const encrypted = await instance.createEncryptedInput(custodyAssetAddress, actorAddress).add64(amount).encrypt();
    const data = ethers.AbiCoder.defaultAbiCoder().encode(["bytes32"], [await pool.DEPOSIT_ACTION()]);
    const transaction = await signedToken.confidentialTransferAndCall(
      poolAddress,
      ethers.hexlify(encrypted.handles[0]),
      ethers.hexlify(encrypted.inputProof),
      data
    );
    const receipt = requireConfirmedReceipt(await transaction.wait());
    const event = parseReceiptEvent(receipt, pool, "Deposited");
    if (!event || ethers.getAddress(event.args.user) !== actorAddress) throw new Error("Confirmed receipt is missing the expected Deposited event.");
    printEvidence({ phase: "deposit-confirmed", transactionHash: receipt.hash, blockNumber: receipt.blockNumber, actor: actorAddress });

    const activation = await pool.getPendingParticipantActivation(actorAddress) as {
      eligibilityHandle: string;
      active: boolean;
      requestHash: string;
    };
    if (!activation.active) throw new Error("Confirmed deposit did not create a participant activation request.");
    const decrypted = await instance.publicDecrypt([activation.eligibilityHandle]);
    const eligible = readClearBoolean(decrypted.clearValues, activation.eligibilityHandle);
    const activationTransaction = await signedPool.finalizeParticipantActivation(
      actorAddress,
      eligible,
      decrypted.decryptionProof
    );
    const activationReceipt = requireConfirmedReceipt(await activationTransaction.wait());
    const activationEvent = parseReceiptEvent(activationReceipt, pool, "ParticipantActivationFinalized");
    if (!activationEvent || activationEvent.args.requestHash !== activation.requestHash) {
      throw new Error("Confirmed receipt is missing the expected participant activation result.");
    }
    printEvidence({
      phase: "participant-activation-finalized",
      transactionHash: activationReceipt.hash,
      blockNumber: activationReceipt.blockNumber,
      eligible,
      requestHash: activation.requestHash,
    });
    return;
  }

  if (action === "draw") {
    const amount = drawPrizeAmount;
    const requestTransaction = await signedPool.requestDraw(amount);
    const requestReceipt = requireConfirmedReceipt(await requestTransaction.wait());
    const requestedEvent = parseReceiptEvent(requestReceipt, pool, "DrawRequested");
    if (!requestedEvent) throw new Error("Confirmed receipt is missing DrawRequested.");
    printEvidence({
      phase: "draw-request-confirmed",
      transactionHash: requestReceipt.hash,
      blockNumber: requestReceipt.blockNumber,
      requestHash: requestedEvent.args.requestHash,
    });

    const request = await pool.getPendingDraw() as {
      totalHandle: string;
      reserveHandle: string;
      readinessHandle: string;
      prizeAmount: bigint;
      active: boolean;
      requestHash: string;
    };
    if (!request.active || request.requestHash !== requestedEvent.args.requestHash) throw new Error("Pending draw does not match the confirmed request.");
    const decrypted = await instance.publicDecrypt([request.readinessHandle]);
    const ready = readClearBoolean(decrypted.clearValues, request.readinessHandle);

    const finalizeTransaction = await signedPool.finalizeDraw(ready, decrypted.decryptionProof);
    const finalizeReceipt = requireConfirmedReceipt(await finalizeTransaction.wait());
    const executedEvent = parseReceiptEvent(finalizeReceipt, pool, "DrawExecuted");
    const skippedEvent = parseReceiptEvent(finalizeReceipt, pool, "DrawSkipped");
    if (skippedEvent?.args.requestHash === request.requestHash) {
      printEvidence({
        phase: "draw-skipped",
        requestTransactionHash: requestReceipt.hash,
        finalizeTransactionHash: finalizeReceipt.hash,
        blockNumber: finalizeReceipt.blockNumber,
        requiredPrizeAmount: skippedEvent.args.requiredPrizeAmount,
        readiness: false,
      });
      return;
    }
    if (!executedEvent || executedEvent.args.requestHash !== request.requestHash) {
      throw new Error("Confirmed receipt is missing the expected DrawExecuted or DrawSkipped event.");
    }
    printEvidence({
      phase: "draw-finalized",
      requestTransactionHash: requestReceipt.hash,
      finalizeTransactionHash: finalizeReceipt.hash,
      blockNumber: finalizeReceipt.blockNumber,
      drawId: executedEvent.args.drawId,
      prizeAmount: executedEvent.args.prizeAmount,
      participantCount: executedEvent.args.participantCount,
      readiness: true,
    });
    return;
  }

  const withdrawalAmount = action === "claim-prize"
    ? requiredPrivateValue(privateValues, "prize")
    : parseLifecycleAmount(process.env.LIFECYCLE_AMOUNT, numericDecimals);
  if (action === "claim-prize" && withdrawalAmount <= 0n) throw new Error("This wallet has no positive prize to claim.");
  const poolPosition = requiredPrivateValue(privateValues, "poolPosition");
  if (poolPosition < withdrawalAmount) throw new Error("The private pool position cannot cover the withdrawal.");
  const encrypted = await instance.createEncryptedInput(poolAddress, actorAddress).add64(withdrawalAmount).encrypt();
  const transaction = await signedPool.withdraw(
    ethers.hexlify(encrypted.handles[0]),
    ethers.hexlify(encrypted.inputProof)
  );
  const receipt = requireConfirmedReceipt(await transaction.wait());
  const event = parseReceiptEvent(receipt, pool, "Withdrawn");
  if (!event || ethers.getAddress(event.args.user) !== actorAddress) throw new Error("Confirmed receipt is missing the expected Withdrawn event.");
  printEvidence({
    phase: action === "claim-prize" ? "prize-claim-confirmed" : "withdrawal-confirmed",
    transactionHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    actor: actorAddress,
    disclosedAmount: disclose ? withdrawalAmount : "redacted",
  });
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : "";
if (import.meta.url === entryPoint) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
