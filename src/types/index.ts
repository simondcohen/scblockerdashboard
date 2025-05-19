export interface Block {
  id: number;
  name: string;
  startTime: Date;
  endTime: Date;
  notes?: string;
  recurring?: {
    interval: 'daily' | 'weekly';
    daysOfWeek?: number[]; // 0-6 for Sunday-Saturday
    endDate?: Date;
  };
}

export interface StandardBlock {
  id: number;
  name: string;
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