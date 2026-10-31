export const WORLD = {
  cell: 1.15,
  towerFill: 0.34,
  minCityCells: 37,
  minTowerHeight: 1.4,
  maxTowerHeight: 9,
  towerWidth: 0.54,
  camera: {
    homeDistance: 94,
    minDistance: 12,
    maxDistance: 140,
    elevationDeg: 31,
    fov: 36,
  },
  mountains: {
    innerRadius: 27,
    clearance: 4,
    terrainRadius: 45,
    subdivisions: 72,
    trailTurns: 0.72,
  },
  fog: { color: '#061a19', near: 74, far: 142 },
  unitPerKm: 2,
} as const;
