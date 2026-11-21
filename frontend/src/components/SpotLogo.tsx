/** Logo SPOT (public/spot_logo.png, průhledné pozadí, poměr stran 956 × 774). */
export default function SpotLogo({ className = "h-14" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/spot_logo.png" alt="SPOT" width={956} height={774} className={`w-auto ${className}`} />;
}
