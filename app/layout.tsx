import type { Metadata } from "next";
import { AuthProvider } from "../src/auth";
import "../src/styles.css";

export const metadata: Metadata = {
  title: "Simulador Clínico | Moinhos",
  description: "Treine decisões clínicas em casos simulados com paciente virtual.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><AuthProvider>{children}</AuthProvider></body></html>;
}
