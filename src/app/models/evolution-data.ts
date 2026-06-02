export type DiceSize = 'd6' | 'd8' | 'd10' | 'd12';

export interface EvolutionInfo {
  stage: 1 | 2 | 3;
  dice: DiceSize;
}

const LEGENDARY_IDS = new Set([144, 145, 146, 150, 151]);

const THREE_STAGE_FAMILIES: [number, number, number][] = [
  [1, 2, 3],
  [4, 5, 6],
  [7, 8, 9],
  [10, 11, 12],
  [13, 14, 15],
  [16, 17, 18],
  [29, 30, 31],
  [32, 33, 34],
  [43, 44, 45],
  [60, 61, 62],
  [63, 64, 65],
  [66, 67, 68],
  [69, 70, 71],
  [74, 75, 76],
  [92, 93, 94],
  [147, 148, 149],
];

const TWO_STAGE_FAMILIES: [number, number][] = [
  [19, 20],
  [21, 22],
  [23, 24],
  [25, 26],
  [27, 28],
  [35, 36],
  [37, 38],
  [39, 40],
  [41, 42],
  [46, 47],
  [48, 49],
  [50, 51],
  [52, 53],
  [54, 55],
  [56, 57],
  [58, 59],
  [72, 73],
  [77, 78],
  [79, 80],
  [81, 82],
  [84, 85],
  [86, 87],
  [88, 89],
  [90, 91],
  [96, 97],
  [98, 99],
  [100, 101],
  [102, 103],
  [104, 105],
  [109, 110],
  [111, 112],
  [116, 117],
  [118, 119],
  [120, 121],
  [129, 130],
  [133, 134],
  [133, 135],
  [133, 136],
  [138, 139],
  [140, 141],
];

const SINGLE_STAGE_IDS = new Set([
  83, 95, 106, 107, 108, 113, 114, 115, 122, 123, 124, 125, 126, 127, 128,
  131, 132, 137, 142, 143,
]);

const EVOLUTION_MAP = new Map<number, EvolutionInfo>();

for (const [base, middle, final] of THREE_STAGE_FAMILIES) {
  EVOLUTION_MAP.set(base, { stage: 1, dice: 'd6' });
  EVOLUTION_MAP.set(middle, { stage: 2, dice: 'd8' });
  EVOLUTION_MAP.set(final, { stage: 3, dice: 'd10' });
}

for (const [base, evolved] of TWO_STAGE_FAMILIES) {
  if (!EVOLUTION_MAP.has(base)) {
    EVOLUTION_MAP.set(base, { stage: 1, dice: 'd6' });
  }
  EVOLUTION_MAP.set(evolved, { stage: 2, dice: 'd8' });
}

for (const id of SINGLE_STAGE_IDS) {
  EVOLUTION_MAP.set(id, { stage: 1, dice: 'd8' });
}

for (const id of LEGENDARY_IDS) {
  EVOLUTION_MAP.set(id, { stage: 1, dice: 'd12' });
}

export function getEvolutionInfo(id: number): EvolutionInfo {
  return EVOLUTION_MAP.get(id) ?? { stage: 1, dice: 'd6' };
}

export function getDiceSize(id: number): DiceSize {
  return getEvolutionInfo(id).dice;
}

export function isLegendary(id: number): boolean {
  return LEGENDARY_IDS.has(id);
}
