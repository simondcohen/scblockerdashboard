export interface Block {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  lastModified?: string;
  status?: 'active' | 'completed' | 'failed';
  failedAt?: Date;
  failureReason?: string;
}

export interface StandardBlock {
  id: number;
  name: string;
  required?: boolean;
}

export interface StorageData {
  version: string;
  lastModified: string;
  blocks: Block[];
  standardBlocks: StandardBlock[];
}

export interface RemainingTime {
  text: string;
  expired: boolean;
  totalMinutes?: number;
  days?: number;
  hours?: number;
  minutes?: number;
  seconds?: number;
}

export interface BlockFormData {
  name: string;
  startTime: string;
  endTime: string;
  notes: string;
}