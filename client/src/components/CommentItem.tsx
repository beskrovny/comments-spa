import { useState } from "react";
import type { Comment } from "../types/comment";
import CommentForm from "./CommentForm";
import type { CommentFormValues } from "../schemas/commentSchema";
import CommentContent from "./CommentContent";
import CommentAttachments from './CommentAttachments';

interface CommentItemProps {
  comment: Comment;
  onReply: (
    parentId: number,
    values: CommentFormValues,
    files: File[],
  ) => Promise<void>;
  isSubmitting?: boolean;
}

function CommentItem({
  comment,
  onReply,
  isSubmitting = false,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = async (
    values: CommentFormValues,
    files: File[],
  ) => {
    await onReply(comment.id, values, files);
    setIsReplying(false);
  };

  return (
    <article className="comment">
      <h3>{comment.userName}</h3>

      <CommentContent text={comment.text} />
      <CommentAttachments attachments={comment.attachments ?? []} />

      <time dateTime={comment.createdAt}>
        {new Date(comment.createdAt).toLocaleString()}
      </time>

      <button
        type="button"
        className="reply-button"
        onClick={() => setIsReplying((current) => !current)}
      >
        {isReplying ? "Отмена" : "Ответить"}
      </button>

      {isReplying && (
        <CommentForm
          parentId={comment.id}
          onSubmit={handleReply}
          onCancel={() => setIsReplying(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              isSubmitting={isSubmitting}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export default CommentItem;
