import { QueryCache, paginateQuery, selectFields, addSearchCondition } from './query-optimization.util';
import { SelectQueryBuilder } from 'typeorm';

describe('Query Optimization Utilities', () => {
  describe('QueryCache', () => {
    let cache: QueryCache<string>;

    beforeEach(() => {
      cache = new QueryCache<string>(1); // 1 second TTL for testing
    });

    it('should store and retrieve data', () => {
      cache.set('key1', 'value1');
      const result = cache.get('key1');
      expect(result).toBe('value1');
    });

    it('should return null for non-existent key', () => {
      const result = cache.get('non-existent');
      expect(result).toBeNull();
    });

    it('should expire data after TTL', async () => {
      cache.set('key1', 'value1');

      // Should exist immediately
      expect(cache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should be expired
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear specific key', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear('key1');

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
    });

    it('should clear all keys', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');

      cache.clear();

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
    });

    it('should handle complex objects', () => {
      type ComplexType = { id: number; name: string; nested: { value: string } };
      const complexCache = new QueryCache<ComplexType>(1);
      const data: ComplexType = { id: 1, name: 'Test', nested: { value: 'nested' } };
      complexCache.set('complex', data);

      const result = complexCache.get('complex');
      expect(result).toEqual(data);
    });
  });

  describe('paginateQuery', () => {
    let mockQueryBuilder: Partial<SelectQueryBuilder<any>>;
    let mockData: any[];

    beforeEach(() => {
      mockData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1, name: `Item ${i + 1}` }));

      mockQueryBuilder = {
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getMany: jest.fn(),
        getManyAndCount: jest.fn(),
      };
    });

    it('should paginate with count', async () => {
      const page1Data = mockData.slice(0, 20);
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([page1Data, 50]);

      const result = await paginateQuery(mockQueryBuilder as SelectQueryBuilder<any>, 1, 20);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(0);
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(20);
      expect(result.data).toHaveLength(20);
      expect(result.total).toBe(50);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.totalPages).toBe(3);
    });

    it('should skip count when requested', async () => {
      const page1Data = mockData.slice(0, 20);
      (mockQueryBuilder.getMany as jest.Mock).mockResolvedValue(page1Data);

      const result = await paginateQuery(mockQueryBuilder as SelectQueryBuilder<any>, 1, 20, true);

      expect(mockQueryBuilder.getMany).toHaveBeenCalled();
      expect(mockQueryBuilder.getManyAndCount).not.toHaveBeenCalled();
      expect(result.data).toHaveLength(20);
      expect(result.total).toBeUndefined();
      expect(result.totalPages).toBeUndefined();
    });

    it('should calculate correct skip for different pages', async () => {
      (mockQueryBuilder.getManyAndCount as jest.Mock).mockResolvedValue([[], 50]);

      await paginateQuery(mockQueryBuilder as SelectQueryBuilder<any>, 3, 10);

      expect(mockQueryBuilder.skip).toHaveBeenCalledWith(20); // (3-1) * 10
      expect(mockQueryBuilder.take).toHaveBeenCalledWith(10);
    });
  });

  describe('selectFields', () => {
    let mockQueryBuilder: Partial<SelectQueryBuilder<any>>;

    beforeEach(() => {
      mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        alias: 'user',
      };
    });

    it('should select specified fields', () => {
      const fields = ['id', 'name', 'email'];

      selectFields(mockQueryBuilder as SelectQueryBuilder<any>, fields);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(['user.id', 'user.name', 'user.email']);
    });

    it('should use custom alias when provided', () => {
      const fields = ['id', 'name'];

      selectFields(mockQueryBuilder as SelectQueryBuilder<any>, fields, 'customAlias');

      expect(mockQueryBuilder.select).toHaveBeenCalledWith(['customAlias.id', 'customAlias.name']);
    });

    it('should handle empty fields array', () => {
      selectFields(mockQueryBuilder as SelectQueryBuilder<any>, []);

      expect(mockQueryBuilder.select).toHaveBeenCalledWith([]);
    });
  });

  describe('addSearchCondition', () => {
    let mockQueryBuilder: Partial<SelectQueryBuilder<any>>;

    beforeEach(() => {
      mockQueryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        alias: 'user',
      };
    });

    it('should add search condition for multiple fields', () => {
      const searchTerm = 'test';
      const searchFields = ['name', 'email', 'description'];

      addSearchCondition(mockQueryBuilder as SelectQueryBuilder<any>, searchTerm, searchFields);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(user.name ILIKE :searchTerm OR user.email ILIKE :searchTerm OR user.description ILIKE :searchTerm)',
        { searchTerm: '%test%' },
      );
    });

    it('should not add condition if search term is empty', () => {
      addSearchCondition(mockQueryBuilder as SelectQueryBuilder<any>, '', ['name']);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should not add condition if search fields are empty', () => {
      addSearchCondition(mockQueryBuilder as SelectQueryBuilder<any>, 'test', []);

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled();
    });

    it('should use custom alias when provided', () => {
      addSearchCondition(mockQueryBuilder as SelectQueryBuilder<any>, 'test', ['name', 'email'], 'customAlias');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(customAlias.name ILIKE :searchTerm OR customAlias.email ILIKE :searchTerm)',
        { searchTerm: '%test%' },
      );
    });

    it('should handle single search field', () => {
      addSearchCondition(mockQueryBuilder as SelectQueryBuilder<any>, 'test', ['name']);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('(user.name ILIKE :searchTerm)', {
        searchTerm: '%test%',
      });
    });
  });
});
