"use client";

import { LogIn, UserPlus } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { errorMessage } from "@/api/client";
import { authApi, catalogApi } from "@/api/services";
import type { Municipality, Role } from "@/api/types";
import RevealedTitle from "@/components/RevealedTitle";
import { Button, Card, Field, inputClass, Notice } from "@/components/ui";
import { useAuth } from "@/context/AuthContext";

const HOME_BY_ROLE: Record<Role, string> = { ADMIN: "/admin", PHARMACY: "/farmacia", CITIZEN: "/" };

export default function LoginPage() {
  const { login, user } = useAuth();
  const router = useRouter();
  // Internal paths only: avoids open redirects (?desde=https://another-site)
  const requested = useSearchParams().get("desde");
  const returnTo = requested?.startsWith("/") && !requested.startsWith("//") ? requested : undefined;
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [municipalityId, setMunicipalityId] = useState<number | "">("");
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (mode === "signup" && municipalities.length === 0) {
      catalogApi.municipalities().then((all) => setMunicipalities(all.filter((m) => m.active))).catch(() => undefined);
    }
  }, [mode, municipalities.length]);

  // Destination by role (when coming from a protected route, go back there)
  const destination = (role: Role) => returnTo ?? HOME_BY_ROLE[role];
  useEffect(() => {
    if (user) router.replace(destination(user.role));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the session changes
  }, [user]);
  if (user) return null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null); setSubmitting(true);
    try {
      if (mode === "signup") {
        await authApi.signup({ name, email, password, municipality_id: municipalityId === "" ? null : municipalityId });
        setSuccess("Cuenta creada. Ya puedes iniciar sesión.");
        setMode("login");
      } else {
        const signedIn = await login(email, password);
        router.replace(destination(signedIn.role));
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-6">
      <Card className="p-6 sm:p-8">
        <RevealedTitle className="display-title text-4xl" text={mode === "login" ? "Iniciar sesión" : "Crear cuenta de ciudadano"} />
        <p className="mt-1 text-sm text-ink-2">
          {mode === "login"
            ? "El dashboard es público; inicia sesión para administrar datos o reportar como farmacia."
            : "Elige tu municipio: te enviaremos por correo las alertas tempranas de riesgo alto o muy alto."}
        </p>
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          {mode === "signup" && (
            <Field label="Nombre completo">
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required minLength={3} autoComplete="name" />
            </Field>
          )}
          {mode === "signup" && (
            <Field label="Municipio donde vives" hint="Recibirás las alertas de este municipio.">
              <select className={inputClass} value={municipalityId} onChange={(e) => setMunicipalityId(e.target.value ? Number(e.target.value) : "")}>
                <option value="">Sin municipio (no recibir correos)</option>
                {municipalities.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Correo electrónico">
            <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
          </Field>
          <Field label="Contraseña" hint={mode === "signup" ? "Mínimo 8 caracteres, con letras y números." : undefined}>
            <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8}
              autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </Field>
          {error && <Notice kind="error">{error}</Notice>}
          {success && <Notice kind="ok">{success}</Notice>}
          <Button type="submit" className="w-full" loading={submitting}>
            {mode === "login" ? <><LogIn size={16} /> Ingresar</> : <><UserPlus size={16} /> Crear cuenta</>}
          </Button>
        </form>
        <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); }}
          className="mt-4 w-full text-center text-sm text-accent hover:underline">
          {mode === "login" ? "¿No tienes cuenta? Regístrate como ciudadano" : "Ya tengo cuenta"}
        </button>
      </Card>
      <p className="mt-4 text-center text-xs text-muted">
        Usuarios de demostración del seed: <b>admin@predictor.co</b>, <b>farmacia@demo.co</b>, <b>ciudadano@demo.co</b> (contraseñas en el README del backend).
      </p>
    </div>
  );
}
