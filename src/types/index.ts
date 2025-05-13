export interface Block {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
}

export interface StandardBlock {
  id: number;
  name: string;
}

export interface RemainingTime {
  text: string;
  expired: boolean;
  totalMinutes?: number;
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