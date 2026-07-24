"use client";

import { motion } from "framer-motion";
import type { CuboidArrayBlock } from "@/types/whiteboard";

interface Props {
  block: CuboidArrayBlock;
  baseDelay: number;
}

interface Point {
  x: number;
  y: number;
}

function points(values: Point[]): string {
  return values.map((point) => `${point.x},${point.y}`).join(" ");
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * A deterministic KS2 volume model. The grid on all three visible faces makes
 * the equal rows, columns, and layers explicit instead of showing an empty box.
 */
export default function CuboidArrayRenderer({ block, baseDelay }: Props) {
  const length = Math.max(1, Math.round(block.length));
  const width = Math.max(1, Math.round(block.width));
  const height = Math.max(1, Math.round(block.height));
  const layerSize = length * width;
  const unit = block.unit?.trim() || "unit";
  const cubicUnit = unit === "unit" ? "cubic unit" : `${unit}³`;

  const canvasWidth = 520;
  const canvasHeight = 330;
  const xStep = Math.min(54, 250 / length);
  const depthX = Math.min(30, 90 / width);
  const depthY = Math.min(22, 66 / width);
  const zStep = Math.min(48, 142 / height);
  const solidWidth = length * xStep + width * depthX;
  const originX = (canvasWidth - solidWidth) / 2;
  const originY = 252;

  const project = (x: number, y: number, z: number): Point => ({
    x: originX + x * xStep + y * depthX,
    y: originY - y * depthY - z * zStep,
  });

  const front = [
    project(0, 0, 0),
    project(length, 0, 0),
    project(length, 0, height),
    project(0, 0, height),
  ];
  const side = [
    project(length, 0, 0),
    project(length, width, 0),
    project(length, width, height),
    project(length, 0, height),
  ];
  const top = [
    project(0, 0, height),
    project(length, 0, height),
    project(length, width, height),
    project(0, width, height),
  ];

  const lengthMid = midpoint(project(0, 0, 0), project(length, 0, 0));
  const widthMid = midpoint(project(length, 0, 0), project(length, width, 0));
  const heightMid = midpoint(project(0, 0, 0), project(0, 0, height));

  const gridLines: Array<{ from: Point; to: Point; key: string }> = [];

  // Front face: length by height.
  for (let x = 1; x < length; x++) {
    gridLines.push({
      key: `front-x-${x}`,
      from: project(x, 0, 0),
      to: project(x, 0, height),
    });
  }
  for (let z = 1; z < height; z++) {
    gridLines.push({
      key: `front-z-${z}`,
      from: project(0, 0, z),
      to: project(length, 0, z),
    });
  }

  // Right face: depth by height.
  for (let y = 1; y < width; y++) {
    gridLines.push({
      key: `side-y-${y}`,
      from: project(length, y, 0),
      to: project(length, y, height),
    });
  }
  for (let z = 1; z < height; z++) {
    gridLines.push({
      key: `side-z-${z}`,
      from: project(length, 0, z),
      to: project(length, width, z),
    });
  }

  // Top face: length by depth.
  for (let x = 1; x < length; x++) {
    gridLines.push({
      key: `top-x-${x}`,
      from: project(x, 0, height),
      to: project(x, width, height),
    });
  }
  for (let y = 1; y < width; y++) {
    gridLines.push({
      key: `top-y-${y}`,
      from: project(0, y, height),
      to: project(length, y, height),
    });
  }

  return (
    <figure
      className="rounded-2xl border border-indigo-100 bg-gradient-to-b from-white to-indigo-50/60 px-3 py-4"
      aria-label={`${length} by ${width} by ${height} cuboid split into unit cubes`}
    >
      <svg
        viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
        className="mx-auto w-full max-w-2xl"
        role="img"
        aria-label={`${length} cubes long, ${width} cubes deep, and ${height} cubes high`}
      >
        <defs>
          <linearGradient id="cuboid-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e0e7ff" />
            <stop offset="100%" stopColor="#c7d2fe" />
          </linearGradient>
          <linearGradient id="cuboid-side" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c7d2fe" />
            <stop offset="100%" stopColor="#a5b4fc" />
          </linearGradient>
          <linearGradient id="cuboid-top" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#eef2ff" />
            <stop offset="100%" stopColor="#dbeafe" />
          </linearGradient>
        </defs>

        <motion.polygon
          points={points(front)}
          fill="url(#cuboid-front)"
          stroke="#6366f1"
          strokeWidth="2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay, duration: 0.35 }}
        />
        <motion.polygon
          points={points(side)}
          fill="url(#cuboid-side)"
          stroke="#6366f1"
          strokeWidth="2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.08, duration: 0.35 }}
        />
        <motion.polygon
          points={points(top)}
          fill="url(#cuboid-top)"
          stroke="#6366f1"
          strokeWidth="2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.16, duration: 0.35 }}
        />

        {gridLines.map((line, index) => (
          <motion.line
            key={line.key}
            x1={line.from.x}
            y1={line.from.y}
            x2={line.to.x}
            y2={line.to.y}
            stroke="#818cf8"
            strokeWidth="1.35"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.9 }}
            transition={{ delay: baseDelay + 0.2 + index * 0.025, duration: 0.25 }}
          />
        ))}

        <g
          data-teacher-target="primary"
          data-teacher-label={`${length} cubes long`}
          data-teacher-sequence={0}
        >
          <text
            x={lengthMid.x}
            y={lengthMid.y + 31}
            textAnchor="middle"
            fill="#4338ca"
            fontSize="17"
            fontWeight="700"
          >
            {length} cubes long
          </text>
        </g>
        <g
          data-teacher-target="primary"
          data-teacher-label={`${width} cubes deep`}
          data-teacher-sequence={1}
        >
          <text
            x={widthMid.x + 24}
            y={widthMid.y + 25}
            textAnchor="middle"
            fill="#4338ca"
            fontSize="17"
            fontWeight="700"
          >
            {width} deep
          </text>
        </g>
        <g
          data-teacher-target="primary"
          data-teacher-label={`${height} layers high`}
          data-teacher-sequence={2}
        >
          <text
            x={heightMid.x - 38}
            y={heightMid.y + 5}
            textAnchor="middle"
            fill="#4338ca"
            fontSize="17"
            fontWeight="700"
          >
            {height} layers
          </text>
        </g>
      </svg>

      <figcaption className="flex flex-wrap items-center justify-center gap-2 text-center text-sm text-slate-700">
        <span className="rounded-full bg-indigo-100 px-3 py-1 font-semibold text-indigo-800">
          One layer: {length} × {width} = {layerSize} cubes
        </span>
        <span className="rounded-full bg-white px-3 py-1 ring-1 ring-indigo-100">
          {height} equal {height === 1 ? "layer" : "layers"}
        </span>
        <span className="text-slate-600">
          Each small cube is 1 {cubicUnit}.
        </span>
      </figcaption>
    </figure>
  );
}
