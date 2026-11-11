"use client";

import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { errorMessage } from "@/api/client";
import { crudApi } from "@/api/services";
import { Button, Field, inputClass, Modal, Notice, Spinner } from "../ui";

export type FieldType = "text" | "number" | "email" | "password" | "boolean" | "select" | "date" | "textarea" | "color";

/** One column of the table and/or one input of the form. `name` is the API field; `label` is Spanish. */
export interface FieldSpec {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string | number; label: string }[];
  inTable?: boolean;
  inForm?: boolean;
  createOnly?: boolean;
  hint?: string;
  step?: string;
  width?: "full";
  format?: (value: unknown, row: Record<string, unknown>) => string;
  defaultValue?: unknown;
}

type Row = Record<string, unknown> & { id: number };

const PAGE_SIZE = 15;
const INPUT_TYPES: Partial<Record<FieldType, string>> = {
  text: "text", number: "number", email: "email", password: "password", date: "date",
};

function initialValue(field: FieldSpec, row?: Row) {
  const value = row ? row[field.name] : field.defaultValue;
  if (field.type === "boolean") return value ?? true;
  if (field.type === "password") return "";
  return value ?? "";
}

/** Turn what was typed in the form into the type the API expects (numbers, null, booleans). */
function normalize(field: FieldSpec, value: unknown): unknown {
  if (field.type === "boolean") return Boolean(value);
  if (value === "" || value === undefined) return null;
  if (field.type === "number") return Number(value);
  if (field.type === "select" && field.options?.length && typeof field.options[0].value === "number") return Number(value);
  return value;
}

