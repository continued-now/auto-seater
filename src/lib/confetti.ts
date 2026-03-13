import confetti from 'canvas-confetti';

export function fireConfetti() {
  confetti({
    particleCount: 80,
    spread: 60,
    origin: { y: 0.7 },
    colors: ['#2563EB', '#16A34A', '#0D9488', '#D97706'],
    disableForReducedMotion: true,
  });
}

export function fireConfettiSides() {
  const end = Date.now() + 500;
  const frame = () => {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors: ['#2563EB', '#16A34A', '#0D9488'], disableForReducedMotion: true });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors: ['#2563EB', '#16A34A', '#0D9488'], disableForReducedMotion: true });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();
}
