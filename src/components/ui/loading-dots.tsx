export function LoadingDots() {
  return (
    <span className="inline-flex gap-[2px]">
      <span className="animate-pulse">.</span>
      <span className="animate-pulse delay-150">.</span>
      <span className="animate-pulse delay-300">.</span>
    </span>
  );
}