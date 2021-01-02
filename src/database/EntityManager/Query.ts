import {
  QueryFilter, QueryFilterValue, QueryOperatorEnum, QuerySort,
} from '../types';

class Query {
  private where: QueryFilter[] = [];

  private sortValues: QuerySort[] = [];

  private limitValue?: number;

  private offsetValue?: number;

  private addFilter(operator: QueryOperatorEnum, field: string, value: QueryFilterValue): Query {
    this.where.push({ operator, field, value });
    return this;
  }

  public eq(field: string, value: QueryFilterValue): Query {
    return this.addFilter(QueryOperatorEnum.EQUALS, field, value);
  }

  public getWhere(): QueryFilter[] {
    return this.where;
  }

  public limit(limit: number): Query {
    this.limitValue = limit;
    return this;
  }

  public getLimit(): number|undefined {
    return this.limitValue;
  }

  public offset(offset: number): Query {
    this.offsetValue = offset;
    return this;
  }

  public getOffset(): number|undefined {
    return this.offsetValue;
  }

  public sort(field: string, direction: 'asc'|'desc' = 'asc'): Query {
    this.sortValues.push({ field, direction });
    return this;
  }

  public getSort(): QuerySort[] {
    return this.sortValues;
  }
}

export default Query;
