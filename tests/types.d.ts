import { BaseEntity, } from '../build';

export interface Planet extends BaseEntity {
  name: string,
}

export interface Moon extends BaseEntity {
  id?: string,
  name: string,
  planet: Planet,
}
