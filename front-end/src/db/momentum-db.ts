import Dexie, { type Table } from 'dexie';

export interface Habit {
  id?: number;
  name: string;
  description?: string;
  categoryId: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id?: number;
  name: string;
  color: string;
  createdAt: Date;
}

export interface Tag {
  id?: number;
  name: string;
  color: string;
}

export interface Log {
  id?: number;
  habitId: number;
  date: Date;
  completed: boolean;
  notes?: string;
}

export interface PendingMutation {
  id?: number;
  entity: string;
  action: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: Date;
  retryCount: number;
}

export interface PendingPhoto {
  id?: number;
  habitId: number;
  photoBlob: Blob;
  timestamp: Date;
}

// Single database instance for all offline data
export class MomentumDB extends Dexie {
  habits!: Table<Habit, number>;
  categories!: Table<Category, number>;
  tags!: Table<Tag, number>;
  logs!: Table<Log, number>;
  pendingMutations!: Table<PendingMutation, number>;
  pendingPhotos!: Table<PendingPhoto, number>;

  constructor() {
    super('momentum-db');
    
    this.version(1).stores({
      habits: '++id, categoryId, createdAt',
      categories: '++id, name',
      tags: '++id, name',
      logs: '++id, habitId, date',
      pendingMutations: '++id, entity, timestamp',
      pendingPhotos: '++id, habitId, timestamp',
      queryCache: 'id'
    });
  }
}

export const db = new MomentumDB();