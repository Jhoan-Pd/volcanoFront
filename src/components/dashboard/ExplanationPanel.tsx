"use client";

import { ArrowDownRight, ArrowUpRight, HelpCircle } from "lucide-react";
import type { PredictionExplanation } from "@/api/types";
import { featureGroupLabel, formatNumber } from "@/lib/format";
import { Card, CardHeader, LevelChip } from "../ui";

/**
 * "¿Por qué este nivel de riesgo?" — local explainability of the prediction.
 * Each bar is how many cases a group of variables contributes compared with its typical value in
 * the municipality (occlusion method). To the right it pushes the prediction up.
 * The explanation arrives already computed in the props (the ISR page fetched it on the server).
 */
export default function ExplanationPanel({ explanation }: { explanation: PredictionExplanation | null }) {
  // Groups with no appreciable effect and nothing to tell are summarized in one line
  const all = explanation?.factors ?? [];
  const factors = all.filter((f) => Math.abs(f.contribution) >= 0.05 || f.message);
  const noEffect = all.filter((f) => !factors.includes(f)).map((f) => f.group_label.toLowerCase());
  const largest = Math.max(0.01, ...factors.map((f) => Math.abs(f.contribution)));
  const globalGroups = Object.entries(explanation?.global_importance?.groups ?? {}).slice(0, 3);

  return (
    <Card className="min-w-0">
      <CardHeader title="¿Por qué este nivel de riesgo?" icon={<HelpCircle size={17} />}
        subtitle={explanation
          ? `${explanation.disease} · ${explanation.municipality} · semana ${explanation.label.replace(/^\d+-/, "")}`
          : "Explicación de la predicción"}
        action={explanation && <LevelChip level={explanation.level} />} />
      <div className="px-5 pb-5">
        {!explanation ? (
          <p className="py-6 text-center text-sm text-muted">Aún no hay predicciones para explicar. Un administrador debe entrenar el modelo.</p>
        ) : (
          <>
            <p className="text-sm text-ink">{explanation.summary}</p>
            <div className="mt-4 space-y-2.5" role="list" aria-label="Aporte de cada grupo de variables, en casos">
              {factors.map((f) => {
                const width = `${(Math.abs(f.contribution) / largest) * 50}%`;
                const rises = f.contribution > 0;
                return (
                  <div key={f.group} role="listitem">
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="font-medium text-ink">{f.group_label}</span>
                      <span className="flex items-center gap-0.5 text-ink-2 tabular">
                        {f.direction === "up" ? <ArrowUpRight size={12} aria-hidden />
                          : f.direction === "down" ? <ArrowDownRight size={12} aria-hidden /> : null}
                        {f.contribution > 0 ? "+" : f.contribution < 0 ? "−" : ""}{formatNumber(Math.abs(f.contribution), 1)} casos
                      </span>
                    </div>
                    <div className="relative mt-1 h-2 rounded-full bg-surface-2">
                      <span className="absolute inset-y-[-3px] left-1/2 w-px" style={{ background: "var(--axis)" }} aria-hidden />
                      {f.contribution !== 0 && (
                        <span className="absolute inset-y-0 rounded-full"
                          style={{ width, left: rises ? "50%" : undefined, right: rises ? undefined : "50%",
                                   background: rises ? "var(--series-2)" : "var(--series-1)" }} />
                      )}
                    </div>
                    {f.message && <p className="mt-1 text-[11px] text-muted">{f.message}</p>}
                  </div>
                );
              })}
            </div>
            {noEffect.length > 0 && <p className="mt-3 text-[11px] text-muted">Sin efecto apreciable esta semana: {noEffect.join(", ")}.</p>}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line pt-3 text-[11px] text-ink-2">
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full" style={{ background: "var(--series-2)" }} />Empuja hacia arriba</span>
              <span className="flex items-center gap-1.5"><span className="h-2 w-4 rounded-full" style={{ background: "var(--series-1)" }} />Empuja hacia abajo</span>
              {globalGroups.length > 0 && (
                <span className="text-muted">
                  En general, lo que más pesa en el modelo:{" "}
                  {globalGroups.map(([group, pct]) => `${featureGroupLabel(group).toLowerCase()} (${formatNumber(pct, 0)} %)`).join(", ")}.
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
