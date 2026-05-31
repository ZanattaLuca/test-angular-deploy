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
      { label: 'Entra nella grotta', target: 'cave' },
      { label: 'Supera l\'ingresso e prosegui verso la vallata', target: 'grassland' },
    ],
  },
  cave: {
    id: 'cave',
    habitat: 1,
    title: 'CAVE',
    intro: 'L\'oscurità della grotta ti avvolge. Senti il rumore di gocce d\'acqua in lontananza e il sentiero si divide: un cunicolo sale ripido verso l\'esterno, mentre un altro segue un fiume sotterraneo.',
    choices: [
      { label: 'Sali verso il cunicolo illuminato', target: 'mountain' },
      { label: 'Segui il corso del fiume sotterraneo', target: 'waters-edge' },
    ],
  },
  mountain: {
    id: 'mountain',
    habitat: 4,
    title: 'MOUNTAIN',
    intro: 'Sei in alta quota, l\'aria è fredda e il vento soffia forte. Davanti a te il sentiero si divide nettamente in due discese.',
    choices: [
      { label: 'Scendi per il ghiaione ripido e franoso', target: 'rough-terrain' },
      { label: 'Segui i pendii più dolci che scendono verso la pianura', target: 'grassland' },
    ],
  },
  'rough-terrain': {
    id: 'rough-terrain',
    habitat: 6,
    title: 'ROUGH-TERRAIN',
    intro: 'Il terreno qui è accidentato, pieno di fango, rocce aguzze e radici sporgenti. Avanzare è faticoso. Vedi la vegetazione farsi fitta da un lato e un corso d\'acqua dall\'altro.',
    choices: [
      { label: 'Addentrati nella fitta boscaglia', target: 'forest' },
      { label: 'Segui il torrente verso valle', target: 'waters-edge' },
    ],
  },
  'waters-edge': {
    id: 'waters-edge',
    habitat: 9,
    title: "WATERS-EDGE",
    intro: 'Ti trovi sulla sponda di un grande specchio d\'acqua. Le onde si infrangono dolcemente. Puoi muoverti solo costeggiando la riva o arrampicandoti.',
    choices: [
      { label: 'Cammina dove la riva si fa piatta ed erbosa', target: 'grassland' },
      { label: 'Arrampicati sulla parete rocciosa che sovrasta l\'acqua', target: 'mountain' },
    ],
  },
  grassland: {
    id: 'grassland',
    habitat: 3,
    title: 'GRASSLAND',
    intro: 'Cammini in una vasta e tranquilla distesa di valli erbose sotto il sole. All\'orizzonte la pianura si interrompe bruscamente.',
    choices: [
      { label: 'Incamminati verso la macchia di alberi secolari', target: 'forest' },
      { label: 'Dirigiti verso la zona piena di fossati e fango', target: 'rough-terrain' },
    ],
  },
};
