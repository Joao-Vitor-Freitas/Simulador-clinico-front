// Camada matemática da Sprint 4: Tendência (limites), Evolução (derivadas) e
// Acúmulo (integrais) aplicados à série temporal dos sinais vitais.
//
// Módulo puro: não importa React nem a API. Todos os valores clínicos continuam
// vindo do backend; aqui apenas interpretamos a série de leituras já recebidas.
// Valor de referência do MVP: regras do simulador, não recomendação médica.

import type { VitalSign } from "./types";

export type VitalSample = {
  /** Tempo decorrido do atendimento, em minutos. */
  tempo: number;
  spo2?: number;
  fc?: number;
  fr?: number;
};

export type SignalKey = "spo2" | "fc" | "fr";

// Limiares clínicos definidos no guia da Sprint 4 (seção 3.1).
export const LIMITES = {
  spo2Critica: 88,
  spo2Atencao: 92,
  /** Linha de hipóxia usada na integral e no gráfico (limite de atenção do MVP). */
  spo2Hipoxia: 90,
  fcCriticaAlta: 120,
  fcCriticaBaixa: 50,
} as const;

// Limiares de interpretação da derivada (seção 3.2) e da integral (seção 3.3).
export const DERIVADA = {
  quedaSevera: -3,
  recuperacao: 1.5,
  /** Janela mínima, em minutos, para a derivada "atual" (evita ruído entre leituras muito próximas). */
  janelaMinutos: 0.25,
} as const;

export const ACUMULO = { leve: 1, alto: 15 } as const;

// ---------------------------------------------------------------------------
// Identificação dos sinais vitais enviados pela API
// ---------------------------------------------------------------------------

const normalizar = (texto: string) =>
  texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Descobre a qual indicador da análise um sinal vital da API corresponde. */
export function identificarSinal(vital: Pick<VitalSign, "name" | "unit">): SignalKey | null {
  const nome = normalizar(vital.name);
  const unidade = normalizar(vital.unit || "");
  if (/respirat|\bfr\b/.test(nome) || /^(irpm|rpm|mrpm)$/.test(unidade)) return "fr";
  if (/spo2|spo₂|satura|oxigen/.test(nome)) return "spo2";
  if (/cardiac|batiment|\bfc\b|pulso/.test(nome) || /^bpm$/.test(unidade)) return "fc";
  return null;
}

/** Converte as leituras de um instante em uma amostra da série temporal. */
export function criarAmostra(tempo: number, sinais: VitalSign[]): VitalSample {
  const amostra: VitalSample = { tempo };
  for (const sinal of sinais) {
    const chave = identificarSinal(sinal);
    if (chave && amostra[chave] === undefined && Number.isFinite(sinal.value)) {
      amostra[chave] = sinal.value;
    }
  }
  return amostra;
}

/** Acrescenta uma amostra mantendo a série ordenada e sem leituras duplicadas. */
export function registrarAmostra(serie: VitalSample[], nova: VitalSample): VitalSample[] {
  const ultima = serie[serie.length - 1];
  if (!ultima) return [nova];
  // Leitura mais antiga que a última: ignorar (resposta fora de ordem).
  if (nova.tempo < ultima.tempo - 1e-6) return serie;
  // Mesma marca de tempo (até meio segundo): a leitura nova substitui a anterior.
  if (nova.tempo - ultima.tempo < 1 / 120) return [...serie.slice(0, -1), nova];
  return [...serie, nova];
}

/** Série de um único sinal, descartando amostras em que ele não existe. */
export function serieDoSinal(serie: VitalSample[], chave: SignalKey) {
  return serie
    .filter((amostra) => amostra[chave] !== undefined)
    .map((amostra) => ({ tempo: amostra.tempo, valor: amostra[chave] as number }));
}

// ---------------------------------------------------------------------------
// [B] EVOLUÇÃO — derivadas
// ---------------------------------------------------------------------------

type Ponto = { tempo: number; valor: number };

/**
 * Derivada discreta entre duas leituras consecutivas:
 *   S'(t) ≈ [S(t₂) − S(t₁)] / (t₂ − t₁)   [unidade/min]
 */
export function calcularDerivada(dados: Ponto[], indice: number): number {
  if (indice <= 0 || indice >= dados.length) return 0;
  const dt = dados[indice].tempo - dados[indice - 1].tempo;
  if (dt <= 0) return 0;
  return (dados[indice].valor - dados[indice - 1].valor) / dt;
}

/**
 * Derivada "atual": mesma razão incremental, mas medida contra a leitura mais
 * recente que esteja pelo menos `janela` minutos antes. Leituras quase simultâneas
 * (uma conduta logo após a atualização automática) não geram taxas absurdas.
 */
