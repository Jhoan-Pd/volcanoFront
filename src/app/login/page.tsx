// LOGIN — CSR: the form and the session (token in localStorage) live in the browser.
import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import LoginView from "@/views/LoginPage";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  // useSearchParams (?desde=) requires a Suspense boundary so the rest can be prerendered
  return <Suspense fallback={<Spinner />}><LoginView /></Suspense>;
}
