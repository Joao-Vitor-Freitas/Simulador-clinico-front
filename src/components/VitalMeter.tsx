import type { VitalSign } from "../types";

export function vitalPressure(vital: VitalSign) {
  const distance = (vital.critical_value ?? vital.baseline_value) - vital.baseline_value;
  if (!distance) return vital.is_critical ? 1 : 0;
  return Math.max(0, Math.min(1, (vital.value - vital.baseline_value) / distance));
}

export function VitalMeter({ vital }: { vital: VitalSign }) {
  const pressure = vitalPressure(vital);
  const label = vital.is_critical ? "Crítico" : pressure >= 0.65 ? "Atenção" : pressure >= 0.25 ? "Aproximando-se do limite" : "Estável";
  return <div className={`vital-meter ${vital.is_critical ? "is-critical" : pressure >= 0.65 ? "is-warning" : ""}`}>
    <div className="vital-meter-track" role="meter" aria-label={`Progressão de ${vital.name} até o limite crítico do caso`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pressure * 100)}>
      <span style={{ width: `${Math.max(4, pressure * 100)}%` }} />
    </div>
    <small>{label}</small>
  </div>;
}
