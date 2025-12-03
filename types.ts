export type TreeMode = 'SCATTERED' | 'TREE_SHAPE';

export interface PositionData {
  scatter: [number, number, number];
  tree: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

export interface OrnamentType {
  color: string;
  metalness: number;
  roughness: number;
  geometryType: 'box' | 'sphere' | 'octahedron';
}

export const THEME = {
  emerald: '#004225',
  deepGreen: '#012112',
  gold: '#FFD700',
  champagne: '#F7E7CE',
  bronze: '#CD7F32',
};