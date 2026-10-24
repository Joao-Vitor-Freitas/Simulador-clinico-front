// Histórico local das leituras de sinais vitais de um atendimento.
//
// O backend informa apenas o estado atual; a série temporal usada pela análise
// matemática é montada aqui, a cada leitura aceita, e guardada no navegador para
// que a tela de resultado e um recarregamento da página continuem vendo a curva.
// Lacunas (aba fechada) são tratadas como variação linear entre duas leituras.

import { criarAmostra, registrarAmostra, type VitalSample } from "./math";
import type { Simulation } from "./types";

const chave = (id: string) => `vital-history:${id}`;

export function carregarHistorico(id: string): VitalSample[] {
  if (!id || typeof window === "undefined") return [];
  try {
    const bruto = JSON.parse(window.localStorage.getItem(chave(id)) || "[]");
    if (!Array.isArray(bruto)) return [];
    return bruto
      .filter((item): item is VitalSample => !!item && typeof item.tempo === "number" && Number.isFinite(item.tempo))
      .sort((a, b) => a.tempo - b.tempo);
  } catch {
    return [];
  }
}

function salvarHistorico(id: string, serie: VitalSample[]) {
  try {
    window.localStorage.setItem(chave(id), JSON.stringify(serie));
  } catch {
    // Armazenamento indisponível ou cheio: a análise segue só com a sessão atual.
  }
}

/** Tempo decorrido, em minutos, segundo o relógio do servidor. */
export function tempoDecorrido(simulacao: Simulation): number {
  if (simulacao.is_running) {
    return Math.max(0, (simulacao.time_limit_minutes * 60 - simulacao.remaining_seconds) / 60);
  }
  return simulacao.elapsed_time_minutes;
}

/** Acrescenta a leitura atual à série do atendimento e a persiste. */
export function acrescentarLeitura(serie: VitalSample[], simulacao: Simulation): VitalSample[] {
  const amostra = criarAmostra(tempoDecorrido(simulacao), simulacao.vital_signs);
  if (amostra.spo2 === undefined && amostra.fc === undefined && amostra.fr === undefined) return serie;
  const atualizada = registrarAmostra(serie, amostra);
  if (atualizada !== serie) salvarHistorico(simulacao.id, atualizada);
  return atualizada;
}
