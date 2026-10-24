// Etapa 9 da Sprint 4: validação da matemática e das decisões com cenários distintos.
// Executar com: npm run test:matematica
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analisarSerie,
  avaliarEstadoClinicoMVP,
  calcularAcumuloHipoxia,
  calcularDerivada,
  calcularDerivadaAtual,
  criarAmostra,
  identificarSinal,
  minutosAteLimite,
  registrarAmostra,
  type VitalSample,
} from "../src/math.ts";

const ponto = (tempo: number, valor: number) => ({ tempo, valor });
const serieSpO2 = (valores: number[]): VitalSample[] => valores.map((spo2, tempo) => ({ tempo, spo2 }));

test("derivada discreta entre leituras consecutivas", () => {
  const dados = [92, 90, 87, 82, 95, 97, 98].map((v, t) => ponto(t, v));
  assert.deepEqual(dados.map((_, i) => calcularDerivada(dados, i)), [0, -2, -3, -5, 13, 2, 1]);
});

test("derivada protege contra dt zero e índice inicial", () => {
  assert.equal(calcularDerivada([ponto(1, 90), ponto(1, 80)], 1), 0);
  assert.equal(calcularDerivada([ponto(0, 90)], 0), 0);
});

test("derivada atual usa janela mínima e não explode com leituras quase simultâneas", () => {
  const dados = [ponto(0, 92), ponto(1, 92), ponto(1.01, 95)];
  // Contra a leitura anterior (0,01 min) seria +300 %/min; com a janela de 0,25 min usa t=1 → ...
  const atual = calcularDerivadaAtual(dados);
  assert.ok(atual !== null && atual < 5, `derivada atual ${atual}`);
  assert.equal(calcularDerivadaAtual([ponto(0, 92)]), null);
});

test("integral por trapézios: sem hipóxia, área zero", () => {
  assert.equal(calcularAcumuloHipoxia([92, 93, 95].map((v, t) => ponto(t, v))), 0);
});

test("integral por trapézios: exemplo do guia (92, 90, 87, 82, 95, 97, 98)", () => {
  // Déficits contra 90: 0, 0, 3, 8, 0, 0, 0 → 1,5 + 5,5 + 4 = 11
  const dados = [92, 90, 87, 82, 95, 97, 98].map((v, t) => ponto(t, v));
  assert.equal(calcularAcumuloHipoxia(dados), 11);
});

test("integral respeita intervalos de tamanho diferente", () => {
  // Déficit constante de 5 durante 2 minutos = 10 %·min
  assert.equal(calcularAcumuloHipoxia([ponto(0, 85), ponto(0.5, 85), ponto(2, 85)]), 10);
});

test("tempo até o limite crítico a partir da derivada", () => {
  assert.equal(minutosAteLimite(94, -2), 3);
  assert.equal(minutosAteLimite(94, 1), null);
  assert.equal(minutosAteLimite(87, -2), null);
  assert.equal(minutosAteLimite(94, null), null);
});

test("motor de decisão: cenário Estável", () => {
  assert.equal(avaliarEstadoClinicoMVP(96, 0, 0).status, "Estável");
  assert.equal(analisarSerie(serieSpO2([96, 96, 97, 96])).avaliacao?.status, "Estável");
});

test("motor de decisão: cenário Em Atenção (valor, derivada e acúmulo)", () => {
  assert.equal(avaliarEstadoClinicoMVP(90, 0, 0).status, "Em Atenção"); // S < 92
  assert.equal(avaliarEstadoClinicoMVP(96, -2.5, 0).status, "Em Atenção"); // S' < -2
  assert.equal(avaliarEstadoClinicoMVP(96, 0, 3).status, "Em Atenção"); // déficit 1–15
});

