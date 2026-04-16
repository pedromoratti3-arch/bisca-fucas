import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bisca Fucas - Jogo de Cartas Online",
  description: "Jogue Bisca Fucas online com seus amigos!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
