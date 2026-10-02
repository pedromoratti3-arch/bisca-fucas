/**
 * Ícones ORIGINAIS das salas, recuperados do histórico (page.tsx): marca "hub" colorida,
 * árvore geométrica da Floresta, logo do Terrafé (máscara PNG) e o "F" vermelho da Sala de Aula.
 * JavaScript simples (React.createElement), copiado sem alterações de desenho.
 */
import React from "react";

/** HUB — texto colorido centrado no cartão. */
export function HubMark(sz) {
  var fs = Math.max(26, Math.round(sz * 0.52));
  return React.createElement(
    "div",
    {
      "aria-hidden": true,
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        fontFamily: "system-ui, Arial, sans-serif",
        fontSize: fs,
        fontWeight: 900,
        lineHeight: 1,
        letterSpacing: "-0.03em",
      },
    },
    React.createElement("span", { style: { color: "#2563eb" } }, "h"),
    React.createElement("span", { style: { color: "#ef4444", position: "relative", top: "0.1em" } }, "u"),
    React.createElement("span", { style: { color: "#eab308", position: "relative", top: "-0.06em" } }, "b")
  );
}

/** Floresta: silhueta de árvore geométrica (herda a cor do texto). */
export function FlorestaMark(sz) {
  return React.createElement(
    "svg",
    { viewBox: "0 0 56 56", width: sz, height: sz, "aria-hidden": true, style: { display: "block" } },
    React.createElement("path", { d: "M 28 4 L 44 34 H 37 L 48 46 H 8 L 19 34 H 12 Z", fill: "currentColor", opacity: 0.92 }),
    React.createElement("rect", { x: 23.5, y: 38, width: 9, height: 14, rx: 1.5, fill: "currentColor", opacity: 0.55 })
  );
}

/** Terrafé: logo oficial (public/assets/terrafe/logo.png) como máscara, na cor creme. */
export function TerrafeLogo(sz, color) {
  var u = "url(/assets/terrafe/logo.png)";
  return React.createElement("div", {
    role: "img",
    "aria-label": "Terrafé",
    style: {
      width: sz,
      height: sz,
      flexShrink: 0,
      boxSizing: "border-box",
      backgroundColor: color || "#e8c9a0",
      WebkitMaskImage: u,
      WebkitMaskSize: "contain",
      WebkitMaskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskImage: u,
      maskSize: "contain",
      maskRepeat: "no-repeat",
      maskPosition: "center",
      display: "block",
      filter: "drop-shadow(0 0 2px rgba(0,0,0,.45))",
    },
  });
}

/** Sala de Aula / marca Fucas: barra vermelha + "F" branco. */
export function FucasMark(h) {
  var w = Math.round(h * 0.55);
  return React.createElement(
    "svg",
    { viewBox: "0 0 58 70", width: w, height: h, "aria-hidden": true },
    React.createElement("rect", { x: 0, y: 2, width: 9, height: 66, fill: "#C41230", rx: 1 }),
    React.createElement("text", { x: 12, y: 62, fontFamily: "Georgia,serif", fontSize: 62, fontWeight: "bold", fill: "#fff" }, "F")
  );
}
