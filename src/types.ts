export type User = { id: string; email: string; name: string };
export type CaseSummary = { id: string; title: string };
export type CaseDetail = CaseSummary & {
  default_time_limit_minutes: number;
  max_time_limit_minutes: number;
};
export type SimulationSummary = {
  id: string;
  is_running: boolean;
  elapsed_time_minutes: number;
  time_limit_minutes: number;
};
export type Interaction = {
  id: string;
  student_text: string;
  patient_response: string;
  classification: string;
  evaluated_symptom_name: string;
  input_tokens: number;
  output_tokens: number;
};
export type Symptom = {
  name: string;
  intensity: number;
  severity: string;
  state: string;
  is_complex: boolean;
};
export type VitalSign = {
  name: string;
  value: number;
  unit: string;
  is_critical: boolean;
  baseline_value: number;
  critical_value: number | null;
};
export type Protocol = {
  symptom_name: string;
  revealed_level: number;
  reference_source: string | null;
  content: string[];
};
export type Result = {
  clinical_evolution: string;
  time_elapsed: number;
  definitive_outcome: string;
  feedback: string;
};
export type Simulation = SimulationSummary & {
  remaining_seconds: number;
  disease_name: string | null;
  interactions: Interaction[];
  protocol_progress: Record<string, number>;
  protocols: Protocol[];
  vital_signs: VitalSign[];
  symptoms: Symptom[];
  result: Result | null;
};
export type InteractionResult = {
  interaction_id: string;
  simulation: Simulation;
};
export type ProtocolResult = {
  symptom_name: string;
  level: number;
  content: string;
  has_next_level: boolean;
};