export function calcularDerivadaAtual(dados: Ponto[], janela: number = DERIVADA.janelaMinutos): number | null {
  if (dados.length < 2) return null;
  const fim = dados[dados.length - 1];
  let inicio = dados[0];
  for (let i = dados.length - 2; i >= 0; i -= 1) {
    if (fim.tempo - dados[i].tempo >= janela) {
      inicio = dados[i];
      break;
    }
  }
  const dt = fim.tempo - inicio.tempo;
  if (dt <= 0) return null;
  return (fim.valor - inicio.valor) / dt;
}

export type Direcao = "melhorando" | "piorando" | "estavel";

/** Interpreta o sinal e a magnitude da derivada da SpO₂ (seção 3.2). */
export function interpretarDerivadaSpO2(derivada: number): { direcao: Direcao; texto: string } {
  if (derivada < DERIVADA.quedaSevera) {
    return { direcao: "piorando", texto: "Queda severa e acelerada da saturação." };
  }
  if (derivada < -1) return { direcao: "piorando", texto: "A saturação está diminuindo." };
  if (derivada > 2) return { direcao: "melhorando", texto: "Recuperação consistente após a conduta." };
  if (derivada > 1) return { direcao: "melhorando", texto: "A saturação está aumentando." };
  return { direcao: "estavel", texto: "Estabilidade relativa da saturação." };
}

// ---------------------------------------------------------------------------
// [C] ACÚMULO — integral pela regra dos trapézios
// ---------------------------------------------------------------------------

/**
 * Déficit acumulado de oxigenação:
 *   ∫ max(0, limite − S(t)) dt   [%·min]
 * Cada intervalo usa Área = [(L − S(tᵢ)) + (L − S(tᵢ₊₁))] / 2 · Δt, com
 * déficit nunca negativo, exatamente como descrito no guia.
 */
export function calcularAcumuloHipoxia(dados: Ponto[], limiteAtencao: number = LIMITES.spo2Hipoxia): number {
  let area = 0;
  for (let i = 0; i < dados.length - 1; i += 1) {
    const dt = dados[i + 1].tempo - dados[i].tempo;
    if (dt <= 0) continue;
    const def1 = Math.max(0, limiteAtencao - dados[i].valor);
    const def2 = Math.max(0, limiteAtencao - dados[i + 1].valor);
    area += ((def1 + def2) / 2) * dt;
  }
  return area;
}

export type NivelAcumulo = "nenhum" | "leve" | "alto";

export function interpretarAcumulo(area: number): { nivel: NivelAcumulo; texto: string } {
  if (area <= 0) return { nivel: "nenhum", texto: "Sem eventos de hipóxia." };
  if (area <= ACUMULO.alto) return { nivel: "leve", texto: "Leve exposição à hipóxia." };
  return { nivel: "alto", texto: "Carga hipóxica acumulada alta." };
}

// ---------------------------------------------------------------------------
// [A] TENDÊNCIA — limites
// ---------------------------------------------------------------------------

export type LimiteSpO2 = "dentro" | "atencao" | "critico";

export function classificarSpO2PorLimite(spo2: number): LimiteSpO2 {
  if (spo2 < LIMITES.spo2Critica) return "critico";
  if (spo2 < LIMITES.spo2Atencao) return "atencao";
  return "dentro";
}

export function fcForaDaFaixa(fc: number): boolean {
  return fc > LIMITES.fcCriticaAlta || fc < LIMITES.fcCriticaBaixa;
}

/**
 * Proximidade do limite crítico: se a SpO₂ está caindo, quantos minutos faltam
 * para atingir o limite no ritmo atual (extrapolação linear da derivada).
 * Retorna null quando não há queda, já se está abaixo do limite ou não há derivada.
 */
export function minutosAteLimite(spo2: number, derivada: number | null, limite: number = LIMITES.spo2Critica) {
  if (derivada === null || derivada >= 0 || spo2 <= limite) return null;
  return (spo2 - limite) / -derivada;
}

// ---------------------------------------------------------------------------
// MOTOR DE REGRAS DE DECISÃO (MVP)
// ---------------------------------------------------------------------------

export type StatusClinico = "Piora Crítica" | "Em Atenção" | "Em Recuperação" | "Estável";

export type AvaliacaoClinica = {
  status: StatusClinico;
  classeCSS: "status-critico" | "status-atencao" | "status-recuperacao" | "status-estavel";
  recomendacao: string;
};

/**
 * Combina Limite (S), Derivada (S') e Integral (déficit) em uma classificação.
 *
 * Ordem de avaliação — segue a tabela da seção 4 do guia:
 *  1. Piora Crítica por limite ou derivada: S < 88 ou S' < −4.
 *  2. Em Recuperação: S ≥ 90 e S' > +1,5. Vem antes das regras de déficit porque o
 *     déficit acumulado nunca diminui; sem isso, quem se recuperou depois de uma
 *     hipóxia jamais seria classificado como "Em Recuperação".
 *  3. Piora Crítica por acúmulo: déficit > 15 %·min.
 *  4. Em Atenção: S < 92, S' < −2 ou déficit > 0.
 *  5. Estável nos demais casos.
 */
