"use client";
import NextLink from "next/link";
import { useParams as nextParams, useRouter } from "next/navigation";
import { useEffect, type ComponentProps } from "react";

export function Link({ to, ...props }: Omit<ComponentProps<typeof NextLink>, "href"> & { to: string }) {
  return <NextLink href={to} {...props} />;
}
export function useNavigate() {
  const router = useRouter();
  return (path: string) => router.push(path);
}
export function useParams() { return nextParams<{ id: string }>(); }
export function Navigate({ to }: { to: string; replace?: boolean }) {
  const router = useRouter();
  useEffect(() => { router.replace(to); }, [router, to]);
  return null;
}
