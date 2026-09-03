import { BaseActivityProvider } from "./base";

export class ManualProvider extends BaseActivityProvider {
  name = "manual";

  isAvailable(): boolean {
    return true;
  }

  async start(): Promise<void> {
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  addSteps(count: number) {
    if (count > 0) this.emit(count);
  }
}
