import { useEffect, useState } from "react";
import { Link, useNavigate } from "../navigation";
import { api, type ExperienceFeedback } from "../api";
import { useAuth } from "../auth";
import { Empty, ErrorPanel, Loading } from "../components/Feedback";
import { FeedbackEditor } from "../components/FeedbackEditor";
import type { CaseDetail, CaseSummary, SimulationSummary } from "../types";

function allowedMinutes(detail: CaseDetail): number[] {
  return [1, 3, 5, 10].filter(value => value <= detail.max_time_limit_minutes);
}

function preferredMinutes(detail: CaseDetail): number {
  const saved = Number(localStorage.getItem(`case-minutes:${detail.id}`));
  return allowedMinutes(detail).includes(saved)
    ? saved
    : detail.default_time_limit_minutes;
}

const clinicalSources = [
  { label: "Febre", url: "https://www.nhs.uk/symptoms/fever-in-adults/" },
  { label: "Dor de cabeça", url: "https://www.nhs.uk/symptoms/headaches/" },
  { label: "Resfriado", url: "https://www.nhs.uk/conditions/common-cold/" },
  { label: "Dor de garganta", url: "https://www.nhs.uk/symptoms/sore-throat/" },
  { label: "Tontura", url: "https://www.nhs.uk/symptoms/dizziness/" },
  { label: "Desidratação", url: "https://www.nhs.uk/conditions/dehydration/" },
  { label: "Suspeita de infarto", url: "https://www.nhs.uk/conditions/heart-attack/" },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [attempts, setAttempts] = useState<SimulationSummary[]>([]);
  const [feedbacks, setFeedbacks] = useState<Record<string, ExperienceFeedback>>({});
  const [activeTab, setActiveTab] = useState<"history" | "feedback">("history");
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, CaseDetail>>({});
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [minutes, setMinutes] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [caseError, setCaseError] = useState("");
  const [historyError, setHistoryError] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [feedbackNotice, setFeedbackNotice] = useState("");
  const [busyCase, setBusyCase] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    setCaseError("");
    setHistoryError("");
    setFeedbackError("");
    const [caseResult, historyResult] = await Promise.allSettled([
      api.cases(),
      api.simulations(),
    ]);
    if (historyResult.status === "fulfilled") {
      setAttempts(historyResult.value);
      const finished = historyResult.value.filter(item => !item.is_running);
      const responses = await Promise.allSettled(finished.map(item => api.feedback(item.id)));
      if (responses.some(response => response.status === "rejected"))
        setFeedbackError("Algumas avaliações não puderam ser carregadas. Tente novamente.");
      setFeedbacks(Object.fromEntries(responses.flatMap((response, index) =>
        response.status === "fulfilled" && response.value ? [[finished[index].id, response.value]] : []
      )));
    }
    else
      setHistoryError(
        historyResult.reason instanceof Error
          ? historyResult.reason.message
          : "Falha ao carregar seu histórico.",
      );
    if (caseResult.status === "fulfilled") {
      const caseList = caseResult.value;
      setCases(caseList);
      const detailResults = await Promise.allSettled(
        caseList.map((item) => api.case(item.id)),
      );
      const detailList = detailResults.flatMap((item) =>
        item.status === "fulfilled" ? [item.value] : [],
      );
      const nextDetails = Object.fromEntries(
        detailList.map((item) => [item.id, item]),
      );
      setDetails(nextDetails);
      setDetailErrors(
        Object.fromEntries(
          caseList.flatMap((item, index) =>
            detailResults[index].status === "rejected"
              ? [[item.id, "Não foi possível carregar os limites deste caso."]]
              : [],
          ),
        ),
      );
      setMinutes(
        Object.fromEntries(
          detailList.map((item) => [item.id, preferredMinutes(item)]),
        ),
      );
    } else
      setCaseError(
        caseResult.reason instanceof Error
          ? caseResult.reason.message
          : "Falha ao carregar casos.",
      );
    setLoading(false);
  };
  async function retryDetail(caseId: string) {
    try {
      const detail = await api.case(caseId);
      setDetails((current) => ({ ...current, [caseId]: detail }));
      setMinutes((current) => ({
        ...current,
        [caseId]: preferredMinutes(detail),
      }));
      setDetailErrors((current) => {
        const next = { ...current };
        delete next[caseId];
        return next;
      });
    } catch (reason) {
      setDetailErrors((current) => ({
        ...current,
        [caseId]:
          reason instanceof Error
            ? reason.message
            : "Falha ao carregar este caso.",
      }));
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function start(caseId: string) {
    setBusyCase(caseId);
    setError("");
    try {
      const detail = details[caseId];
      if (!detail) return;
      const simulation = await api.start(
        caseId,
        allowedMinutes(detail).includes(minutes[caseId])
          ? minutes[caseId]
          : detail.default_time_limit_minutes,
      );
      navigate(`/simulacoes/${simulation.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Não foi possível iniciar.",
      );
    } finally {
      setBusyCase("");
    }
  }
  return (
    <main className="page dashboard">
      <section className="dashboard-hero">
        <div>
          <span className="eyebrow light">PAINEL / VISÃO GERAL</span>
          <h1>
            Bom atendimento
            <br />
            começa com <em>boas decisões.</em>
          </h1>
          <p>Escolha um caso, observe os sinais e conduza a próxima etapa.</p>
        </div>
        <div className="hero-stat">
          <span>SEU ESPAÇO</span>
          <strong>{user?.name}</strong>
          <small>
            {attempts.length}{" "}
            {attempts.length === 1 ? "atendimento" : "atendimentos"} registrados
          </small>
        </div>
      </section>
      <section className="section-heading">
        <div>
          <span className="eyebrow">01 / CASOS DISPONÍVEIS</span>
          <h2>Inicie uma simulação</h2>
        </div>
        <p>O diagnóstico será revelado ao final.</p>
      </section>
      {error && <ErrorPanel message={error} retry={() => void load()} />}
      {caseError && (
        <ErrorPanel message={caseError} retry={() => void load()} />
      )}
      {loading ? (
        <Loading label="Preparando casos clínicos…" />
      ) : caseError ? null : cases.length === 0 ? (
        <Empty
          title="Nenhum caso disponível"
          text="Verifique se o servidor importou os casos clínicos."
        />
      ) : (
        <div className="case-grid">
          {cases.map((item, index) => {
            const detail = details[item.id];
            return (
              <article className="case-card" key={item.id}>
                <div className="case-top">
                  <span className="case-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="case-content">
                  <span className="eyebrow">CENÁRIO CLÍNICO</span>
                  <h3>{item.title}</h3>
                  <p>
                    Avalie os sinais, pergunte se há outras queixas e escolha
                    uma conduta para cada sintoma identificado.
                  </p>
                  <label htmlFor={`duration-${item.id}`}>
                    Duração da simulação
                  </label>
                  {detailErrors[item.id] && (
                    <div className="case-detail-error" role="alert">
                      <p>{detailErrors[item.id]}</p>
                      <button
                        type="button"
                        className="text-button"
                        onClick={() => void retryDetail(item.id)}
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}
                  <div className="select-wrap">
                    <select
                      id={`duration-${item.id}`}
                      value={
                        detail
                          ? (minutes[item.id] ??
                            detail.default_time_limit_minutes)
                          : ""
                      }
                      disabled={!detail || !!busyCase}
                      onChange={(e) => {
                        const value = Number(e.target.value);
                        setMinutes((prev) => ({ ...prev, [item.id]: value }));
                        localStorage.setItem(
                          `case-minutes:${item.id}`,
                          String(value),
                        );
                      }}
                    >
                      {!detail && <option value="">Carregando duração…</option>}
                      {detail &&
                        allowedMinutes(detail).map((value) => (
                          <option key={value} value={value}>
                            {value} {value === 1 ? "minuto" : "minutos"}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    className="button button-primary full"
                    onClick={() => void start(item.id)}
                    disabled={!!busyCase || !detail}
                  >
                    {busyCase === item.id
                      ? "Iniciando…"
                      : "Iniciar atendimento ↗"}
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <section className="dashboard-sources" aria-labelledby="dashboard-sources-title">
        <div className="dashboard-sources-intro">
          <span className="eyebrow">02 / FONTES CLÍNICAS</span>
          <h2 id="dashboard-sources-title">De onde vêm as orientações</h2>
          <p>Os protocolos didáticos foram adaptados de páginas públicas do NHS. Consulte as referências antes de iniciar um atendimento.</p>
        </div>
        <div className="dashboard-sources-list" aria-label="Referências clínicas">
          {clinicalSources.map((source) => (
            <a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.label} — fonte NHS (abre em nova aba)`}>
              <span>{source.label}</span><span aria-hidden="true">↗</span>
            </a>
          ))}
        </div>
        <p className="dashboard-sources-note">Conteúdo de simulação para estudo. As orientações não substituem avaliação clínica nem protocolos locais.</p>
      </section>
      <div className="dashboard-tabs" role="tablist" aria-label="Seus registros">
        <button id="history-tab" type="button" role="tab" aria-controls="history-panel" aria-selected={activeTab === "history"} onClick={() => setActiveTab("history")}>Histórico</button>
        <button id="feedback-tab" type="button" role="tab" aria-controls="feedback-panel" aria-selected={activeTab === "feedback"} onClick={() => setActiveTab("feedback")}>Feedbacks</button>
      </div>
      {activeTab === "history" ? <section id="history-panel" role="tabpanel" aria-labelledby="history-tab">
      <section className="section-heading history-heading">
        <div>
          <span className="eyebrow">03 / SEU HISTÓRICO</span>
          <h2>Atendimentos anteriores</h2>
        </div>
      </section>
      {historyError && (
        <ErrorPanel message={historyError} retry={() => void load()} />
      )}
      {loading && <Loading label="Carregando atendimentos…" />}
      {!loading &&
        !historyError &&
        (attempts.length === 0 ? (
          <Empty
            title="Sua jornada começa aqui"
            text="Inicie um caso acima para acompanhar seus atendimentos."
          />
        ) : (
          <div className="history-list">
            {attempts.map((item, index) => (
              <Link
                className="history-row"
                key={item.id}
                to={`/simulacoes/${item.id}${item.is_running ? "" : "/resultado"}`}
              >
                <span className="history-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="history-main">
                  <strong>Atendimento {item.id.slice(0, 8)}</strong>
                  <small>
                    {item.elapsed_time_minutes} / {item.time_limit_minutes} min
                    utilizados
                  </small>
                </span>
                <span
                  className={`pill ${item.is_running ? "pill-active" : "pill-done"}`}
                >
                  {item.is_running ? "Em andamento" : "Finalizado"}
                </span>
                <span aria-hidden>↗</span>
              </Link>
            ))}
          </div>
        ))}
      </section> : <section id="feedback-panel" className="dashboard-feedback" role="tabpanel" aria-labelledby="feedback-tab">
        <div className="section-heading history-heading"><div><span className="eyebrow">04 / FEEDBACKS</span><h2>Suas avaliações</h2></div></div>
        {loading && <Loading label="Carregando avaliações…" />}
        {historyError && <ErrorPanel message={historyError} retry={() => void load()} />}
        {feedbackError && <ErrorPanel message={feedbackError} retry={() => void load()} />}
        {feedbackNotice && <p className="inline-success" role="status">{feedbackNotice}</p>}
        {!loading && !historyError && !feedbackError && Object.keys(feedbacks).length === 0 && <Empty title="Nenhuma avaliação enviada" text="Ao terminar um atendimento, avalie sua experiência na tela de resultado." />}
        {Object.keys(feedbacks).length > 0 &&
          <div className="history-list">{attempts.filter(item => feedbacks[item.id]).map(item => <article className="history-row feedback-row" key={item.id}>
            <span className="history-main"><strong>Atendimento {item.id.slice(0, 8)}</strong><small>{feedbacks[item.id].liked ? "Gostou da experiência" : "Não gostou da experiência"} · Clareza {feedbacks[item.id].clarity}/5 · Dificuldade {feedbacks[item.id].difficulty}/5</small>
              {feedbacks[item.id].useful_feature && <small>Mais útil: {feedbacks[item.id].useful_feature}</small>}
              {feedbacks[item.id].improvement && <small>Melhoria: {feedbacks[item.id].improvement}</small>}
            </span><button className="button button-outline" onClick={() => { setFeedbackNotice(""); setEditingFeedbackId(item.id); }}>Editar avaliação</button>
            {editingFeedbackId === item.id && <FeedbackEditor simulationId={item.id} initial={feedbacks[item.id]} onCancel={() => setEditingFeedbackId(null)} onSaved={saved => { setFeedbacks(current => ({...current, [item.id]: saved})); setEditingFeedbackId(null); setFeedbackNotice("Avaliação atualizada."); }} />}
          </article>)}</div>}
      </section>}
    </main>
  );
}
