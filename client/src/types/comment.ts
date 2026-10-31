export interface Comment {
  id: number;
  userName: string;
  email: string;
  homePage: string | null;
  text: string;
  createdAt: string;
  parentId: number | null;
  replies?: Comment[];
  attachments: Attachment[];
}

export interface CommentsResponse {
  items: Comment[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type CommentSortField = "userName" | "email" | "createdAt";
export type SortOrder = "asc" | "desc";

export interface CreateCommentDto {
  userName: string;
  email: string;
  homePage?: string;
  text: string;
  parentId?: number;
  captchaId: string;
  captchaAnswer: string;
}

export interface Attachment {
  id: number;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}
