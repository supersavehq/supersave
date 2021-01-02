import { QueryFilter, QueryFilterValue, QueryOperatorEnum } from '../types';

class Query {
  private where: QueryFilter[] = [];

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
}

export default Query;
