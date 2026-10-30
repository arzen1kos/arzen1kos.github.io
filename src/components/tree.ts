import type { Year } from '../data/types';

export type HexId = 'projects' | 'skills' | 'experience';
export type YearNodeId = 'y2023' | 'y2024' | 'y2025';
export type NodeId = 'root' | HexId | 'grad' | YearNodeId;

export const PARENT: Record<NodeId, NodeId | null> = {
  root: null,
  projects: 'root',
  skills: 'root',
  experience: 'root',
  grad: 'root',
  y2023: 'grad',
  y2024: 'grad',
  y2025: 'grad',
};

export const HEX_IDS: HexId[] = ['projects', 'skills', 'experience'];

export const LABELS: Record<HexId, string> = {
  projects: 'Projects',
  skills: 'Skills',
  experience: 'Experience',
};

export const YEAR_OF: Record<YearNodeId, Year> = { y2023: '2023', y2024: '2024', y2025: '2025' };
export const NODE_OF_YEAR: Record<Year, YearNodeId> = { '2023': 'y2023', '2024': 'y2024', '2025': 'y2025' };

/** Nodes that open a content panel when pinned. */
export const PANEL_NODES = new Set<NodeId>(['projects', 'skills', 'experience', 'y2023', 'y2024', 'y2025']);

export function pathOf(id: NodeId): NodeId[] {
  const path: NodeId[] = [];
  let current: NodeId | null = id;
  while (current) {
    path.unshift(current);
    current = PARENT[current];
  }
  return path;
}

/**
 * The root is a flat-topped hexagon, so its sides face 30°, 90°, 150°, 210°, 270° and 330°.
 * Top and bottom are skipped: the top would run off screen and the bottom collides with the name.
 */
const SLOT_ANGLES = [30, 150, 210, 330];

export function pickAngles(): Record<HexId, number> {
  const slots = [...SLOT_ANGLES];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [slots[i], slots[j]] = [slots[j] ?? 30, slots[i] ?? 30];
  }
  return { projects: slots[0] ?? 30, skills: slots[1] ?? 150, experience: slots[2] ?? 210 };
}

/** Distance from root centre to child centre, in root radii. */
export const RING = 1.42;