export function avaliarEstadoClinicoMVP(spo2Atual: number, derivadaAtual: number, acumuloHipoxia: number): AvaliacaoClinica {
  if (spo2Atual < LIMITES.spo2Critica || derivadaAtual < -4) {
    return {
      status: "Piora Crítica",
      classeCSS: "status-critico",
      recomendacao: "Ação imediata necessária! Iniciar suporte ventilatório e reavaliar.",
    };
  }
  if (spo2Atual >= LIMITES.spo2Hipoxia && derivadaAtual > DERIVADA.recuperacao) {
    return {
      status: "Em Recuperação",
      classeCSS: "status-recuperacao",
      recomendacao: "Manter suporte atual. Monitorar estabilização do indicador.",
    };
  }
  if (acumuloHipoxia > ACUMULO.alto) {
    return {
      status: "Piora Crítica",
      classeCSS: "status-critico",
      recomendacao: "Ação imediata necessária! Carga hipóxica acumulada alta; reavaliar o suporte ventilatório.",
    };
  }
  if (spo2Atual < LIMITES.spo2Atencao || derivadaAtual < -2 || acumuloHipoxia > 0) {
    return {
      status: "Em Atenção",
      classeCSS: "status-atencao",
      recomendacao: "Avaliar oferta de O2. Risco de progressão para insuficiência.",
    };
  }
  return {
    status: "Estável",
    classeCSS: "status-estavel",
    recomendacao: "Paciente compensado. Manter plano terapêutico padrão.",
  };
}

// ---------------------------------------------------------------------------
// Análise completa (usada pelo painel)
// ---------------------------------------------------------------------------

export type AnaliseSinalSecundario = {
  atual: number;
  derivada: number | null;
  foraDaFaixa: boolean;
};

export type AnaliseMatematica = {
  /** Há leituras de SpO₂ na série? Alguns casos clínicos não monitoram esse sinal. */
  temSpO2: boolean;
  spo2: number | null;
  derivada: number | null;
  acumulo: number;
  limite: LimiteSpO2 | null;
  minutosAteCritico: number | null;
  avaliacao: AvaliacaoClinica | null;
  direcao: { direcao: Direcao; texto: string } | null;
  nivelAcumulo: { nivel: NivelAcumulo; texto: string };
  fc: AnaliseSinalSecundario | null;
  fr: AnaliseSinalSecundario | null;
  /** Menor SpO₂ observada, usada para a frase de limite lim S(t) quando t → t_k. */
  minimo: { tempo: number; valor: number } | null;
};

function analisarSecundario(serie: VitalSample[], chave: "fc" | "fr"): AnaliseSinalSecundario | null {
  const pontos = serieDoSinal(serie, chave);
  if (!pontos.length) return null;
  const atual = pontos[pontos.length - 1].valor;
  return {
    atual,
    derivada: calcularDerivadaAtual(pontos),
    foraDaFaixa: chave === "fc" ? fcForaDaFaixa(atual) : false,
  };
}

export function analisarSerie(serie: VitalSample[]): AnaliseMatematica {
  const pontosSpO2 = serieDoSinal(serie, "spo2");
  const acumulo = calcularAcumuloHipoxia(pontosSpO2);
  const fc = analisarSecundario(serie, "fc");
  const fr = analisarSecundario(serie, "fr");
  const nivelAcumulo = interpretarAcumulo(acumulo);
  if (!pontosSpO2.length) {
    return {
      temSpO2: false, spo2: null, derivada: null, acumulo, limite: null, minutosAteCritico: null,
      avaliacao: null, direcao: null, nivelAcumulo, fc, fr, minimo: null,
    };
  }
  const spo2 = pontosSpO2[pontosSpO2.length - 1].valor;
  const derivada = calcularDerivadaAtual(pontosSpO2);
  const minimo = pontosSpO2.reduce((menor, ponto) => (ponto.valor < menor.valor ? ponto : menor), pontosSpO2[0]);
  return {
    temSpO2: true,
    spo2,
    derivada,
    acumulo,
    limite: classificarSpO2PorLimite(spo2),
    minutosAteCritico: minutosAteLimite(spo2, derivada),
    avaliacao: avaliarEstadoClinicoMVP(spo2, derivada ?? 0, acumulo),
    direcao: derivada === null ? null : interpretarDerivadaSpO2(derivada),
    nivelAcumulo,
    fc,
    fr,
    minimo,
  };
}
