import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { getComments, type GetCommentsParams } from '../api/comments';

export const commentsQueryKey = ['comments'];

export function useComments(params: GetCommentsParams = {}) {
  return useQuery({
    queryKey: [...commentsQueryKey, params],
    queryFn: () => getComments(params),
    placeholderData: keepPreviousData,
  });
}
