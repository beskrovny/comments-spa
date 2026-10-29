import type { Comment } from '../types/comment';

interface CommentItemProps {
  comment: Comment;
}

function CommentItem({ comment }: CommentItemProps) {
  return (
    <article className="comment" key={comment.id}>
      <h3>{comment.userName}</h3>

      <p>{comment.text}</p>

      <time dateTime={comment.createdAt}>
        {new Date(comment.createdAt).toLocaleString()}
      </time>

      {comment.replies && comment.replies.length > 0 && (
        <div className="comment-replies">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} />
          ))}
        </div>
      )}
    </article>
  );
}

export default CommentItem;