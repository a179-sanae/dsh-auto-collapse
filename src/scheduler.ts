/** One coalesced frame, with a background-tab fallback; no polling/audit loop. */
export class Scheduler {
  private frame = 0
  private timeout = 0
  private disposed = false
  constructor(private readonly run: () => void) {}

  schedule(): void {
    if (this.disposed || this.frame !== 0 || this.timeout !== 0) return
    const flush = () => {
      if (this.frame !== 0) cancelAnimationFrame(this.frame)
      if (this.timeout !== 0) clearTimeout(this.timeout)
      this.frame = this.timeout = 0
      if (!this.disposed) this.run()
    }
    this.frame = requestAnimationFrame(flush)
    this.timeout = window.setTimeout(flush, 60)
  }

  dispose(): void {
    this.disposed = true
    if (this.frame !== 0) cancelAnimationFrame(this.frame)
    if (this.timeout !== 0) clearTimeout(this.timeout)
    this.frame = this.timeout = 0
  }
}
