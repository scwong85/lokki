import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GULL_SKINS, PIGEON, skinById, unlockedSkins } from '../../src/data/gullSkins';
import { sanitize } from '../../src/core/save';
import { GullModel } from '../../src/gull/model';
import { computePose } from '../../src/gull/pose';

describe('gull looks', () => {
  it('unlock with progress', () => {
    expect(unlockedSkins({ skills: 0, clears: 0, speedrun: false })).toEqual(['herring']);
    expect(unlockedSkins({ skills: 3, clears: 0, speedrun: false })).toEqual(['herring', 'juvenile']);
    expect(unlockedSkins({ skills: 7, clears: 1, speedrun: true })).toEqual(GULL_SKINS.map((s) => s.id));
    expect(skinById('nope').id).toBe('herring');
  });

  it('every skin colours every slot', () => {
    const slots = Object.keys(GULL_SKINS[0].colours).sort();
    for (const s of GULL_SKINS) expect(Object.keys(s.colours).sort()).toEqual(slots);
    expect(Object.keys(PIGEON).sort()).toEqual(slots);
  });

  it('the save keeps a known look and drops junk', () => {
    expect(sanitize({ skin: 'kittiwake' }).skin).toBe('kittiwake');
    expect(sanitize({ skin: 'dragon' }).skin).toBe('herring');
    expect(sanitize({}).skin).toBe('herring');
  });
});

describe('gull model', () => {
  const colours = (m: GullModel) => {
    const out = new Set<string>();
    m.root.traverse((o) => {
      const c = (o as THREE.Mesh).geometry?.attributes.color;
      if (c) for (let i = 0; i < c.count; i++) out.add(new THREE.Color(c.getX(i), c.getY(i), c.getZ(i)).getHexString());
    });
    return out;
  };

  it('stays cheap (few meshes) and repaints for a skin and the disguise', () => {
    const m = new GullModel();
    let meshes = 0;
    m.root.traverse((o) => (meshes += (o as THREE.Mesh).isMesh ? 1 : 0));
    expect(meshes).toBeLessThanOrEqual(12);
    const herring = colours(m);
    m.setSkin(skinById('blackheaded').colours);
    expect(colours(m)).not.toEqual(herring);
    m.setDisguise(true);
    const pigeon = colours(m);
    expect([...pigeon].some((h) => h === '6f7a94')).toBe(true); // pigeon head
    m.setDisguise(false);
    expect([...colours(m)].some((h) => h === '4a3a35')).toBe(true); // back to the black head
  });

  it('folds its wings along the body on the ground and spreads them in the air', () => {
    const span = (mode: 'ground' | 'air') => {
      const m = new GullModel();
      const pose = computePose({ mode, stunned: false, hspeed: 0, walkPhase: 0, flapAnim: 9, flapDuration: 0.3, heightAbove: 5, turnRate: 0, bodyPitch: 0, beakOpen: false, time: 0 });
      for (let i = 0; i < 60; i++) m.apply(pose, 1 / 30);
      m.root.updateMatrixWorld(true);
      const b = new THREE.Box3().setFromObject(m.root);
      return b.max.x - b.min.x;
    };
    expect(span('air')).toBeGreaterThan(3.2);
    expect(span('ground')).toBeLessThan(1.3);
  });
});
