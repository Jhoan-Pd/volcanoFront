import type { MunicipalityRisk } from "@/api/types";
import { LEVEL_ORDER, LEVELS } from "@/lib/format";

/** Legend overlaid on both maps. */
export function MapLegend({ className }: { className: string }) {
  return (
    <ul className={`pointer-events-none absolute left-2 flex flex-wrap gap-x-3 gap-y-1 rounded-lg border border-line bg-surface/90 px-2.5 py-1.5 text-[11px] text-ink-2 backdrop-blur ${className}`}
      aria-label="Leyenda del mapa">
      {LEVEL_ORDER.map((level) => (
        <li key={level} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: LEVELS[level].color }} />{LEVELS[level].label}
        </li>
      ))}
    </ul>
  );
}

/** Current and predicted level of every disease in one municipality (popup of both maps). */
export function LevelsTable({ row, diseases, className = "" }: {
  row: MunicipalityRisk; diseases: { code: string; name: string }[]; className?: string;
}) {
  return (
    <table className={`text-xs ${className}`}>
      <thead>
        <tr>
          <th className="pr-3 text-left font-medium">Enfermedad</th>
          <th className="pr-3 text-left font-medium">Actual</th>
          <th className="text-left font-medium">4 semanas</th>
        </tr>
      </thead>
      <tbody>
        {diseases.map((d) => (
          <tr key={d.code}>
            <td className="pr-3">{d.name}</td>
            <td className="pr-3">{LEVELS[row.levels[d.code] ?? "GREEN"].label}</td>
            <td>{row.predicted_levels[d.code] ? LEVELS[row.predicted_levels[d.code]].label : "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
