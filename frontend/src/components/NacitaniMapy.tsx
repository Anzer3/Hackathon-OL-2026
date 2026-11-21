/** Načítací kolečko přes celou plochu mapy; po načtení se plynule skryje. */
export default function NacitaniMapy({ viditelne = true }: { viditelne?: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!viditelne}
      className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-50 transition-opacity duration-500 ${
        viditelne ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-brand-500" />
      <p className="text-xs font-medium text-slate-500">Načítám mapu…</p>
    </div>
  );
}
