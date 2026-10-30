import { useState } from 'react';
import type { Comment } from '../types/comment';
import CommentForm from './CommentForm';
import type { CommentFormValues } from '../schemas/commentSchema';

interface CommentItemProps {
  comment: Comment;
  onReply: (parentId: number, values: CommentFormValues) => Promise<void>;
  isSubmitting?: boolean;
}

function CommentItem({
  comment,
  onReply,
  isSubmitting = false,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);

  const handleReply = async (values: CommentFormValues) => {
    await onReply(comment.id, values);
    setIsReplying(false);
  };

  return (
    <article className="comment">
      <h3>{comment.userName}</h3>

      <p>{comment.text}</p>

      <time dateTime={comment.createdAt}>
        {new Date(comment.createdAt).toLocaleString()}
      </time>

      <button
        type="button"
        onClick={() => setIsReplying((current) => !current)}
      >
        {isReplying ? 'Отмена' : 'Ответить'}
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