/** Generic paginated table with create/edit/delete dialogs, driven by a list of field specs. */
export default function CrudTable({ resource, title, fields, description }: {
  resource: string; title: string; fields: FieldSpec[]; description?: string;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await crudApi.list<Row>(resource, page * PAGE_SIZE, PAGE_SIZE);
      setRows(result.items); setTotal(result.total);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [resource, page]);

  useEffect(() => { void load(); }, [load]);

  const columns = fields.filter((f) => f.inTable !== false && f.type !== "password" && f.type !== "textarea");
  const formFields = (isNew: boolean) => fields.filter((f) => f.inForm !== false && (isNew || !f.createOnly));

  function open(row: Row | "new") {
    const base = row === "new" ? undefined : row;
    setForm(Object.fromEntries(fields.map((f) => [f.name, initialValue(f, base)])));
    setFormError(null);
    setEditing(row);
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const isNew = editing === "new";
    const data: Record<string, unknown> = {};
    for (const field of formFields(isNew)) {
      const value = normalize(field, form[field.name]);
      if (field.type === "password" && !value) continue; // when editing, an empty password means "keep it"
      if (!isNew && JSON.stringify(value) === JSON.stringify(normalize(field, editing[field.name]))) continue;
      if (isNew && value === null && !field.required) continue;
      data[field.name] = value;
    }
    setSaving(true); setFormError(null);
    try {
      if (isNew) await crudApi.create(resource, data);
      else if (Object.keys(data).length) await crudApi.update(resource, editing.id, data);
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setSaving(true);
    try {
      await crudApi.remove(resource, deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setDeleting(null);
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const display = (field: FieldSpec, row: Row) => {
    const value = row[field.name];
    if (field.format) return field.format(value, row);
    if (field.type === "boolean") return value ? "Sí" : "No";
    if (field.type === "select") {
      return field.options?.find((o) => String(o.value) === String(value))?.label ?? (value == null ? "—" : String(value));
    }
    if (field.type === "color") return String(value ?? "");
    if (value == null || value === "") return "—";
    return typeof value === "number" ? value.toLocaleString("es-CO") : String(value);
  };

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isNew = editing === "new";

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title text-2xl">{title}</h2>
          <p className="text-xs text-muted">{description ?? `${total} registros`}</p>
        </div>
        <Button onClick={() => open("new")}><Plus size={16} /> Nuevo</Button>
      </div>
      {error && <div className="mb-3"><Notice kind="error">{error}</Notice></div>}
      <div className="overflow-x-auto rounded-lg border border-line">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-surface-2 text-left text-xs text-muted">
            <tr>
              <th className="px-3 py-2.5 font-medium">ID</th>
              {columns.map((c) => <th key={c.name} className="px-3 py-2.5 font-medium">{c.label}</th>)}
              <th className="px-3 py-2.5 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + 2}><Spinner /></td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={columns.length + 2} className="py-10 text-center text-muted">Sin registros</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id} className="border-t border-line hover:bg-surface-2/60">
                <td className="px-3 py-2 text-muted tabular">{row.id}</td>
                {columns.map((c) => (
                  <td key={c.name} className="max-w-[260px] truncate px-3 py-2" title={display(c, row)}>
                    {c.type === "color"
                      ? <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded" style={{ background: String(row[c.name]) }} />{display(c, row)}</span>
                      : display(c, row)}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button onClick={() => open(row)} className="rounded-md p-1.5 text-ink-2 hover:bg-surface-2" aria-label={`Editar ${row.id}`}><Pencil size={15} /></button>
                  <button onClick={() => setDeleting(row)} className="rounded-md p-1.5 text-[var(--st-red-ink)] hover:bg-surface-2" aria-label={`Eliminar ${row.id}`}><Trash2 size={15} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs text-ink-2">
          <button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-md border border-line p-1 disabled:opacity-40" aria-label="Página anterior"><ChevronLeft size={15} /></button>
          <span className="tabular">Página {page + 1} de {pages}</span>
          <button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-md border border-line p-1 disabled:opacity-40" aria-label="Página siguiente"><ChevronRight size={15} /></button>
        </div>
      )}

      <Modal open={editing !== null} title={isNew ? `Nuevo registro · ${title}` : `Editar #${editing?.id ?? ""}`}
        onClose={() => setEditing(null)} width="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {editing && formFields(isNew).map((field) => (
              <div key={field.name} className={field.type === "textarea" || field.width === "full" ? "sm:col-span-2" : ""}>
                <Field label={`${field.label}${field.required ? " *" : ""}`} hint={field.hint}>
                  <FieldInput field={field} value={form[field.name]} onChange={(v) => setForm({ ...form, [field.name]: v })} isNew={isNew} />
                </Field>
              </div>
            ))}
          </div>
          {formError && <Notice kind="error">{formError}</Notice>}
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button type="submit" loading={saving}>Guardar</Button>
          </div>
        </form>
      </Modal>

      <Modal open={deleting !== null} title="Confirmar eliminación" onClose={() => setDeleting(null)}>
        <p className="text-sm">¿Eliminar el registro <b>#{deleting?.id}</b>? Esta acción no se puede deshacer.</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>Cancelar</Button>
          <Button variant="danger" loading={saving} onClick={remove}><Trash2 size={15} /> Eliminar</Button>
        </div>
      </Modal>
    </div>
  );
}

function FieldInput({ field, value, onChange, isNew }: {
  field: FieldSpec; value: unknown; onChange: (v: unknown) => void; isNew: boolean;
}) {
  const text = value == null ? "" : String(value);
  switch (field.type) {
    case "boolean":
      return (
        <label className="flex h-[38px] items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          Activo
        </label>
      );
    case "select":
      return (
        <select className={inputClass} value={text} onChange={(e) => onChange(e.target.value)} required={field.required}>
          {!field.required && <option value="">— Ninguno —</option>}
          {field.required && !text && <option value="" disabled>Selecciona…</option>}
          {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "textarea":
      return <textarea className={`${inputClass} min-h-[96px]`} value={text} onChange={(e) => onChange(e.target.value)} required={field.required} />;
    case "color":
      return (
        <div className="flex gap-2">
          <input type="color" value={text || "#2a78d6"} onChange={(e) => onChange(e.target.value)} className="h-[38px] w-12 rounded border border-line bg-surface" />
          <input className={inputClass} value={text} onChange={(e) => onChange(e.target.value)} pattern="^#[0-9a-fA-F]{6}$" />
        </div>
      );
    default:
      return (
        <input className={inputClass} value={text} onChange={(e) => onChange(e.target.value)}
          type={INPUT_TYPES[field.type] ?? "text"}
          step={field.step} required={field.required && (field.type !== "password" || isNew)}
          placeholder={field.type === "password" && !isNew ? "Déjala vacía para no cambiarla" : undefined}
          autoComplete={field.type === "password" ? "new-password" : "off"} />
      );
  }
}
