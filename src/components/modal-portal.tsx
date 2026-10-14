"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// Os modais eram renderizados como irmãos do <tr>, o que os colocava dentro
// do <tbody> — HTML inválido, que o React corrige no cliente e gera um erro
// de hidratação. Passam a sair para o <body>.
//
// useSyncExternalStore distingue servidor de cliente sem um setState dentro
// de um efeito: no servidor devolve false, depois da hidratação devolve true.
export function ModalPortal({ children }: { children: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  if (!mounted) return null;

  return createPortal(children, document.body);
}
