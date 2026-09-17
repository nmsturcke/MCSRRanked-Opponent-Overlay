type Step = 'username' | 'generate' | 'copy' | 'toolscreen';

/** One visual cue at a time; decoration never intercepts clicks or moves focus. */
export class SetupGuide {
  private current: Step | null = null;
  private particles = document.createElement('span');

  constructor(private targets: Record<Step, HTMLElement>) {
    this.particles.className = 'guide-particles';
    this.particles.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) this.particles.append(document.createElement('i'));
  }

  show(step: Step): void {
    if (this.current === step) return;
    if (this.current) this.targets[this.current].classList.remove('next-step');
    this.particles.remove();
    this.current = step;
    const target = this.targets[step];
    target.classList.add('next-step');
    target.append(this.particles.cloneNode(true));
    // Keep only the new layer so each step starts its own short particle animation.
    this.particles = target.lastElementChild as HTMLSpanElement;
  }
}
