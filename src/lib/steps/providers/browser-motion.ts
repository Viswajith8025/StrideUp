import { BaseActivityProvider } from "./base";
import {
  createStepDetector,
  type StepDetector,
  type StepDetectorConfig,
} from "@/lib/steps/detection/detector";

export type MotionPermissionState = "unknown" | "granted" | "denied" | "unsupported" | "prompt";

function hasRequestPermission(): boolean {
  return (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof (DeviceMotionEvent as unknown as { requestPermission?: unknown }).requestPermission ===
      "function"
  );
}

export async function queryMotionPermission(): Promise<MotionPermissionState> {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
    return "unsupported";
  }
  if (!hasRequestPermission()) {
    // Non-iOS: listening is allowed without a prompt
    return "granted";
  }
  // iOS does not expose a query API — treat as prompt until user taps
  return "prompt";
}

/**
 * Must be called from a direct user gesture on iOS.
 */
export async function requestMotionPermission(): Promise<MotionPermissionState> {
  if (typeof window === "undefined" || !("DeviceMotionEvent" in window)) {
    return "unsupported";
  }
  if (!hasRequestPermission()) return "granted";
  try {
    const result = await (
      DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }
    ).requestPermission();
    return result === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

export class BrowserMotionProvider extends BaseActivityProvider {
  name = "motion";
  private detector: StepDetector;
  private handler: ((e: DeviceMotionEvent) => void) | null = null;
  private permission: MotionPermissionState = "unknown";

  constructor(config?: Partial<StepDetectorConfig>) {
    super();
    this.detector = createStepDetector(config);
  }

  isAvailable(): boolean {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  }

  getPermission(): MotionPermissionState {
    return this.permission;
  }

  /** Configure detector (e.g. sensitivity) — resets internal filter state. */
  reconfigure(config?: Partial<StepDetectorConfig>) {
    const wasRunning = this.running;
    if (wasRunning) this.stop();
    this.detector = createStepDetector({ ...this.detector.config, ...config });
    if (wasRunning) void this.start({ permissionAlreadyGranted: true });
  }

  getDetectorState() {
    return this.detector.state;
  }

  /**
   * Start listening. On iOS, call {@link requestMotionPermission} from a tap first,
   * then pass permissionAlreadyGranted: true.
   */
  async start(opts?: { permissionAlreadyGranted?: boolean }): Promise<void> {
    if (!this.isAvailable() || this.running) return;

    if (!opts?.permissionAlreadyGranted && hasRequestPermission()) {
      // Do not prompt from non-gesture contexts — leave stopped
      this.permission = "prompt";
      return;
    }

    if (opts?.permissionAlreadyGranted) {
      this.permission = "granted";
    } else if (!hasRequestPermission()) {
      this.permission = "granted";
    }

    this.detector.reset();
    this.handler = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (acc?.x == null || acc?.y == null || acc?.z == null) return;
      const t = typeof event.timeStamp === "number" && event.timeStamp > 0
        ? event.timeStamp
        : performance.now();
      const steps = this.detector.push({ x: acc.x, y: acc.y, z: acc.z, t });
      if (steps > 0) this.emit(steps);
    };

    window.addEventListener("devicemotion", this.handler);
    this.running = true;
  }

  stop(): void {
    if (this.handler) {
      window.removeEventListener("devicemotion", this.handler);
      this.handler = null;
    }
    this.running = false;
  }

  /** Soft restart after visibility resume — fresh warm-up, keep listener. */
  softReset(): void {
    this.detector.reset();
  }
}
