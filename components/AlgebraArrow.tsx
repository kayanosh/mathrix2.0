"use client";

interface AlgebraArrowProps {
  label: string;
  direction?: "down" | "both_sides" | "simplify";
  color?: string;
}

const COLORS: Record<string, string> = {
  down: "#6366f1",
  both_sides: "#10b981",
  simplify: "#f59e0b",
};

export default function AlgebraArrow({
  label,
  direction = "down",
  color,
}: AlgebraArrowProps) {
  const arrowColor = color || COLORS[direction];

  if (direction === "both_sides") {
    return (
      <div className="flex items-center justify-center gap-3 my-2 select-none">
        {/* Left arrow */}
        <svg width="60" height="28" viewBox="0 0 60 28">
          <defs>
            <marker
              id={`arrowhead-left-${label}`}
              markerWidth="8"
              markerHeight="6"
              refX="0"
              refY="3"
              orient="auto"
            >
              <polygon points="8 0, 0 3, 8 6" fill={arrowColor} />
            </marker>
          </defs>
          <line
            x1="55"
            y1="14"
            x2="8"
            y2="14"
            stroke={arrowColor}
            strokeWidth="2"
            markerEnd={`url(#arrowhead-left-${label})`}
          />
        </svg>

        {/* Label */}
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full border whitespace-nowrap"
          style={{
            color: arrowColor,
            borderColor: arrowColor,
            backgroundColor: `${arrowColor}18`,
          }}
        >
          {label}
        </span>

        {/* Right arrow */}
        <svg width="60" height="28" viewBox="0 0 60 28">
          <defs>
            <marker
              id={`arrowhead-right-${label}`}
              markerWidth="8"
              markerHeight="6"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 8 3, 0 6" fill={arrowColor} />
            </marker>
          </defs>
          <line
            x1="5"
            y1="14"
            x2="52"
            y2="14"
            stroke={arrowColor}
            strokeWidth="2"
            markerEnd={`url(#arrowhead-right-${label})`}
          />
        </svg>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center my-2 select-none">
      <span
        className="text-xs font-semibold px-3 py-1 rounded-full border mb-1 whitespace-nowrap"
        style={{
          color: arrowColor,
          borderColor: arrowColor,
          backgroundColor: `${arrowColor}18`,
        }}
      >
        {label}
      </span>
      <svg width="28" height="28" viewBox="0 0 28 28">
        <defs>
          <marker
            id={`arrow-down-${label}`}
            markerWidth="8"
            markerHeight="6"
            refX="4"
            refY="6"
            orient="auto"
          >
            <polygon points="0 0, 8 0, 4 6" fill={arrowColor} />
          </marker>
        </defs>
        <line
          x1="14"
          y1="2"
          x2="14"
          y2="20"
          stroke={arrowColor}
          strokeWidth="2"
          markerEnd={`url(#arrow-down-${label})`}
        />
      </svg>
    </div>
  );
}
