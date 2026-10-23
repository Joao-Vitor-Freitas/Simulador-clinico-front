export function Loading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="feedback-panel" role="status">
      <div className="spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  );
}
export function ErrorPanel({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="feedback-panel error-panel" role="alert">
      <span className="feedback-icon">!</span>
      <p>{message}</p>
      {retry && (
        <button className="button button-outline" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="feedback-panel">
      <span className="empty-icon">✳</span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
