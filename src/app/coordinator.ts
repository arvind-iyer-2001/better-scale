import type { Frame } from '../domain/frame';
import { ReadingSession } from '../domain/session';

/**
 * Groups scale frames into weigh-ins. A weigh-in finishes `windowMs` after its first valid frame
 * (the scale only stays awake ~15 s and iOS may suspend the app), or at disconnect, whichever is first.
 * Valid frames after a finished weigh-in are ignored until the next disconnect.
 */
export class CaptureCoordinator {
  private session = new ReadingSession();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private finished = false;

  constructor(
    private onFinish: (s: ReadingSession) => Promise<void>,
    private windowMs = 3000,
  ) {}

  onFrame(frame: Frame, nowMs: number): void {
    // A weighing (status 1) frame after a finished weigh-in means the user stepped on again: start a new one.
    if (this.finished && frame.status === 1) this.reset();
    if (this.finished) return;
    this.session.push(frame, nowMs);
    if (this.session.result() && !this.timer) {
      this.timer = setTimeout(() => this.finish(), this.windowMs);
    }
  }

  onDisconnect(): void {
    if (!this.finished && this.session.result()) this.finish();
    this.reset();
  }

  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.onFinish(this.session).catch(() => {});
  }

  private reset(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.session = new ReadingSession();
    this.finished = false;
  }
}
