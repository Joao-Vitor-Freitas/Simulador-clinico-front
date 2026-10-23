import type { Simulation } from "./types";
import { clinicalNumber } from "./format";
import { vitalPressure } from "./components/VitalMeter";

export type ClinicalChange = {
  key: string;
  name: string;
  before: string;
  after: string;
  tone: "critical" | "worse" | "better" | "changed";
};

export type ClinicalEvolution = {
  title: string;
  changes: ClinicalChange[];
};

const formatValue = (value: number, unit = "") =>
  `${clinicalNumber(value)}${unit ? `${unit.startsWith("/") || unit === "%" ? "" : " "}${unit}` : ""}`;
const severityLabel = (severity: string) =>
  ({ LOW: "baixa", MODERATE: "moderada", HIGH: "alta" })[severity as "LOW" | "MODERATE" | "HIGH"] || severity.toLowerCase();

export function compareClinicalState(
  previous: Simulation | null,
  current: Simulation,
): ClinicalEvolution | null {
  if (!previous || previous.id !== current.id) return null;
  const changes: ClinicalChange[] = [];

  for (const next of current.vital_signs) {
    const before = previous.vital_signs.find((item) => item.name === next.name);
    if (!before) continue;
    const beforeValue = formatValue(before.value, before.unit);
    const afterValue = formatValue(next.value, next.unit);
    if (beforeValue === afterValue && before.is_critical === next.is_critical) continue;
    changes.push({
      key: `vital-${next.name}`,
      name: next.name,
      before: `${beforeValue}${before.is_critical ? " · crítico" : ""}`,
      after: `${afterValue}${next.is_critical ? " · crítico" : ""}`,
      tone: next.is_critical ? "critical" : vitalPressure(next) < vitalPressure(before) ? "better" : "worse",
    });
  }

  for (const next of current.symptoms) {
    const before = previous.symptoms.find((item) => item.name === next.name);
    if (!before) {
      changes.push({ key: `symptom-${next.name}`, name: next.name,
        before: "Não identificado", after: formatValue(next.intensity, "/10"), tone: "changed" });
      continue;
    }
    const beforeValue = formatValue(before.intensity, "/10");
    const afterValue = formatValue(next.intensity, "/10");
    if (beforeValue === afterValue && before.state === next.state && before.severity === next.severity) continue;
    changes.push({
      key: `symptom-${next.name}`,
      name: next.name,
      before: `${beforeValue}${before.severity !== next.severity ? ` · ${severityLabel(before.severity)}` : ""}`,
      after: next.state === "inhibited" ? "Queixa abordada" : next.state === "inactive" ? "Resolvido" : `${afterValue}${before.severity !== next.severity ? ` · ${severityLabel(next.severity)}` : ""}`,
      tone:
        next.state !== "active" ? "better" : next.intensity > before.intensity
          ? "worse"
          : next.intensity < before.intensity
            ? "better"
            : "changed",
    });
  }

  if (changes.length === 0) return null;
  const actionRecorded =
    current.interactions.length > previous.interactions.length;
  const discovered = changes.some(change => change.before === "Não identificado");
  const critical = changes.some(change => change.tone === "critical");
  const worse = changes.some(change => change.tone === "worse");
  const better = changes.some(change => change.tone === "better");
  return {
    title:
      critical
        ? "Sinal crítico identificado"
        : discovered
        ? "Nova queixa identificada"
        : worse
          ? "Quadro em agravamento"
          : better && actionRecorded
            ? "Melhora após a conduta"
            : better
              ? "Quadro em melhora"
              : "Mudança clínica identificada",
    changes,
  };
}
