
import { http } from './http';
import type {
  Comment,
  CommentSortField,
  CommentsResponse,
  CreateCommentDto,
  SortOrder,
} from '../types/comment';

export interface GetCommentsParams {
  page?: number;
  sortBy?: CommentSortField;
  order?: SortOrder;
}

export async function getComments({
  page = 1,
  sortBy = 'createdAt',
  order = 'desc',
}: GetCommentsParams = {}): Promise<CommentsResponse> {
  const { data } = await http.get<CommentsResponse>('/comments', {
    params: { page, sortBy, order },
  });

  return data;
}

export async function createComment(
  payload: CreateCommentDto,
  files: File[] = [],
): Promise<Comment> {
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    if (value !== undefined) {
      formData.append(key, String(value));
    }
  });

  files.forEach((file) => {
    formData.append('files', file);
  });

  const { data } = await http.post<Comment>('/comments', formData);

  return data;
}
