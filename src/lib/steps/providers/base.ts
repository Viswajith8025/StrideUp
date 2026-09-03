export interface ActivityProvider {
  name: string;
  isAvailable(): boolean;
  start(): Promise<void>;
  stop(): void;
  onSteps(callback: (steps: number) => void): void;
}

export abstract class BaseActivityProvider implements ActivityProvider {
  abstract name: string;
  protected callback: ((steps: number) => void) | null = null;
  protected running = false;

  onSteps(callback: (steps: number) => void) {
    this.callback = callback;
  }

  protected emit(steps: number) {
    this.callback?.(steps);
  }

  abstract isAvailable(): boolean;
  abstract start(): Promise<void>;
  abstract stop(): void;
}
