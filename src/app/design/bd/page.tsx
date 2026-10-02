"use client";
/** Página de teste do fundo: /design/bd?off=lights,dust,suits,shuffle,deal */
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SuitBackdrop } from "@/design";

function Inner() {
  const sp = useSearchParams();
  const off = (sp.get("off") || "").split(",").filter(Boolean);
  const parts = { lights: !off.includes("lights"), suits: !off.includes("suits"), dust: !off.includes("dust"), shuffle: !off.includes("shuffle"), deal: !off.includes("deal") };
  return (
    <div className="bf-screen" style={{ position: "relative", minHeight: "100dvh" }}>
      <SuitBackdrop parts={parts} />
      <div style={{ position: "relative", zIndex: 1, padding: 24 }}>off: {off.join(",") || "nada"}</div>
    </div>
  );
}
export default function Page() {
  return <Suspense><Inner /></Suspense>;
}
