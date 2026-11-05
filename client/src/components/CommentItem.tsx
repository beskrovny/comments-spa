import { useEffect, useState } from "react";
import type { Comment } from "../types/comment";
import CommentForm from "./CommentForm";
import type { CommentFormValues } from "../schemas/commentSchema";
import CommentContent from "./CommentContent";
import CommentAttachments from './CommentAttachments';

//Вложеность ветки 
const MAX_VISUAL_DEPTH = 4;

interface CommentItemProps {
  comment: Comment;
  onReply: (
    parentId: number,
    values: CommentFormValues,
    files: File[],
  ) => Promise<void>;
  isSubmitting?: boolean;
  depth?: number;
  parentUserName?: string;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  handleExpandRoot?: (id: number) => void;
  handleCollapseRoot?: (id: number) => void;
}

function CommentItem({
  comment,
  onReply,
  isSubmitting = false,
  depth = 0,
  parentUserName,
  expandedIds,
  onToggle,
  handleExpandRoot,
  handleCollapseRoot,
}: CommentItemProps) {
  const [isReplying, setIsReplying] = useState(false);
  const collapsed = !expandedIds.has(comment.id);

  useEffect(() => {
    if (!isReplying) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReplying(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isReplying]);

  const handleReply = async (
    values: CommentFormValues,
    files: File[],
  ) => {
    await onReply(comment.id, values, files);
    setIsReplying(false);
  };

  const isDeeplyNested = depth >= MAX_VISUAL_DEPTH;
  const repliesAreFlat = depth + 1 > MAX_VISUAL_DEPTH;

  const countDescendants = (replies: Comment[]): number =>
    replies.reduce((sum, reply) => sum + 1 + countDescendants(reply.replies ?? []), 0);

  const descendantCount = countDescendants(comment.replies ?? []);
  const hasReplies = comment.replies && comment.replies.length > 0;

  const collectDescendantIds = (replies: Comment[], into: Set<number>): void => {
    replies.forEach((c) => {
      into.add(c.id);
      if (c.replies) collectDescendantIds(c.replies, into);
    });
  };

  const allDescendantIds = new Set<number>();
  collectDescendantIds(comment.replies ?? [], allDescendantIds);

  const allDescendantsExpanded = allDescendantIds.size > 0 && [...allDescendantIds].every((id) => expandedIds.has(id));

  const handleExpandAllDescendants = () => {
    handleExpandRoot?.(comment.id);
  };

  const handleCollapseAllDescendants = () => {
    handleCollapseRoot?.(comment.id);
  };

  return (
    <article className="comment">
      {isDeeplyNested && parentUserName && (
        <div className="comment-in-reply-to">В ответ @{parentUserName}</div>
      )}

      <div className="comment-header">
        <h3>{comment.userName}</h3>
        {comment.homePage && (
          <a
            href={comment.homePage}
            target="_blank"
            rel="noopener noreferrer"
            className="comment-website"
          >
            веб-сайт
          </a>
        )}
        {comment.email && <span className="comment-email">{comment.email}</span>}
        {depth === 0 && hasReplies && (
          <div className="comment-header-actions-root">
            <button
              type="button"
              className="comment-root-control-button comment-root-control-button--expand"
              aria-expanded={allDescendantsExpanded}
              aria-label="Развернуть всё"
              onClick={handleExpandAllDescendants}
            >
              Развернуть всё
            </button>
            <button
              type="button"
              className="comment-root-control-button comment-root-control-button--collapse"
              aria-expanded={!allDescendantsExpanded}
              aria-label="Свернуть всё"
              onClick={handleCollapseAllDescendants}
            >
              Свернуть всё
            </button>
          </div>
        )}
      </div>
      {hasReplies && (
        <div className="comment-header-actions">
          <button
            type="button"
            className="comment-collapse-toggle"
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Развернуть ветку комментария" : "Свернуть ветку комментария"}
            onClick={() => onToggle(comment.id)}
          >
            {collapsed ? "▶" : "▼"}
          </button>
          {collapsed && descendantCount > 0 && (
            <span className="comment-collapse-count">
              {descendantCount} ответов скрыто
            </span>
          )}
        </div>
      )}

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
        <div
          className="reply-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Ответить ${comment.userName}`}
          onClick={() => setIsReplying(false)}
        >
          <div
            className="reply-modal-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="reply-modal-header">
              <h3 className="reply-modal-title">Ответить @{comment.userName}</h3>

              <button
                type="button"
                className="reply-modal-close"
                onClick={() => setIsReplying(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>

            <CommentForm
              parentId={comment.id}
              onSubmit={handleReply}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      )}

      {comment.replies && comment.replies.length > 0 && (
        <div
          hidden={collapsed}
          className={
            repliesAreFlat
              ? "comment-replies comment-replies--flat"
              : "comment-replies"
          }
        >
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              onReply={onReply}
              isSubmitting={isSubmitting}
              depth={depth + 1}
              parentUserName={comment.userName}
              expandedIds={expandedIds}
              onToggle={onToggle}
              handleExpandRoot={handleExpandRoot}
              handleCollapseRoot={handleCollapseRoot}
            />
          ))}
        </div>
      )}
    </article>
  );
}

export default CommentItem;
