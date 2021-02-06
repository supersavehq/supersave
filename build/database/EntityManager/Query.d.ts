import { FilterSortField, QueryFilter, QueryFilterValue, QuerySort } from '../types';
declare class Query {
    private readonly filterSortFields;
    private where;
    private sortValues;
    private limitValue?;
    private offsetValue?;
    constructor(filterSortFields: Record<string, FilterSortField>);
    private addFilter;
    eq(field: string, value: QueryFilterValue): Query;
    gt(field: string, value: QueryFilterValue): Query;
    gte(field: string, value: QueryFilterValue): Query;
    lt(field: string, value: QueryFilterValue): Query;
    lte(field: string, value: QueryFilterValue): Query;
    like(field: string, value: string): Query;
    in(field: string, value: string[]): Query;
    getWhere(): QueryFilter[];
    limit(limit: number | undefined): Query;
    getLimit(): number | undefined;
    offset(offset: number): Query;
    getOffset(): number | undefined;
    sort(field: string, direction?: 'asc' | 'desc'): Query;
    getSort(): QuerySort[];
}
export default Query;
