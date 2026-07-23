import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Entrar — PMS",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <div className="hidden flex-col justify-between bg-primary p-12 text-on-primary md:flex md:w-1/2">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-on-primary text-body font-bold text-primary">
          P
        </div>
        <div>
          <h1 className="text-display font-bold">PMS</h1>
          <p className="mt-3 max-w-sm text-body text-white/80">
            Gere reservas, unidades e hóspedes do teu alojamento local num só
            lugar.
          </p>
        </div>
        <p className="text-body text-white/60">
          &copy; {new Date().getFullYear()} PMS
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-surface-1 px-4 py-12 md:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-start gap-1 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-body font-bold text-on-primary">
              P
            </div>
            <h1 className="mt-2 text-display font-bold text-ink">PMS</h1>
          </div>

          <div className="mb-6">
            <h2 className="text-[24px] font-bold leading-tight text-ink">
              Entrar
            </h2>
            <p className="mt-1 text-body text-ink-muted">
              Introduz as tuas credenciais para aceder à gestão.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-canvas p-6 shadow-card">
            <LoginForm />
          </div>
        </div>
      </div>
    </div>
  );
}