test("motor de decisão: cenário Piora Crítica (valor, derivada e acúmulo)", () => {
  assert.equal(avaliarEstadoClinicoMVP(87, 0, 0).status, "Piora Crítica"); // S < 88
  assert.equal(avaliarEstadoClinicoMVP(95, -4.5, 0).status, "Piora Crítica"); // S' < -4
  assert.equal(avaliarEstadoClinicoMVP(95, 0, 16).status, "Piora Crítica"); // déficit > 15
});

test("motor de decisão: cenário Em Recuperação, inclusive depois de uma hipóxia", () => {
  assert.equal(avaliarEstadoClinicoMVP(95, 2, 0).status, "Em Recuperação");
  // Déficit acumulado nunca diminui; quem já se recuperou continua sendo "Em Recuperação".
  assert.equal(avaliarEstadoClinicoMVP(95, 2, 11).status, "Em Recuperação");
  assert.equal(avaliarEstadoClinicoMVP(95, 2, 40).status, "Em Recuperação");
  // Abaixo de 90 não conta como recuperação, mesmo subindo.
  assert.equal(avaliarEstadoClinicoMVP(89, 2, 0).status, "Em Atenção");
});

test("cenário completo: piora seguida de recuperação gera Piora Crítica e depois Em Recuperação", () => {
  const piora = analisarSerie(serieSpO2([92, 90, 87, 82]));
  assert.equal(piora.avaliacao?.status, "Piora Crítica");
  assert.equal(piora.nivelAcumulo.nivel, "leve");
  const recuperacao = analisarSerie(serieSpO2([92, 90, 87, 82, 95]));
  assert.equal(recuperacao.avaliacao?.status, "Em Recuperação");
  assert.equal(recuperacao.acumulo, 11);
});

test("identificação dos sinais pela API, com e sem acento", () => {
  assert.equal(identificarSinal({ name: "Saturação de oxigênio", unit: "%" }), "spo2");
  assert.equal(identificarSinal({ name: "SpO2", unit: "%" }), "spo2");
  assert.equal(identificarSinal({ name: "Frequência cardíaca", unit: "bpm" }), "fc");
  assert.equal(identificarSinal({ name: "Frequência respiratória", unit: "irpm" }), "fr");
  assert.equal(identificarSinal({ name: "Temperatura", unit: "°C" }), null);
});

test("caso sem SpO₂ não gera classificação e mantém os demais sinais", () => {
  const amostra = criarAmostra(1, [
    { name: "Temperatura", value: 38.4, unit: "°C", is_critical: false, baseline_value: 36, critical_value: 40 },
    { name: "Frequência cardíaca", value: 118, unit: "bpm", is_critical: false, baseline_value: 80, critical_value: 150 },
  ]);
  const analise = analisarSerie([{ ...amostra, tempo: 0, fc: 100 }, amostra]);
  assert.equal(analise.temSpO2, false);
  assert.equal(analise.avaliacao, null);
  assert.equal(analise.fc?.atual, 118);
  assert.equal(analise.fc?.foraDaFaixa, false);
});

test("FC fora da faixa crítica é sinalizada", () => {
  assert.equal(analisarSerie([{ tempo: 0, fc: 130 }]).fc?.foraDaFaixa, true);
  assert.equal(analisarSerie([{ tempo: 0, fc: 45 }]).fc?.foraDaFaixa, true);
});

test("registro de amostras: ordena, substitui duplicatas e ignora leituras antigas", () => {
  let serie: VitalSample[] = [];
  serie = registrarAmostra(serie, { tempo: 1, spo2: 90 });
  serie = registrarAmostra(serie, { tempo: 1.001, spo2: 91 }); // mesma marca → substitui
  serie = registrarAmostra(serie, { tempo: 0.5, spo2: 99 }); // fora de ordem → ignora
  serie = registrarAmostra(serie, { tempo: 2, spo2: 85 });
  assert.deepEqual(serie, [{ tempo: 1.001, spo2: 91 }, { tempo: 2, spo2: 85 }]);
});
