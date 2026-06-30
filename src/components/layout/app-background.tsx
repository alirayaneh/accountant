'use client';

export function AppBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10" aria-hidden>
      <div className="absolute inset-0 app-bg-gradient" />
      <div className="absolute inset-0 app-bg-grid" />
    </div>
  );
}
