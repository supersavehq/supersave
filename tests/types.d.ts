import { BaseEntity, } from '../build';

export interface Planet extends BaseEntity {
  id: string,
  name: string,
  distance?: number,
}

export interface Moon extends BaseEntity {
  id: string,
  name: string,
  planet: Planet,
}
