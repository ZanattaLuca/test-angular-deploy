export interface Choice {
  label: string;
  target: string;
}

export interface Area {
  id: string;
  habitat: number;
  title: string;
  intro: string;
  choices: Choice[];
}

export const AREAS: Record<string, Area> = {
  forest: {
    id: 'forest',
    habitat: 2,
    title: 'FOREST',
    intro: 'Stavi camminando nel bosco quando vedi l\'ingresso di una grotta buia e misteriosa. Cosa decidi di fare?',
    choices: [
      { label: 'go to cave', target: 'cave' },
      { label: 'go to grassland', target: 'grassland' },
      { label: 'go to rough terrain', target: 'rough-terrain' },
    ],
  },
  cave: {
    id: 'cave',
    habitat: 1,
    title: 'CAVE',
    intro: 'L\'oscurità della grotta ti avvolge. Senti il rumore di gocce d\'acqua in lontananza e il sentiero si divide: un cunicolo sale ripido verso l\'esterno, mentre un altro segue un fiume sotterraneo.',
    choices: [
      { label: 'go to mountain', target: 'mountain' },
      { label: 'go to lake', target: 'waters-edge' },
      { label: 'go to forest', target: 'forest' },
    ],
  },
  mountain: {
    id: 'mountain',
    habitat: 4,
    title: 'MOUNTAIN',
    intro: 'Sei in alta quota, l\'aria è fredda e il vento soffia forte. Davanti a te il sentiero si divide nettamente in due discese.',
    choices: [
      { label: 'go to rough terrain', target: 'rough-terrain' },
      { label: 'go to grassland', target: 'grassland' },
      { label: 'go to cave', target: 'cave' },
      { label: 'go to lake', target: 'waters-edge' },
    ],
  },
  'rough-terrain': {
    id: 'rough-terrain',
    habitat: 6,
    title: 'ROUGH-TERRAIN',
    intro: 'Il terreno qui è accidentato, pieno di fango, rocce aguzze e radici sporgenti. Avanzare è faticoso. Vedi la vegetazione farsi fitta da un lato e un corso d\'acqua dall\'altro.',
    choices: [
      { label: 'go to forest', target: 'forest' },
      { label: 'go to lake', target: 'waters-edge' },
      { label: 'go to mountain', target: 'mountain' },
    ],
  },
  'waters-edge': {
    id: 'waters-edge',
    habitat: 9,
    title: 'WATERS-EDGE',
    intro: 'Ti trovi sulla sponda di un grande specchio d\'acqua. Le onde si infrangono dolcemente. Puoi muoverti solo costeggiando la riva o arrampicandoti.',
    choices: [
      { label: 'go to grassland', target: 'grassland' },
      { label: 'go to mountain', target: 'mountain' },
      { label: 'go to cave', target: 'cave' },
      { label: 'go to rough terrain', target: 'rough-terrain' },
    ],
  },
  grassland: {
    id: 'grassland',
    habitat: 3,
    title: 'GRASSLAND',
    intro: 'Cammini in una vasta e tranquilla distesa di valli erbose sotto il sole. All\'orizzonte la pianura si interrompe bruscamente.',
    choices: [
      { label: 'go to forest', target: 'forest' },
      { label: 'go to Pokémon Center', target: 'pokemon-center' },
      { label: 'go to mountain', target: 'mountain' },
      { label: 'go to lake', target: 'waters-edge' },
    ],
  },
  'pokemon-center': {
    id: 'pokemon-center',
    habitat: 0,
    title: 'POKEMON CENTER',
    intro: 'Benvenuto al Centro Pokémon! Qui puoi curare i tuoi Pokémon e riposare prima di ripartire all\'avventura.',
    choices: [
      { label: 'go to grassland', target: 'grassland' },
    ],
  },
};
