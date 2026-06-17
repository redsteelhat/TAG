import { PaginationQueryDto } from '../dto/pagination-query.dto';

export interface PaginationParams {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
}

export function getPaginationParams(query: PaginationQueryDto): PaginationParams {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    take: pageSize
  };
}

export function buildPaginationMeta(
  params: Pick<PaginationParams, 'page' | 'pageSize'>,
  total: number
) {
  const totalPages = Math.ceil(total / params.pageSize);

  return {
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages,
    hasNextPage: params.page < totalPages,
    hasPreviousPage: params.page > 1
  };
}
