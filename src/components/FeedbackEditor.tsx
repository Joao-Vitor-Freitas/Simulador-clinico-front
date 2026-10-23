"use client";
import { useState } from "react";
import { api, type ExperienceFeedback } from "../api";

export function FeedbackEditor({ simulationId, initial, onSaved, onCancel }: {
  simulationId: string;
  initial: ExperienceFeedback;
  onSaved: (feedback: ExperienceFeedback) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try { onSaved(await api.updateFeedback(simulationId, form)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar a avaliação."); }
    finally { setBusy(false); }
  }
  return <form className="experience-dialog dashboard-feedback-editor" onSubmit={event => void save(event)}>
    <span className="eyebrow">EDITAR AVALIAÇÃO</span>
    <h3>Como foi este atendimento?</h3>
    <fieldset className="experience-choice"><legend>Você gostou da experiência?</legend>
      <label className={form.liked ? "selected" : ""}><input type="radio" name={`liked-${simulationId}`} checked={form.liked} onChange={() => setForm({...form, liked: true})} /> Sim, gostei</label>
      <label className={!form.liked ? "selected" : ""}><input type="radio" name={`liked-${simulationId}`} checked={!form.liked} onChange={() => setForm({...form, liked: false})} /> Ainda pode melhorar</label>
    </fieldset>
    <label>Clareza das informações (1 a 5)<select value={form.clarity} onChange={event => setForm({...form, clarity: Number(event.target.value)})}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>
    <label>Dificuldade de uso (1 fácil, 5 difícil)<select value={form.difficulty} onChange={event => setForm({...form, difficulty: Number(event.target.value)})}>{[1,2,3,4,5].map(n => <option key={n}>{n}</option>)}</select></label>
    <label>O que foi mais útil?<textarea maxLength={1000} value={form.useful_feature} onChange={event => setForm({...form, useful_feature: event.target.value})} /></label>
    <label>O que devemos melhorar?<textarea maxLength={1000} value={form.improvement} onChange={event => setForm({...form, improvement: event.target.value})} /></label>
    {error && <p role="alert" className="inline-error">{error}</p>}
    <div className="experience-actions"><button type="button" className="button button-outline" onClick={onCancel}>Cancelar</button><button className="button button-primary" disabled={busy}>{busy ? "Salvando…" : "Salvar alterações"}</button></div>
  </form>;
}
