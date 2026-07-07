import type { SubjectSeeds } from "../types";
import { ks2CurriculumSeeds } from "../adapters/from-ks2";
import { gcseMathsSeedsFromSyllabus } from "../adapters/from-syllabus";
import { SEEDS as year3 } from "./year-3";
import { SEEDS as year4 } from "./year-4";
import { SEEDS as year7 } from "./year-7";
import { SEEDS as year8 } from "./year-8";
import { SEEDS as year9 } from "./year-9";
import { SEEDS as aLevel } from "./a-level";

export const MATHS_SEEDS: SubjectSeeds = {
  "year-3": year3,
  "year-4": year4,
  "year-5": ks2CurriculumSeeds("year-5", "maths"),
  "year-6": ks2CurriculumSeeds("year-6", "maths"),
  "year-7": year7,
  "year-8": year8,
  "year-9": year9,
  gcse: gcseMathsSeedsFromSyllabus(),
  "a-level": aLevel,
};
