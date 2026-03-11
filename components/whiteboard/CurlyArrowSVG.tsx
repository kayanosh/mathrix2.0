"use client";

import { motion } from "framer-motion";

interface Props {
  color: string;
  delay: number;
  label?: string;
  style?: "curly" | "straight" | "loop-over";
}

/**
 * Hand-drawn style arrow — looks like a teacher drew it with a marker.
 * Uses slightly wobbly paths and a simple triangular arrowhead.
 */
export default function CurlyArrowSVG({
  color,
  delay,
  label,
  style = "curly",
}: Props) {
  const width = 100;
  const height = 32;

  // Hand-drawn looking paths (slightly irregular)
  const paths: Record<string, string> = {
    curly: `M 6,18 C 18,6 38,6 50,16 S 82,30 94,18`,
    straight: `M 6,16 Q 30,14 50,16 Q 70,18 94,16`,
    "loop-over": `M 6,22 C 18,2 50,-4 50,16 S 82,36 94,22`,
  };

  const d = paths[style] || paths.curly;

  return (
    <div className="relative flex flex-col items-center">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        fill="none"
        overflow="visible"
        className="flex-shrink-0"
      >
        {/* Main hand-drawn curve */}
        <motion.path
          d={d}
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          strokeDasharray="180"
          initial={{ strokeDashoffset: 180 }}
          animate={{ strokeDashoffset: 0 }}
          transition={{ delay, duration: 0.45, ease: "easeInOut" }}
          style={{ filter: "url(#wb-rough)" }}
        />

        {/* Arrowhead — simple hand-drawn triangle */}
        <motion.path
          d="M 90,12 L 96,18 L 88,20"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          initial={{ opacity: 0, pathLength: 0 }}
          animate={{ opacity: 1, pathLength: 1 }}
          transition={{ delay: delay + 0.4, duration: 0.15 }}
        />

        {/* Subtle roughness filter */}
        <defs>
          <filter id="wb-rough">
            <feTurbulence
              type="turbulence"
              baseFrequency="0.03"
              numOctaves="2"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="1.2"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Label below — teacher's annotation */}
      {label && (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.3 }}
          className="font-[family-name:var(--font-caveat)] text-sm mt-0.5"
          style={{ color }}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}
