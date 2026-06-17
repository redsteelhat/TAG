import {
  buildPaginationMeta,
  getPaginationParams
} from './pagination';

describe('pagination helpers', () => {
  it('builds skip and take values', () => {
    expect(getPaginationParams({ page: 3, pageSize: 25 })).toEqual({
      page: 3,
      pageSize: 25,
      skip: 50,
      take: 25
    });
  });

  it('builds pagination meta flags', () => {
    expect(buildPaginationMeta({ page: 2, pageSize: 10 }, 25)).toEqual({
      page: 2,
      pageSize: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPreviousPage: true
    });
  });
});
