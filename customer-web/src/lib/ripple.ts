/** Gợn sóng cho mọi nút: gắn 1 listener duy nhất ở gốc, không cần sửa từng <button>. */
import { prefersReducedMotion } from '../hooks/motion';

const CLASS = 'btn-ripple';

function spawn(host: HTMLElement, clientX: number, clientY: number) {
  if (prefersReducedMotion()) return;
  const rect = host.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const ink = document.createElement('span');
  ink.className = CLASS;
  ink.style.width = `${size}px`;
  ink.style.height = `${size}px`;
  ink.style.left = `${clientX - rect.left - size / 2}px`;
  ink.style.top = `${clientY - rect.top - size / 2}px`;
  host.appendChild(ink);
  ink.addEventListener('animationend', () => ink.remove(), { once: true });
}

function onPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement | null;
  const host = target?.closest<HTMLElement>('.btn, [data-ripple]');
  if (!host) return;
  spawn(host, event.clientX, event.clientY);
}

export function mountRipple(): () => void {
  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  return () => document.removeEventListener('pointerdown', onPointerDown);
}
