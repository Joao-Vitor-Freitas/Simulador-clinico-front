import { useEffect, useState } from "react";
import { Link, useParams } from "../navigation";
import { api, type ExperienceFeedback } from "../api";
import { clinicalNumber } from "../format";
import { Empty, ErrorPanel, Loading } from "../components/Feedback";
import { VitalMeter } from "../components/VitalMeter";
import type { Result, Simulation } from "../types";
export function ResultPage() {
  const { id = "" } = useParams();
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState<ExperienceFeedback | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [savingFeedback, setSavingFeedback] = useState(false);
  const [liked, setLiked] = useState<boolean | null>(null);
  const [clarity, setClarity] = useState(3);
  const [difficulty, setDifficulty] = useState(3);
  const [usefulFeature, setUsefulFeature] = useState("");
  const [improvement, setImprovement] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const state = await api.simulation(id);
      setSimulation(state);
      if (state.result) {
        setResult(await api.result(id));
        try {
          const existing = await api.feedback(id);
          setFeedback(existing);
          if (existing) {
            setLiked(existing.liked); setClarity(existing.clarity); setDifficulty(existing.difficulty);
            setUsefulFeature(existing.useful_feature); setImprovement(existing.improvement);
          }
          setShowFeedback(existing === null && sessionStorage.getItem(`feedback-dismissed:${id}`) !== "yes");
        } catch {
          setFeedbackError("A pesquisa está indisponível no momento. O resultado clínico continua disponível.");
        }
      }
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Não foi possível carregar o resultado.",
      );
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [id]);
  const submitFeedback = async () => {
    if (liked === null) { setFeedbackError("Escolha se você gostou da experiência."); return; }
    setSavingFeedback(true);
    setFeedbackError("");
    try {
      const body = { liked, clarity, difficulty, useful_feature: usefulFeature.trim(), improvement: improvement.trim() };
      const saved = feedback ? await api.updateFeedback(id, body) : await api.submitFeedback(id, body);
      setFeedback(saved);
      setShowFeedback(false);
    } catch (reason) {
      setFeedbackError(reason instanceof Error ? reason.message : "Não foi possível enviar. Tente novamente.");
    } finally { setSavingFeedback(false); }
  };
  if (loading)
    return (
      <main className="page">
        <Loading label="Preparando resultado clínico…" />
      </main>
    );
  if (error)
    return (
      <main className="page">
        <ErrorPanel message={error} retry={() => void load()} />
      </main>
    );
  if (!result || !simulation)
    return (
      <main className="page">
        <Empty
          title="Atendimento em andamento"
          text="O resultado estará disponível após finalizar a simulação."
        />
        <Link className="button button-primary" to={`/simulacoes/${id}`}>
          Voltar ao atendimento ↗
        </Link>
      </main>
    );
  const isCritical = result.definitive_outcome === "Agravamento crítico";
  const isTimeout = result.definitive_outcome === "Tempo esgotado";
  const isSuccess = result.definitive_outcome === "Atendimento bem-sucedido";
  const classifications = [
    { key: "correct", label: "Adequadas" },
    { key: "partially_correct", label: "Parciais" },
    { key: "assessment", label: "Avaliações" },
    { key: "incorrect", label: "A reavaliar" },
  ];
  const correctCount = simulation.interactions.filter(item => item.classification === "correct").length;
  const partialCount = simulation.interactions.filter(item => item.classification === "partially_correct").length;
  const assessmentCount = simulation.interactions.filter(item => item.classification === "assessment").length;
  const incorrectCount = simulation.interactions.filter(item => item.classification === "incorrect").length;
  return (
    <main className="page result-page">
      <div className="breadcrumbs">
        <Link to="/">Painel</Link>
        <span>/</span>
        <Link to={`/simulacoes/${id}`}>Atendimento {id.slice(0, 8)}</Link>
        <span>/</span>
        <span>Resultado</span>
      </div>
      <section
        className={`result-hero ${isCritical ? "result-hero-critical" : ""} ${isTimeout ? "result-hero-timeout" : ""}`}
      >
        <div>
          <span className="eyebrow light">
            ATENDIMENTO FINALIZADO / RESULTADO
          </span>
          <h1>
            {isCritical
              ? "O quadro se agravou."
              : isTimeout
                ? "O tempo se esgotou."
                : isSuccess
                  ? "Você estabilizou o quadro."
                  : "Você encerrou o atendimento."}
          </h1>
          <p>
            Revise suas decisões, o tempo utilizado e o estado final do
            paciente.
          </p>
        </div>
      </section>
      <div className="result-grid">
        <article className="result-card large">
          <span className="eyebrow">01 / DESFECHO CLÍNICO</span>
          <h2>{result.definitive_outcome}</h2>
          <p>{result.clinical_evolution}</p>
        </article>
        <article className="result-card diagnosis">
          <span className="eyebrow">02 / DIAGNÓSTICO</span>
          <h2>{simulation.disease_name || "Diagnóstico indisponível"}</h2>
          <div className="result-metric">
            <strong>{clinicalNumber(result.time_elapsed)}</strong>
            <span>
              de {simulation.time_limit_minutes}{" "}
              {simulation.time_limit_minutes === 1
                ? "minuto permitido"
                : "minutos permitidos"}
            </span>
          </div>
        </article>
        <article className="result-card feedback">
          <span className="eyebrow">03 / FEEDBACK</span>
          <h2>{isSuccess ? "O que funcionou" : "Para a próxima vez"}</h2>
          <p>{correctCount} {correctCount === 1 ? "conduta adequada" : "condutas adequadas"}, {partialCount} {partialCount === 1 ? "parcialmente adequada" : "parcialmente adequadas"}, {assessmentCount} {assessmentCount === 1 ? "avaliação do quadro" : "avaliações do quadro"} e {incorrectCount} a reavaliar. Perguntas e reavaliações ajudam a investigar, mas não resolvem a queixa sozinhas.</p>
          <div className="result-protocols">
            <h3>Protocolos consultados</h3>
            {simulation.protocols.some((item) => item.revealed_level > 0) ? (
              <ul>
                {simulation.protocols
                  .filter((item) => item.revealed_level > 0)
                  .map((item) => (
                    <li key={item.symptom_name}>
                      <strong>
                        {item.symptom_name} · nível {item.revealed_level} de 3
                      </strong>
                      {item.content.map((content, index) => (
                        <p key={index}>
                          {index + 1} · {['Orientação', 'Direcionamento', 'Conduta esperada'][index]}: {content}
                        </p>
                      ))}
                      {item.reference_source && <p><a href={item.reference_source} target="_blank" rel="noopener noreferrer">Fonte clínica: NHS ↗</a></p>}
                    </li>
                  ))}
              </ul>
            ) : (
              <p>Nenhum protocolo consultado neste atendimento.</p>
            )}
          </div>
        </article>
        <article className="result-card actions">
          <span className="eyebrow">CONTINUE APRENDENDO</span>
          <h2>Cada caso é uma nova oportunidade.</h2>
          <div>
            <Link className="button button-primary" to="/">
              Escolher outro caso ↗
            </Link>
            <Link className="button button-outline" to={`/simulacoes/${id}`}>
              Rever atendimento
            </Link>
          </div>
        </article>
      </div>
      <section className="result-review" aria-labelledby="result-review-title">
        <div className="section-heading">
          <div>
            <span className="eyebrow">REVISÃO DO ATENDIMENTO</span>
            <h2 id="result-review-title">O que aconteceu durante o caso</h2>
          </div>
        </div>
        <div
          className="result-classifications"
          aria-label="Classificação das interações pela IA"
        >
          {classifications.map((item) => (
            <div key={item.key}>
              <strong>
                {
                  simulation.interactions.filter(
                    (interaction) => interaction.classification === item.key,
                  ).length
                }
              </strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
        <div className="result-state-grid">
          <article className="result-card result-readings-card">
            <span className="eyebrow">SINAIS VITAIS FINAIS</span>
            {simulation.vital_signs.length === 0 ? (
              <p>Nenhum sinal registrado.</p>
            ) : (
              <ul className="result-state-list">
                {simulation.vital_signs.map((item) => (
                  <li
                    key={item.name}
                    className={item.is_critical ? "result-state-critical" : ""}
                  >
                    <div className="result-reading-heading"><span>{item.name}</span><strong>{clinicalNumber(item.value)} {item.unit}</strong></div>
                    <VitalMeter vital={item} />
                  </li>
                ))}
              </ul>
            )}
          </article>
          <article className="result-card result-readings-card">
            <span className="eyebrow">SINTOMAS FINAIS</span>
            {simulation.symptoms.length === 0 ? (
              <p>Nenhum sintoma registrado.</p>
            ) : (
              <ul className="result-state-list">
                {simulation.symptoms.map((item) => (
                  <li key={item.name} className={`severity-${item.severity.toLowerCase()}`}>
                    <div className="result-reading-heading"><span>{item.name}</span><strong>{clinicalNumber(item.intensity)}/10</strong></div>
                    <div className="result-symptom-meter" role="meter" aria-label={`Intensidade de ${item.name}`} aria-valuemin={0} aria-valuemax={10} aria-valuenow={item.intensity}><span style={{width: `${item.intensity * 10}%`}} /></div>
                    <small>{item.state === "inactive" ? "Queixa resolvida no simulador" : item.state === "inhibited" ? "Queixa abordada" : item.severity === "HIGH" ? "Alta intensidade" : item.severity === "MODERATE" ? "Intensidade moderada" : "Baixa intensidade"}</small>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
        <article className="result-card result-history">
          <span className="eyebrow">HISTÓRICO DE DECISÕES</span>
          {simulation.interactions.length === 0 ? (
            <p>Nenhuma interação foi enviada antes do encerramento.</p>
          ) : (
            <ol>
              {simulation.interactions.map((item, index) => (
                <li key={item.id}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{item.student_text}</strong>
                    <p>Paciente: {item.patient_response}</p>
                    <small className={`result-decision-tag result-decision-${item.classification}`}>
                      {item.classification === "correct"
                        ? "Conduta adequada"
                        : item.classification === "partially_correct"
                          ? "Conduta parcialmente adequada"
                          : item.classification === "assessment"
                            ? "Avaliação do quadro"
                          : "Reavaliar conduta"}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </article>
      </section>
      <section className="result-experience-card" aria-label="Avaliação da experiência">
        <div><span className="eyebrow">SUA VOZ NO SIMULADOR</span><h2>Conte como foi atender este caso.</h2>
          <p>{feedback ? `Você ${feedback.liked ? "gostou" : "não gostou"} da experiência · Clareza ${feedback.clarity}/5 · Dificuldade ${feedback.difficulty}/5` : "Seu retorno ajuda a melhorar os próximos atendimentos. Leva menos de um minuto."}</p></div>
        <button className="button button-primary" onClick={() => { setFeedbackError(""); setShowFeedback(true); }}>{feedback ? "Editar avaliação ↗" : "Avaliar experiência ↗"}</button>
      </section>
      <p className="result-disclaimer">Conteúdo educacional de simulação. Não use como orientação para pacientes reais.</p>
      {showFeedback && <div className="experience-backdrop" role="presentation">
        <section className="experience-dialog" role="dialog" aria-modal="true" aria-labelledby="experience-title">
          <span className="eyebrow">AVALIAÇÃO DO ATENDIMENTO</span><h2 id="experience-title">Como foi sua experiência?</h2>
          <p>Resposta opcional, vinculada a este atendimento. Não inclua dados de pacientes reais.</p>
          <fieldset className="experience-choice"><legend>Você gostou da experiência?</legend>
            <label className={liked === true ? "selected" : ""}><input type="radio" name="liked" checked={liked === true} onChange={() => setLiked(true)} /> Sim, gostei</label>
            <label className={liked === false ? "selected" : ""}><input type="radio" name="liked" checked={liked === false} onChange={() => setLiked(false)} /> Ainda pode melhorar</label>
          </fieldset>
          <label>Clareza das informações (1 a 5)
            <select value={clarity} onChange={event => setClarity(Number(event.target.value))}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select>
          </label>
          <label>Dificuldade de uso (1 fácil, 5 difícil)
            <select value={difficulty} onChange={event => setDifficulty(Number(event.target.value))}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}</select>
          </label>
          <label>O que foi mais útil? (opcional)
            <textarea maxLength={1000} value={usefulFeature} onChange={event => setUsefulFeature(event.target.value)} />
          </label>
          <label>O que devemos melhorar? (opcional)
            <textarea maxLength={1000} value={improvement} onChange={event => setImprovement(event.target.value)} />
          </label>
          {feedbackError && <p role="alert">{feedbackError}</p>}
          <div className="experience-actions">
            <button className="button button-outline" onClick={() => { sessionStorage.setItem(`feedback-dismissed:${id}`, "yes"); setShowFeedback(false); }}>Agora não</button>
            <button className="button button-primary" disabled={savingFeedback} onClick={() => void submitFeedback()}>{savingFeedback ? "Salvando…" : feedback ? "Salvar alterações" : "Enviar avaliação"}</button>
          </div>
        </section>
      </div>}
    </main>
  );
}
