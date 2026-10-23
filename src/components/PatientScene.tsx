const roomAtlas = "/scene/hospital-atlas.png";
const patientPoses = "/scene/patient-poses.png";
const waitingFurniture = "/scene/furniture-waiting.png";

type Props = {
  simulationId: string;
  state: "stable" | "intense" | "critical";
  running: boolean;
};

export function PatientScene({ state, running }: Props) {
  const description =
    state === "critical"
      ? "sinais críticos"
      : state === "intense"
        ? "sintomas intensos"
        : "em observação";
  return (
    <div
      className={`patient-scene patient-scene-${state} ${running ? "is-running" : ""}`}
      role="img"
      aria-label={`Sala de atendimento em pixel art com paciente ${description}.`}
    >
      <svg
        className="scene-room-art"
        viewBox="8 43 688 494"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="room-art-clip">
            <rect x="8" y="43" width="688" height="494" />
          </clipPath>
        </defs>
        <image
          href={roomAtlas}
          width="1536"
          height="1024"
          clipPath="url(#room-art-clip)"
        />
      </svg>
      <svg className="scene-plant" viewBox="360 15 110 190" aria-hidden="true">
        <defs>
          <clipPath id="plant-art-clip">
            <rect x="360" y="15" width="110" height="190" />
          </clipPath>
        </defs>
        <image
          href={waitingFurniture}
          width="512"
          height="512"
          clipPath="url(#plant-art-clip)"
        />
      </svg>
      <div
        className="scene-pose"
        style={{ backgroundImage: `url(${patientPoses})` }}
        aria-hidden="true"
      />
      <span className="scene-condition">
        {!running
          ? "ATENDIMENTO ENCERRADO"
          : state === "critical"
            ? "ESTADO CRÍTICO"
            : state === "intense"
              ? "ATENÇÃO AO QUADRO"
              : "EM OBSERVAÇÃO"}
      </span>
    </div>
  );
}
