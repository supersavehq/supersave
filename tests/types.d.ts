import { BaseEntity, } from '../build';

export interface Planet extends BaseEntity {
  name: string,
  distance?: number,
}

export interface Moon extends BaseEntity {
  id?: string,
  name: string,
  planet: Planet,
}
