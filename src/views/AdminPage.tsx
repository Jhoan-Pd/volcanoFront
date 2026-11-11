"use client";

import { BellRing, BrainCircuit, Bug, Database, MapPin, Mountain, Pill, Users } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { catalogApi } from "@/api/services";
import type { Municipality } from "@/api/types";
import AlertsPanel from "@/components/admin/AlertsPanel";
import CrudTable, { type FieldSpec } from "@/components/admin/CrudTable";
import DataPanel from "@/components/admin/DataPanel";
import ModelPanel from "@/components/admin/ModelPanel";
import RevealedTitle from "@/components/RevealedTitle";
import { Card } from "@/components/ui";
import { EVENT_TYPES, LEVEL_NAMES, LEVEL_ORDER, ROLES } from "@/lib/format";

const options = <K extends string>(labels: Record<K, string>) =>
  (Object.entries(labels) as [K, string][]).map(([value, label]) => ({ value, label }));

const LEVEL_OPTIONS = LEVEL_ORDER.map((level) => ({ value: level, label: LEVEL_NAMES[level] }));
const EVENT_TYPE_OPTIONS = options(EVENT_TYPES);
const ROLE_OPTIONS = options(ROLES);

type CrudTab = "diseases" | "municipalities" | "pharmacies" | "users" | "events";
type Tab = CrudTab | "data" | "model" | "alerts";

