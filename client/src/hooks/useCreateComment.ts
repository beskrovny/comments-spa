import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createComment } from '../api/comments';
import { commentsQueryKey } from './useComments';

export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createComment,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentsQueryKey,
      });
    },
  });
}