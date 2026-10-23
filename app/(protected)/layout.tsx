"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "../../src/auth";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  useEffect(() => { if (!loading && !user) router.replace("/entrar"); }, [loading, user, router]);
  if (loading || !user) return <div className="screen-center">Verificando acesso…</div>;
  return <><header className="topbar">
    <Link href="/" className="brand" aria-label="Simulador Clínico, início"><span className="brand-mark">✳</span><span>SIMULADOR <b>CLÍNICO</b></span></Link>
    <div className="top-actions"><span className="user-email">{user.name}</span><button className="text-button" onClick={() => { void logout().finally(() => router.push("/entrar")); }}>Sair <span aria-hidden>↗</span></button></div>
  </header>{children}</>;
}
