export enum QuestName {
  CatchThree = 'catch-three',
}

export enum QuestStatus {
  Doing = 'doing',
  Completed = 'completed',
  Failed = 'failed',
}

export interface Quest {
  name: QuestName;
  title: string;
  description: string;
  status: QuestStatus;
  target: number;
  progress: number;
}

export function createDefaultQuests(): Quest[] {
  return [
    {
      name: QuestName.CatchThree,
      title: 'Cattura 3 Pokémon',
      description: 'Cattura almeno 3 Pokémon per sopravvivere nel mondo.',
      status: QuestStatus.Doing,
      target: 3,
      progress: 0,
    },
  ];
}
