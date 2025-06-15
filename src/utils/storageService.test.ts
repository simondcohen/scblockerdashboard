import { describe, it, expect } from 'vitest';
import { StorageService } from './storageService';
import { Block } from '../types';

describe('mergeBlocks', () => {
  it('uses most recent block when ids clash', () => {
    const s = new StorageService();
    const now = new Date().toISOString();
    const older = new Date(Date.now() - 1000).toISOString();
    const external: Block[] = [{ id: 1, name: 'a', startTime: new Date(), endTime: new Date(), lastModified: older }];
    const local: Block[] = [{ id: 1, name: 'b', startTime: new Date(), endTime: new Date(), lastModified: now }];
    // @ts-ignore access private
    const merged = s['mergeBlocks'](external, local);
    expect(merged[0].name).toBe('b');
  });
});
