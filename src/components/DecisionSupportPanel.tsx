import { useId } from "react";
import { clinicalNumber } from "../format";
import {
  LIMITES,
  analisarSerie,
  serieDoSinal,
  type AnaliseMatematica,
  type AnaliseSinalSecundario,
  type VitalSample,
} from "../math";

type Props = {
  history: VitalSample[];
  /** Duração total do caso, em minutos; define o alcance do eixo do tempo. */
  timeLimitMinutes?: number;
  /** "live" durante o atendimento; "result" na tela final. */
  variant?: "live" | "result";
};

const signed = (value: number) => `${value > 0.05 ? "+" : ""}${clinicalNumber(value)}`;
const duration = (minutes: number) =>
  minutes < 1 ? `${Math.max(1, Math.round(minutes * 60))} s` : `${clinicalNumber(minutes)} min`;

const limitLabels = {
  dentro: "Dentro da faixa",
  atencao: `Atenção (abaixo de ${LIMITES.spo2Atencao}%)`,
  critico: `Crítico (abaixo de ${LIMITES.spo2Critica}%)`,
} as const;

function SpO2Chart({ history, timeLimitMinutes, analysis, label }: {
  history: VitalSample[];
  timeLimitMinutes?: number;
  analysis: AnaliseMatematica;
  label: string;
}) {
  const points = serieDoSinal(history, "spo2");
  const W = 640, H = 244;
  const m = { top: 28, right: 18, bottom: 40, left: 40 };
  const lastTime = points[points.length - 1]?.tempo ?? 0;
  const xMax = Math.max(timeLimitMinutes ?? 0, lastTime, 0.5);
  const lowest = Math.min(...points.map((p) => p.valor));
  const yMin = Math.min(84, Math.floor(lowest) - 2);
  const yMax = 100;
  const x = (t: number) => m.left + (t / xMax) * (W - m.left - m.right);
  const y = (v: number) => m.top + (1 - (v - yMin) / (yMax - yMin)) * (H - m.top - m.bottom);
  const L = LIMITES.spo2Hipoxia;

  // Área sombreada: região entre a linha de hipóxia e a curva quando S(t) < L.
  let area = "";
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i], b = points[i + 1];
    if (a.valor >= L && b.valor >= L) continue;
    const cross = a.tempo + ((L - a.valor) / (b.valor - a.valor)) * (b.tempo - a.tempo);
    let polygon: [number, number][];
    if (a.valor <= L && b.valor <= L) polygon = [[a.tempo, L], [a.tempo, a.valor], [b.tempo, b.valor], [b.tempo, L]];
    else if (a.valor > L) polygon = [[cross, L], [b.tempo, b.valor], [b.tempo, L]];
    else polygon = [[a.tempo, L], [a.tempo, a.valor], [cross, L]];
    area += `M${polygon.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join("L")}Z`;
  }

  const yTicks: number[] = [];
  for (let v = yMax; v >= yMin; v -= 4) yTicks.push(v);
  const xStep = xMax <= 3 ? 0.5 : xMax <= 12 ? 1 : 2;
  const xTicks: number[] = [];
  for (let t = 0; t <= xMax + 1e-9; t += xStep) xTicks.push(t);
  const last = points[points.length - 1];

  return (
    <svg className="decision-chart-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <title>{label}</title>
      {yTicks.map((v) => (
        <g key={`y${v}`}>
          <line x1={m.left} x2={W - m.right} y1={y(v)} y2={y(v)} className="chart-grid" />
          <text x={m.left - 7} y={y(v) + 3.5} textAnchor="end" className="chart-tick">{v}</text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={`x${t}`} x={x(t)} y={H - 24} textAnchor="middle" className="chart-tick">
          {clinicalNumber(t)}
        </text>
      ))}
      <text x={W - m.right} y={H - 6} textAnchor="end" className="chart-axis">tempo (min)</text>
      <text x={m.left} y={14} className="chart-axis">SpO₂ (%)</text>
      {area && <path d={area} className="chart-deficit" />}
      <line x1={m.left} x2={W - m.right} y1={y(LIMITES.spo2Critica)} y2={y(LIMITES.spo2Critica)} className="chart-critical" />
      <line x1={m.left} x2={W - m.right} y1={y(L)} y2={y(L)} className="chart-limit" />
      <text x={W - m.right} y={y(L) - 5} textAnchor="end" className="chart-limit-label">limite de atenção {L}%</text>
      <text x={W - m.right} y={y(LIMITES.spo2Critica) + 12} textAnchor="end" className="chart-critical-label">crítico {LIMITES.spo2Critica}%</text>
      <polyline
        className="chart-curve"
        fill="none"
        points={points.map((p) => `${x(p.tempo).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ")}
      />
      {last && <circle cx={x(last.tempo)} cy={y(last.valor)} r={4.5} className={`chart-now chart-now-${analysis.limite ?? "dentro"}`} />}
    </svg>
  );
}

function Secondary({ name, unit, data }: { name: string; unit: string; data: AnaliseSinalSecundario }) {
  return (
    <li className={data.foraDaFaixa ? "is-alert" : ""}>
      <span>{name}</span>
      <strong>{clinicalNumber(data.atual)} <small>{unit}</small></strong>
      <small>
        {data.derivada === null ? "Aguardando segunda leitura" : `${signed(data.derivada)} ${unit}/min`}
        {data.foraDaFaixa && ` · fora de ${LIMITES.fcCriticaBaixa}–${LIMITES.fcCriticaAlta} bpm`}
      </small>
    </li>
  );
}

export function DecisionSupportPanel({ history, timeLimitMinutes, variant = "live" }: Props) {
  const titleId = useId();
  const analysis = analisarSerie(history);
  const result = variant === "result";
  const hasData = history.length > 0;
  const spo2Points = serieDoSinal(history, "spo2");
  const spo2Time = spo2Points[spo2Points.length - 1]?.tempo ?? 0;
  const rateLabel = analysis.derivada === null ? "—" : `${signed(analysis.derivada)} %/min`;
  const chartLabel = analysis.spo2 === null
    ? "Gráfico indisponível"
    : `Gráfico da SpO₂ ao longo do tempo. Valor atual ${clinicalNumber(analysis.spo2)}%, limite de atenção ${LIMITES.spo2Hipoxia}%, déficit acumulado ${clinicalNumber(analysis.acumulo)} por cento-minuto.`;

  return (
    <section className={`decision-panel decision-${variant}`} aria-labelledby={titleId}>
      <header className="decision-heading">
        <div>
          <span className="eyebrow">APOIO À DECISÃO MATEMÁTICA</span>
          <h2 id={titleId}>{result ? "Análise matemática do atendimento" : "Painel de apoio à decisão"}</h2>
        </div>
        <p>
          Limite, derivada e integral aplicados à SpO₂ lida durante o caso. Regras do simulador; não são
          orientação para pacientes reais.
        </p>
      </header>

      {!hasData && <p className="decision-empty">Aguardando as primeiras leituras de sinais vitais.</p>}

      {hasData && !analysis.temSpO2 && (
        <p className="decision-empty">
          Este caso não monitora a saturação de oxigênio, que é a base da classificação. As taxas de variação
          dos demais sinais monitorados aparecem abaixo.
        </p>
      )}

      {analysis.temSpO2 && analysis.avaliacao && (
        <>
          <div className={`decision-status ${analysis.avaliacao.classeCSS}`} role="status" aria-live="polite">
            <span>{result ? "Classificação ao final do atendimento" : "Classificação atual"}</span>
            <strong>{analysis.avaliacao.status}</strong>
            <p>{analysis.avaliacao.recomendacao}</p>
          </div>

          <div className="decision-body">
            <figure className="decision-chart">
              <figcaption>
                <span><i className="key-curve" />SpO₂</span>
                <span><i className="key-limit" />Limite {LIMITES.spo2Hipoxia}%</span>
                <span><i className="key-deficit" />Área acumulada</span>
                <b className="decision-rate" aria-label={`Derivada atual: ${rateLabel}`}>
                  S′(t) <em>{rateLabel}</em>
                </b>
              </figcaption>
              <SpO2Chart history={history} timeLimitMinutes={timeLimitMinutes} analysis={analysis} label={chartLabel} />
            </figure>

            <div className="decision-pillars">
              <article className="pillar">
                <span className="pillar-kicker">Tendência · limites</span>
                <strong>{clinicalNumber(analysis.spo2 ?? 0)}<small>%</small></strong>
                <span className={`pillar-chip limit-${analysis.limite}`}>{limitLabels[analysis.limite ?? "dentro"]}</span>
                <p>
                  lim S(t), t → {clinicalNumber(spo2Time)} min = {clinicalNumber(analysis.spo2 ?? 0)}%.
                  {analysis.minutosAteCritico !== null && ` No ritmo atual, alcança ${LIMITES.spo2Critica}% em cerca de ${duration(analysis.minutosAteCritico)}.`}
                  {analysis.minimo && analysis.minimo.valor < (analysis.spo2 ?? 0) && ` Menor valor registrado: ${clinicalNumber(analysis.minimo.valor)}%.`}
                </p>
              </article>
              <article className="pillar">
                <span className="pillar-kicker">Evolução · derivada</span>
                <strong>{analysis.derivada === null ? "—" : signed(analysis.derivada)}<small> %/min</small></strong>
                <span className={`pillar-chip dir-${analysis.direcao?.direcao ?? "estavel"}`}>
                  {analysis.direcao ? ({ melhorando: "Melhorando", piorando: "Piorando", estavel: "Estável" })[analysis.direcao.direcao] : "Sem tendência ainda"}
                </span>
                <p>{analysis.direcao?.texto ?? "A taxa de variação aparece a partir da segunda leitura."}</p>
              </article>
              <article className="pillar">
                <span className="pillar-kicker">Acúmulo · integral</span>
                <strong>{clinicalNumber(analysis.acumulo)}<small> %·min</small></strong>
                <span className={`pillar-chip acc-${analysis.nivelAcumulo.nivel}`}>{analysis.nivelAcumulo.texto}</span>
                <p>
                  ∫ max(0, {LIMITES.spo2Hipoxia} − S(t)) dt, pela regra dos trapézios: a área entre a linha de {LIMITES.spo2Hipoxia}% e a curva.
                </p>
              </article>
            </div>
          </div>
        </>
      )}

      {hasData && (analysis.fc || analysis.fr) && (
        <ul className="decision-secondary" aria-label="Taxas de variação dos demais sinais">
          {analysis.fc && <Secondary name="Frequência cardíaca" unit="bpm" data={analysis.fc} />}
          {analysis.fr && <Secondary name="Frequência respiratória" unit="irpm" data={analysis.fr} />}
        </ul>
      )}
    </section>
  );
}