interface CrudConfig { title: string; resource: string; fields: FieldSpec[]; description?: string }

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "diseases", label: "Enfermedades", icon: <Bug size={15} /> },
  { id: "municipalities", label: "Municipios", icon: <MapPin size={15} /> },
  { id: "pharmacies", label: "Farmacias", icon: <Pill size={15} /> },
  { id: "users", label: "Usuarios", icon: <Users size={15} /> },
  { id: "events", label: "Eventos volcánicos", icon: <Mountain size={15} /> },
  { id: "data", label: "Fuentes de datos", icon: <Database size={15} /> },
  { id: "model", label: "Modelo", icon: <BrainCircuit size={15} /> },
  { id: "alerts", label: "Alertas", icon: <BellRing size={15} /> },
];

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("diseases");
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);

  useEffect(() => { catalogApi.municipalities().then(setMunicipalities).catch(() => undefined); }, []);
  const municipalityOptions = useMemo(() => municipalities.map((m) => ({ value: m.id, label: m.name })), [municipalities]);

  // `name` is the API field (English); `label` and `hint` are what the administrator reads (Spanish)
  const crud: Record<CrudTab, CrudConfig> = {
    diseases: {
      title: "Enfermedades", resource: "diseases",
      description: "Los umbrales son los percentiles del canal endémico que definen el semáforo.",
      fields: [
        { name: "code", label: "Código", type: "text", required: true, hint: "Mayúsculas, ej. IRA" },
        { name: "name", label: "Nombre", type: "text", required: true },
        { name: "icd10_code", label: "CIE-10", type: "text" },
        { name: "color", label: "Color", type: "color", defaultValue: "#2a78d6" },
        { name: "yellow_threshold_pct", label: "P. amarillo", type: "number", defaultValue: 50 },
        { name: "orange_threshold_pct", label: "P. naranja", type: "number", defaultValue: 75 },
        { name: "red_threshold_pct", label: "P. rojo", type: "number", defaultValue: 90 },
        { name: "search_terms", label: "Términos de búsqueda", type: "text", inTable: false, hint: "Separados por coma (Google Trends)", width: "full" },
        { name: "sivigila_codes", label: "Códigos SIVIGILA", type: "text", inTable: false, hint: "Eventos INS separados por coma, ej. 210,220" },
        { name: "pharmacy_categories", label: "Categorías de farmacia", type: "text", inTable: false, hint: "Ej. COLD_FLU,ANTIPYRETICS" },
        { name: "description", label: "Descripción", type: "textarea" },
        { name: "recommendations", label: "Recomendaciones (una por línea)", type: "textarea" },
        { name: "active", label: "Activa", type: "boolean" },
      ],
    },
    municipalities: {
      title: "Municipios", resource: "municipalities",
      fields: [
        { name: "divipola_code", label: "DIVIPOLA", type: "text", required: true, hint: "5 dígitos" },
        { name: "name", label: "Nombre", type: "text", required: true },
        { name: "department", label: "Departamento", type: "text", defaultValue: "Nariño", inTable: false },
        { name: "latitude", label: "Latitud", type: "number", required: true, step: "any" },
        { name: "longitude", label: "Longitud", type: "number", required: true, step: "any" },
        { name: "altitude_m", label: "Altitud (m)", type: "number" },
        { name: "population", label: "Población", type: "number", required: true },
        { name: "crater_distance_km", label: "Dist. cráter (km)", type: "number", step: "any" },
        { name: "active", label: "Activo", type: "boolean" },
      ],
    },
    pharmacies: {
      title: "Farmacias", resource: "pharmacies",
      description: "Farmacias de demostración (ficticias). El usuario asignado debe tener rol Farmacia.",
      fields: [
        { name: "name", label: "Nombre", type: "text", required: true },
        { name: "tax_id", label: "NIT", type: "text", required: true, hint: "Ej. 900123456-7" },
        { name: "municipality_id", label: "Municipio", type: "select", required: true, options: municipalityOptions },
        { name: "address", label: "Dirección", type: "text" },
        { name: "phone", label: "Teléfono", type: "text" },
        { name: "user_id", label: "ID usuario", type: "number", hint: "Usuario con rol Farmacia (opcional)" },
        { name: "latitude", label: "Latitud", type: "number", step: "any", inTable: false },
        { name: "longitude", label: "Longitud", type: "number", step: "any", inTable: false },
        { name: "active", label: "Activa", type: "boolean" },
      ],
    },
    users: {
      title: "Usuarios", resource: "users",
      fields: [
        { name: "name", label: "Nombre", type: "text", required: true },
        { name: "email", label: "Correo", type: "email", required: true },
        { name: "role", label: "Rol", type: "select", required: true, defaultValue: "CITIZEN", options: ROLE_OPTIONS },
        { name: "municipality_id", label: "Municipio", type: "select", options: municipalityOptions },
        { name: "password", label: "Contraseña", type: "password", required: true, hint: "Mín. 8 caracteres con letras y números" },
        { name: "active", label: "Activo", type: "boolean" },
      ],
    },
    events: {
      title: "Eventos volcánicos", resource: "volcanic-events",
      description: "Registra el nivel de cada boletín del Servicio Geológico Colombiano y las caídas de ceniza por municipio.",
      fields: [
        { name: "event_type", label: "Tipo", type: "select", required: true, options: EVENT_TYPE_OPTIONS, defaultValue: "BULLETIN" },
        { name: "activity_level", label: "Nivel SGC", type: "select", required: true, options: LEVEL_OPTIONS, defaultValue: "YELLOW" },
        { name: "start_date", label: "Fecha inicio", type: "date", required: true },
        { name: "end_date", label: "Fecha fin", type: "date", inTable: false },
        { name: "municipality_id", label: "Municipio afectado", type: "select", options: municipalityOptions },
        { name: "ash_intensity", label: "Ceniza (0-3)", type: "number", defaultValue: 0, hint: "0 ninguna · 1 leve · 2 moderada · 3 fuerte" },
        { name: "so2_tons_per_day", label: "SO₂ (t/día)", type: "number", step: "any" },
        { name: "bulletin_url", label: "URL del boletín", type: "text", inTable: false, width: "full" },
        { name: "description", label: "Descripción", type: "textarea" },
        { name: "is_simulated", label: "Simulado", type: "boolean", inForm: false },
      ],
    },
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="section-title text-[13px] text-muted">Panel de administración</p>
        <RevealedTitle className="display-title mt-2 text-[2.6rem] sm:text-6xl" text="Gestión de datos" />
      </div>
      <div className="flex gap-1 overflow-x-auto border-b border-line" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`-mb-px inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition ${
              tab === t.id ? "border-accent text-ink" : "border-transparent text-muted hover:text-ink"}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>
      <Card className="p-5">
        {tab === "data" ? <DataPanel /> : tab === "model" ? <ModelPanel /> : tab === "alerts" ? <AlertsPanel />
          : <CrudTable key={tab} {...crud[tab]} />}
      </Card>
    </div>
  );
}
