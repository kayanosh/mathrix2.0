"use client";

import type { VisualBlock } from "@/types/whiteboard";
import EquationStepsRenderer from "./blocks/EquationStepsRenderer";
import TextRenderer from "./blocks/TextRenderer";
import CoordinateGraphRenderer from "./blocks/CoordinateGraphRenderer";
import LabeledShapeRenderer from "./blocks/LabeledShapeRenderer";
import ProbabilityTreeRenderer from "./blocks/ProbabilityTreeRenderer";
import VennDiagramRenderer from "./blocks/VennDiagramRenderer";
import NumberLineRenderer from "./blocks/NumberLineRenderer";
import TableRenderer from "./blocks/TableRenderer";
import ChartRenderer from "./blocks/ChartRenderer";
import ColumnMethodRenderer from "./blocks/ColumnMethodRenderer";
import {
  AreaModelRenderer,
  BarModelRenderer,
  FractionBarRenderer,
  FractionGridRenderer,
  FractionWallRenderer,
  HundredSquareRenderer,
  KeyInfoRenderer,
} from "./blocks/KS2TeachingVisuals";

interface Props {
  block: VisualBlock;
  index: number;
  baseDelay: number;
}

export default function BlockRenderer({ block, baseDelay }: Props) {
  switch (block.type) {
    case "equation_steps":
      return <EquationStepsRenderer block={block} baseDelay={baseDelay} />;
    case "coordinate_graph":
      return <CoordinateGraphRenderer block={block} baseDelay={baseDelay} />;
    case "labeled_shape":
      return <LabeledShapeRenderer block={block} baseDelay={baseDelay} />;
    case "probability_tree":
      return <ProbabilityTreeRenderer block={block} baseDelay={baseDelay} />;
    case "venn_diagram":
      return <VennDiagramRenderer block={block} baseDelay={baseDelay} />;
    case "number_line":
      return <NumberLineRenderer block={block} baseDelay={baseDelay} />;
    case "fraction_bar":
      return <FractionBarRenderer block={block} baseDelay={baseDelay} />;
    case "fraction_grid":
      return <FractionGridRenderer block={block} baseDelay={baseDelay} />;
    case "fraction_wall":
      return <FractionWallRenderer block={block} baseDelay={baseDelay} />;
    case "bar_model":
      return <BarModelRenderer block={block} baseDelay={baseDelay} />;
    case "hundred_square":
      return <HundredSquareRenderer block={block} baseDelay={baseDelay} />;
    case "area_model":
      return <AreaModelRenderer block={block} baseDelay={baseDelay} />;
    case "key_info":
      return <KeyInfoRenderer block={block} baseDelay={baseDelay} />;
    case "table":
      return <TableRenderer block={block} baseDelay={baseDelay} />;
    case "chart":
      return <ChartRenderer block={block} baseDelay={baseDelay} />;
    case "column_method":
      return <ColumnMethodRenderer block={block} baseDelay={baseDelay} />;
    case "text":
      return <TextRenderer block={block} />;
    default: {
      // Exhaustive check — if a new block type is added to the union,
      // TypeScript will error here reminding you to add a renderer
      const _check: never = block;
      void _check;
      return (
        <div className="text-gray-500 text-xs italic p-3 rounded-lg border border-gray-800">
          Unknown block type
        </div>
      );
    }
  }
}
