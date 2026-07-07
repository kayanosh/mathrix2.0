import type { SubjectSeeds } from "../types";
import { ks2CurriculumSeeds } from "../adapters/from-ks2";
import { mergeStageSeeds } from "../build";
import { SEEDS as year3 } from "./year-3";
import { SEEDS as year4 } from "./year-4";
import { SEEDS as year5Extra } from "./year-5-extra";
import { SEEDS as year6Extra } from "./year-6-extra";
import { SEEDS as year7 } from "./year-7";
import { SEEDS as year8 } from "./year-8";
import { SEEDS as year9 } from "./year-9";
import { SEEDS as gcseCombined } from "./gcse-combined";
import { SEEDS as gcseTriple } from "./gcse-triple";
import { SEEDS as aLevel } from "./a-level";

export const SCIENCE_SEEDS: SubjectSeeds = {
  "year-3": year3,
  "year-4": year4,
  "year-5": mergeStageSeeds(ks2CurriculumSeeds("year-5", "science"), year5Extra),
  "year-6": mergeStageSeeds(ks2CurriculumSeeds("year-6", "science"), year6Extra),
  "year-7": year7,
  "year-8": year8,
  "year-9": year9,
  gcse: mergeStageSeeds(gcseCombined, gcseTriple),
  "a-level": aLevel,
};
