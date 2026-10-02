"use client";
/**
 * Ambientação animada de cada sala (fica atrás da mesa, nunca por cima das cartas).
 * Terrafé: luz quente oscilando + vapor + poeira. HUB: varredura de luz + LEDs. Floresta: feixes de luz,
 * folhas caindo e vagalumes. Sala de Aula: foco de luz e pó de giz.
 * Só transform/opacity animam; pausa com aba oculta (data-bf-hidden) e para com "reduzir movimento".
 */
export function RoomAmbience(props: { roomId: string }) {
  const id = props.roomId;
  if (id === "terrafe") {
    return (
      <div className="bf-amb bf-amb--terrafe" aria-hidden>
        <div className="bf-amb__lamp" />
        <div className="bf-amb__wood" />
        {[0, 1, 2].map((i) => (
          <span key={i} className="bf-amb__steam" style={{ ["--i" as string]: i }} />
        ))}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <span key={`m${i}`} className="bf-amb__mote" style={{ ["--i" as string]: i, left: `${12 + i * 15}%`, top: `${30 + ((i * 23) % 50)}%` }} />
        ))}
      </div>
    );
  }
  if (id === "hub") {
    return (
      <div className="bf-amb bf-amb--hub" aria-hidden>
        <div className="bf-amb__grid" />
        <div className="bf-amb__scan" />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <span key={i} className="bf-amb__led" style={{ ["--i" as string]: i, left: `${5 + ((i * 37) % 90)}%`, top: `${8 + ((i * 29) % 80)}%` }} />
        ))}
      </div>
    );
  }
  if (id === "floresta") {
    return (
      <div className="bf-amb bf-amb--floresta" aria-hidden>
        <div className="bf-amb__shaft bf-amb__shaft--a" />
        <div className="bf-amb__shaft bf-amb__shaft--b" />
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="bf-amb__leaf" style={{ ["--i" as string]: i, left: `${10 + i * 24}%` }} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={`f${i}`} className="bf-amb__firefly" style={{ ["--i" as string]: i, left: `${8 + ((i * 41) % 85)}%`, top: `${20 + ((i * 31) % 60)}%` }} />
        ))}
      </div>
    );
  }
  return (
    <div className="bf-amb bf-amb--sala" aria-hidden>
      <div className="bf-amb__spot" />
      <div className="bf-amb__chalklines" />
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} className="bf-amb__chalk" style={{ ["--i" as string]: i, left: `${10 + i * 19}%`, top: `${25 + ((i * 27) % 55)}%` }} />
      ))}
    </div>
  );
}
