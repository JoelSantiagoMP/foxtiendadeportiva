"use client";

import { useState, useTransition } from "react";
import { signIn } from "@/lib/actions/auth";

export function LoginForm() {
  const [email, setEmail] = useState("dueno@foxtiendadeportiva.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await signIn({ email, password });
      if (result && !result.success) {
        setError(result.error ?? "No se pudo entrar.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
        Correo
        <input
          type="email"
          name="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="h-12 rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-950"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-zinc-800">
        Contraseña
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="h-12 rounded-xl border border-zinc-300 bg-white px-3 text-base text-zinc-950"
        />
      </label>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={isPending}
        className="h-12 rounded-full bg-zinc-950 text-sm font-semibold text-white disabled:opacity-60"
      >
        {isPending ? "Entrando…" : "Entrar"}
      </button>
    </form>
  );
}
