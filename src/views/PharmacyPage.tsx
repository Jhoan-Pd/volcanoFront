"use client";

import { CheckCircle2, ClipboardList, History, Pencil, Pill, Save, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { errorMessage } from "@/api/client";
import { pharmacyApi } from "@/api/services";
import type { Category, MyPharmacy, Pharmacy, WeeklyReport } from "@/api/types";
import BulkUpload from "@/components/pharmacy/BulkUpload";
import RevealedTitle from "@/components/RevealedTitle";
import { Button, Card, CardHeader, Field, inputClass, Modal, Notice, SimulatedBadge, Spinner } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";
import { CATEGORIES, formatDate, formatNumber } from "@/lib/format";

const MAX_UNITS = 100_000;
const SHORT_DATE: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
type FormValues = Record<Category, string>;
type FormErrors = Partial<Record<Category, string>>;

const emptyForm = (categories: Category[]): FormValues =>
  Object.fromEntries(categories.map((c) => [c, ""])) as FormValues;

const weekKey = (week: { year: number; epi_week: number }) => `${week.year}-${week.epi_week}`;
const weekText = (label: string) => label.replace("-S", " · S");

/** Validate in the browser the same rules the API validates (the API always has the last word). */
function validate(values: FormValues): FormErrors {
  const errors: FormErrors = {};
  for (const [category, value] of Object.entries(values) as [Category, string][]) {
    if (value.trim() === "") errors[category] = "Obligatorio (escribe 0 si no hubo ventas)";
    else if (!/^\d+$/.test(value.trim())) errors[category] = "Solo números enteros";
    else if (Number(value) > MAX_UNITS) errors[category] = `Máximo ${formatNumber(MAX_UNITS)}`;
  }
  return errors;
}

export default function PharmacyPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN";
  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [pharmacyId, setPharmacyId] = useState<number | undefined>(undefined);
  const [info, setInfo] = useState<MyPharmacy | null>(null);
  const [history, setHistory] = useState<WeeklyReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [week, setWeek] = useState<string>("");
  const [values, setValues] = useState<FormValues | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [deleting, setDeleting] = useState<WeeklyReport | null>(null);

  // The ADMIN chooses which pharmacy to report for
  useEffect(() => {
    if (!isAdmin) return;
    pharmacyApi.pharmacies().then((all) => {
      setPharmacies(all);
      setPharmacyId((id) => id ?? all[0]?.id);
    }).catch((e) => setError(errorMessage(e)));
  }, [isAdmin]);

  const load = useCallback(async () => {
    if (isAdmin && pharmacyId == null) return;
    try {
      const [pharmacy, reports] = await Promise.all([pharmacyApi.me(pharmacyId), pharmacyApi.history(pharmacyId)]);
      setInfo(pharmacy); setHistory(reports); setError(null);
      setValues((current) => current ?? emptyForm(pharmacy.categories));
      // Default to the first week that is still missing a report
      const pending = pharmacy.reportable_weeks.find((w) => !w.reported) ?? pharmacy.reportable_weeks[0];
      setWeek((current) => current || (pending ? weekKey(pending) : ""));
    } catch (e) {
      setError(errorMessage(e));
    }
  }, [isAdmin, pharmacyId]);

  useEffect(() => { void load(); }, [load]);

  const [selectedYear, selectedWeek] = week ? week.split("-").map(Number) : [0, 0];
  const existing = useMemo(
    () => history?.find((r) => r.year === selectedYear && r.epi_week === selectedWeek) ?? null,
    [history, selectedYear, selectedWeek],
  );

  // Choosing a week that was already reported loads its values to edit them
  useEffect(() => {
    if (!info) return;
    const form = emptyForm(info.categories);
    if (existing) for (const item of existing.items) form[item.category] = String(item.units);
    setValues(form); setErrors({}); setFeedback(null);
  }, [existing, info]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!values || !info) return;
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;
    const items = info.categories.map((category) => ({ category, units: Number(values[category]) }));
    setSaving(true); setFeedback(null);
    try {
      if (existing) await pharmacyApi.update(selectedYear, selectedWeek, items, pharmacyId);
      else await pharmacyApi.create({ year: selectedYear, epi_week: selectedWeek, items }, pharmacyId);
      setFeedback({ kind: "ok", text: existing ? "Reporte actualizado." : "Reporte registrado. ¡Gracias por reportar!" });
      await load();
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await pharmacyApi.remove(deleting.year, deleting.epi_week, pharmacyId);
      setDeleting(null);
      await load();
    } catch (err) {
      setFeedback({ kind: "error", text: errorMessage(err) });
      setDeleting(null);
    }
  }

  function edit(report: WeeklyReport) {
    setWeek(weekKey(report));
    document.getElementById("report-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const chartRows = useMemo(
    () => [...(history ?? [])].reverse().map((r) => ({ label: weekText(r.label), total: r.total_units })),
    [history],
  );

  if (error && !info) return <Notice kind="error">{error}</Notice>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="section-title text-[13px] text-muted">Panel de farmacia</p>
          <RevealedTitle className="display-title mt-2 text-[2.6rem] sm:text-6xl" text={info?.name ?? "Cargando…"} />
          {info && <p className="mt-1 text-sm text-ink-2">{info.municipality} · NIT {info.tax_id}{info.address ? ` · ${info.address}` : ""}</p>}
        </div>
        {isAdmin && (
          <label className="w-full md:w-72">
            <span className="mb-1 block text-xs font-medium text-ink-2">Reportar como (solo administrador)</span>
            <select className={inputClass} value={pharmacyId ?? ""} onChange={(e) => {
              setPharmacyId(Number(e.target.value)); setWeek(""); setValues(null); setInfo(null); setHistory(null);
            }}>
              {pharmacies.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
        )}
      </div>

      {!info ? <Spinner /> : (
        <div className="grid gap-6 lg:grid-cols-5">
          <Card className="min-w-0 lg:col-span-3">
            <div id="report-form" className="scroll-mt-20" />
            <CardHeader title={existing ? "Editar reporte semanal" : "Nuevo reporte semanal"} icon={<ClipboardList size={17} />}
              subtitle="Unidades vendidas en la semana epidemiológica (domingo a sábado). Puedes registrar o corregir las últimas 8 semanas." />
            <form onSubmit={save} className="space-y-4 px-5 pb-5" noValidate>
              <Field label="Semana epidemiológica">
                <select className={inputClass} value={week} onChange={(e) => setWeek(e.target.value)}>
                  {info.reportable_weeks.map((w) => (
                    <option key={w.label} value={weekKey(w)}>
                      {w.label.replace("-S", " · semana ")} ({formatDate(w.start_date, SHORT_DATE)} – {formatDate(w.end_date, SHORT_DATE)}){w.reported ? " ✓ reportada" : ""}
                    </option>
                  ))}
                </select>
              </Field>
              {existing && (
                <Notice>Esta semana ya fue reportada{existing.reported_by ? ` por ${existing.reported_by}` : ""}. Al guardar se reemplazan los valores.</Notice>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {values && info.categories.map((category) => (
                  <Field key={category} label={CATEGORIES[category]?.label ?? category} hint={errors[category] ?? CATEGORIES[category]?.hint}>
                    <input inputMode="numeric" className={`${inputClass} tabular ${errors[category] ? "border-[var(--st-red)]" : ""}`}
                      aria-invalid={Boolean(errors[category])} value={values[category]} placeholder="0"
                      onChange={(e) => setValues({ ...values, [category]: e.target.value.replace(/[^\d]/g, "") })} />
                  </Field>
                ))}
              </div>
              {feedback && <Notice kind={feedback.kind}>{feedback.text}</Notice>}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" loading={saving} disabled={!info.active}>
                  <Save size={15} /> {existing ? "Guardar cambios" : "Registrar reporte"}
                </Button>
                {!info.active && <span className="text-xs text-muted">La farmacia está inactiva.</span>}
              </div>
            </form>
          </Card>

          <Card className="min-w-0 lg:col-span-2">
            <CardHeader title="Unidades por semana" icon={<Pill size={17} />} subtitle="Total de todas las categorías (últimas 26 semanas)" />
            <div className="h-64 px-3 pb-4">
              {chartRows.length === 0 ? <p className="py-10 text-center text-sm text-muted">Aún no hay reportes.</p> : (
                <ResponsiveContainer>
                  <BarChart data={chartRows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid stroke="var(--line)" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={{ stroke: "var(--axis)" }} minTickGap={24} />
                    <YAxis tickLine={false} axisLine={false} width={44} allowDecimals={false} />
                    <Tooltip cursor={{ fill: "var(--surface-2)" }} formatter={(v) => [formatNumber(Number(v)), "Unidades"]}
                      contentStyle={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: 12, fontSize: 12 }} />
                    <Bar dataKey="total" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={18} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Card>
        </div>
      )}

      {info && <BulkUpload pharmacyId={isAdmin ? pharmacyId : undefined} onDone={load} />}

      <Card>
        <CardHeader title="Historial de reportes" icon={<History size={17} />} subtitle="Las semanas antiguas solo las puede corregir el administrador." />
        {history == null ? <Spinner /> : history.length === 0 ? (
          <p className="px-5 pb-6 text-sm text-muted">Sin reportes todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs text-muted">
                  <th className="px-5 py-2 font-medium">Semana</th>
                  {info?.categories.map((c) => <th key={c} className="px-2 py-2 text-right font-medium">{CATEGORIES[c]?.label ?? c}</th>)}
                  <th className="px-2 py-2 text-right font-medium">Total</th>
                  <th className="px-2 py-2 font-medium">Origen</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {history.map((report) => {
                  const unitsByCategory = Object.fromEntries(report.items.map((item) => [item.category, item.units]));
                  return (
                    <tr key={report.label} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-2.5">
                        <p className="font-medium tabular">{weekText(report.label)}</p>
                        <p className="text-[11px] text-muted">{formatDate(report.start_date, SHORT_DATE)}</p>
                      </td>
                      {info?.categories.map((c) => <td key={c} className="px-2 py-2.5 text-right tabular">{formatNumber(unitsByCategory[c])}</td>)}
                      <td className="px-2 py-2.5 text-right font-semibold tabular">{formatNumber(report.total_units)}</td>
                      <td className="px-2 py-2.5 text-xs">
                        {report.is_simulated ? <SimulatedBadge /> : (
                          <span className="inline-flex items-center gap-1 text-ink-2">
                            <CheckCircle2 size={13} className="text-[var(--st-green)]" />{report.reported_by ?? "Reportado"}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {report.editable && (
                          <div className="flex justify-end gap-1">
                            <button onClick={() => edit(report)} className="rounded-md p-1.5 text-ink-2 hover:bg-surface-2" aria-label={`Editar ${report.label}`} title="Editar"><Pencil size={15} /></button>
                            <button onClick={() => setDeleting(report)} className="rounded-md p-1.5 text-[var(--st-red-ink)] hover:bg-surface-2" aria-label={`Eliminar ${report.label}`} title="Eliminar"><Trash2 size={15} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={deleting != null} title="Eliminar reporte" onClose={() => setDeleting(null)}>
        <p className="text-sm text-ink-2">
          ¿Seguro que quieres eliminar el reporte de la semana <b>{deleting ? weekText(deleting.label) : ""}</b>? Esta acción no se puede deshacer.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="danger" onClick={confirmDelete}><Trash2 size={15} /> Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}
