import { SelectQueryBuilder } from 'typeorm';

/**
 * Query optimization utilities to prevent N+1 queries and improve performance
 */

/**
 * Add eager loading for common relations
 * Usage: addEagerLoading(queryBuilder, ['relation1', 'relation2'])
 */
export function addEagerLoading<T>(
  queryBuilder: SelectQueryBuilder<T>,
  relations: string[],
  alias?: string,
): SelectQueryBuilder<T> {
  const baseAlias = alias || queryBuilder.alias;

  relations.forEach((relation) => {
    const relationAlias = relation.replace(/\./g, '_');
    queryBuilder.leftJoinAndSelect(`${baseAlias}.${relation}`, relationAlias);
  });

  return queryBuilder;
}

/**
 * Batch load related entities to prevent N+1
 * Usage: const levels = await batchLoad(users, user => user.level_id, levelRepository)
 */
export async function batchLoad<T, K>(
  entities: any[],
  keyExtractor: (entity: any) => K,
  repository: any,
  keyField: string = 'id',
): Promise<Map<K, T>> {
  const keys = [...new Set(entities.map(keyExtractor))].filter((k) => k != null);

  if (keys.length === 0) {
    return new Map();
  }

  const loaded = (await repository.findByIds)
    ? repository.findByIds(keys)
    : repository.find({ where: { [keyField]: keys } });

  const map = new Map<K, T>();
  loaded.forEach((item: any) => {
    map.set(item[keyField], item);
  });

  return map;
}

/**
 * Paginate query with optimized counting
 * Avoids running count query when not needed
 */
export async function paginateQuery<T>(
  queryBuilder: SelectQueryBuilder<T>,
  page: number = 1,
  limit: number = 20,
  skipCount: boolean = false,
): Promise<{ data: T[]; total?: number; page: number; limit: number; totalPages?: number }> {
  const skip = (page - 1) * limit;

  queryBuilder.skip(skip).take(limit);

  if (skipCount) {
    const data = await queryBuilder.getMany();
    return { data, page, limit };
  }

  const [data, total] = await queryBuilder.getManyAndCount();

  return {
    data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

/**
 * Cache query results in memory for frequently accessed data
 * Use with caution - only for data that doesn't change often
 */
export class QueryCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number; // Time to live in milliseconds

  constructor(ttlSeconds: number = 300) {
    // Default 5 minutes
    this.ttl = ttlSeconds * 1000;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(key?: string): void {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

/**
 * Optimize SELECT queries by only selecting needed fields
 * Usage: selectFields(queryBuilder, ['id', 'name', 'email'])
 */
export function selectFields<T>(
  queryBuilder: SelectQueryBuilder<T>,
  fields: string[],
  alias?: string,
): SelectQueryBuilder<T> {
  const baseAlias = alias || queryBuilder.alias;
  const selections = fields.map((field) => `${baseAlias}.${field}`);

  return queryBuilder.select(selections);
}

/**
 * Add search conditions with proper indexing hints
 */
export function addSearchCondition<T>(
  queryBuilder: SelectQueryBuilder<T>,
  searchTerm: string,
  searchFields: string[],
  alias?: string,
): SelectQueryBuilder<T> {
  if (!searchTerm || searchFields.length === 0) {
    return queryBuilder;
  }

  const baseAlias = alias || queryBuilder.alias;
  const conditions = searchFields.map((field) => `${baseAlias}.${field} ILIKE :searchTerm`).join(' OR ');

  return queryBuilder.andWhere(`(${conditions})`, { searchTerm: `%${searchTerm}%` });
}
