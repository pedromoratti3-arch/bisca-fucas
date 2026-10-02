import type { Metadata } from "next";
import DesignShowcase from "./DesignShowcase";

export const metadata: Metadata = {
  title: "Design System - Bisca Fucas",
  description: "Guia visual de cores, tipografia, botões, cards, modais e animações do Bisca Fucas.",
  robots: { index: false },
};

export default function DesignPage() {
  return <DesignShowcase />;
}
