import { useId } from "react";
const atlas = "/scene/hospital-atlas.png";

type IconName =
  | "heart"
  | "lungs"
  | "pressure"
  | "temperature"
  | "oxygen"
  | "clock"
  | "protocol"
  | "dialogue"
  | "exam"
  | "alert";

const regions: Record<IconName, [number, number, number, number]> = {
  heart: [1048, 587, 76, 72],
  lungs: [1140, 587, 76, 72],
  pressure: [1238, 587, 79, 72],
  temperature: [1348, 587, 65, 72],
  oxygen: [1430, 587, 69, 72],
  clock: [1045, 917, 72, 70],
  protocol: [1144, 917, 72, 70],
  dialogue: [1242, 917, 72, 70],
  exam: [1342, 917, 72, 70],
  alert: [1437, 917, 80, 70],
};

export function AtlasIcon({
  name,
  className = "",
}: {
  name: IconName;
  className?: string;
}) {
  const [x, y, width, height] = regions[name];
  const clipId = useId().replaceAll(":", "");
  return (
    <svg
      className={`atlas-icon ${className}`}
      viewBox={`${x} ${y} ${width} ${height}`}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={x} y={y} width={width} height={height} />
        </clipPath>
      </defs>
      <image
        href={atlas}
        width="1536"
        height="1024"
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
