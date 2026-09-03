import { BaseActivityProvider } from "./base";

const MIN_STEP_INTERVAL_MS = 300;
const ACCEL_THRESHOLD = 1.2;
const DEBOUNCE_MS = 150;

export class BrowserMotionProvider extends BaseActivityProvider {
  name = "motion";
  private lastStepTime = 0;
  private lastMagnitude = 0;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private handler: ((e: DeviceMotionEvent) => void) | null = null;

  isAvailable(): boolean {
    return typeof window !== "undefined" && "DeviceMotionEvent" in window;
  }

  async start(): Promise<void> {
    if (!this.isAvailable() || this.running) return;

    if (typeof (DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission === "function") {
      const permission = await (DeviceMotionEvent as unknown as { requestPermission: () => Promise<string> }).requestPermission();
      if (permission !== "granted") return;
    }

    this.handler = (event: DeviceMotionEvent) => {
      const acc = event.accelerationIncludingGravity;
      if (!acc?.x || !acc?.y || !acc?.z) return;

      const magnitude = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
      const delta = Math.abs(magnitude - this.lastMagnitude);
      this.lastMagnitude = magnitude;

      if (delta < ACCEL_THRESHOLD) return;

      const now = Date.now();
      if (now - this.lastStepTime < MIN_STEP_INTERVAL_MS) return;

      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.lastStepTime = Date.now();
        this.emit(1);
      }, DEBOUNCE_MS);
    };

    window.addEventListener("devicemotion", this.handler);
    this.running = true;
  }

  stop(): void {
    if (this.handler) {
      window.removeEventListener("devicemotion", this.handler);
      this.handler = null;
    }
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.running = false;
  }
}
