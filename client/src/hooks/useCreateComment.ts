import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createComment } from '../api/comments';
import { commentsQueryKey } from './useComments';
import type { CreateCommentDto } from '../types/comment';

export interface CreateCommentVariables {
  payload: CreateCommentDto;
  files: File[];
}


export function useCreateComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, files }: CreateCommentVariables) =>
      createComment(payload, files),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: commentsQueryKey,
      });
    },
  });
}