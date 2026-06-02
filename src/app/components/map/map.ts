import { Component, inject } from '@angular/core';
import { BattleService } from '../../services/battle';
import { AREAS } from '../../models/area.model';

interface MapNode {
  id: string;
  x: number;
  y: number;
  emoji: string;
  label: string;
}

interface MapEdge {
  from: string;
  to: string;
}

const NODES: MapNode[] = [
  { id: 'forest', x: 250, y: 45, emoji: '🌲', label: 'FOREST' },
  { id: 'cave', x: 75, y: 145, emoji: '⛰️', label: 'CAVE' },
  { id: 'mountain', x: 35, y: 290, emoji: '🏔️', label: 'MOUNTAIN' },
  { id: 'rough-terrain', x: 130, y: 400, emoji: '🪨', label: 'ROUGH-TERRAIN' },
  { id: 'waters-edge', x: 370, y: 400, emoji: '🌊', label: 'WATERS-EDGE' },
  { id: 'grassland', x: 430, y: 290, emoji: '🌿', label: 'GRASSLAND' },
  { id: 'pokemon-center', x: 250, y: 245, emoji: '🏥', label: 'POKEMON CENTER' },
];

function buildAllEdges(): MapEdge[] {
  const added = new Set<string>();
  const edges: MapEdge[] = [];
  for (const area of Object.values(AREAS)) {
    for (const choice of area.choices) {
      const key = [area.id, choice.target].sort().join('|');
      if (!added.has(key)) {
        added.add(key);
        edges.push({ from: area.id, to: choice.target });
      }
    }
  }
  return edges;
}

@Component({
  selector: 'app-map',
  standalone: true,
  templateUrl: './map.html',
  styleUrl: './map.css',
})
export class MapComponent {
  private battle = inject(BattleService);

  readonly currentArea = this.battle.currentArea;
  readonly visitedAreas = this.battle.visitedAreas;

  readonly nodes = NODES;
  readonly allEdges = buildAllEdges();

  get currentEdges(): MapEdge[] {
    const area = this.currentArea();
    return area.choices.map((c) => ({ from: area.id, to: c.target }));
  }

  isEdgeActive(from: string, to: string): boolean {
    const area = this.currentArea();
    return area.choices.some(
      (c) =>
        (c.target === from || c.target === to) &&
        (area.id === from || area.id === to),
    );
  }

  getNodeClass(nodeId: string): string {
    const current = this.currentArea().id;
    const visited = this.visitedAreas();
    if (nodeId === current) return 'node current';
    if (visited.includes(nodeId)) return 'node visited';
    return 'node';
  }
}
