
import { useComments, commentsQueryKey } from "./hooks/useComments";
import { useCreateComment } from "./hooks/useCreateComment";
import CommentItem from "./components/CommentItem";
import CommentForm from "./components/CommentForm";
import type { CommentFormValues } from "./schemas/commentSchema";
import { useState, useEffect } from "react";
import type { Comment, CommentSortField, SortOrder } from "./types/comment";
import { getApiErrorMessage } from "./utils/getApiErrorMessage";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "./api/socket";


function App() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<CommentSortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useComments({
    page,
    sortBy,
    order,
  });

  const createMutation = useCreateComment();

  useEffect(() => {
    socket.connect();

    const handleCommentCreated = () => {
      queryClient.invalidateQueries({
        queryKey: commentsQueryKey,
      });
    };

    socket.on("commentCreated", handleCommentCreated);

    return () => {
      socket.off("commentCreated", handleCommentCreated);
      socket.disconnect();
    };
  }, [queryClient]);

  const handleCreateComment = async (
    values: CommentFormValues,
    files: File[],
  ) => {
    await createMutation.mutateAsync({
      payload: {
        ...values,
        homePage: values.homePage || undefined,
      },
      files,
    });
  };

  const handleReply = async (
    parentId: number,
    values: CommentFormValues,
    files: File[],
  ) => {
    await createMutation.mutateAsync({
      payload: {
        ...values,
        homePage: values.homePage || undefined,
        parentId,
      },
      files,
    });
  };

  if (isPending) {
    return (
      <main className="app">
        <h1>Комментарии</h1>
        <p>Загрузка комментариев...</p>
      </main>
    );
  }

  if (isError) {
    return (
      <main className="app">
        <h1>Комментарии</h1>
        <p className="form-error">{error.message}</p>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="app">
        <h1>Комментарии</h1>
        <p>Комментарии не найдены.</p>
      </main>
    );
  }

  const handleSort = (field: CommentSortField) => {
    if (field === sortBy) {
      setOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setOrder(field === "createdAt" ? "desc" : "asc");
    }
    setPage(1);
  };

  const sortButtonLabel = (field: CommentSortField) => {
    if (field === "createdAt") {
      if (sortBy !== "createdAt") return "По дате";
      return order === "desc" ? "По дате ↓ (LIFO)" : "По дате ↑";
    }
    if (field === "userName") {
      if (sortBy !== "userName") return "По имени";
      return order === "asc" ? "По имени ↑" : "По имени ↓";
    }
    if (sortBy !== "email") return "По E-mail";
    return order === "asc" ? "По E-mail ↑" : "По E-mail ↓";


  };
  const handleToggle = (id: number) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandRoot = (rootId: number) => {
    const root = data.items.find(c => c.id === rootId);
    if (!root) return;
    const all = new Set<number>([rootId]);
    const collect = (comments: Comment[]) => {
      comments.forEach(c => {
        all.add(c.id);
        if (c.replies) collect(c.replies);
      });
    };
    collect(root.replies ?? []);
    setExpandedIds(prev => new Set([...prev, ...all]));
  };

  const handleCollapseRoot = (rootId: number) => {
    const root = data.items.find(c => c.id === rootId);
    if (!root) return;
    const all = new Set<number>([rootId]);
    const collect = (comments: Comment[]) => {
      comments.forEach(c => {
        all.add(c.id);
        if (c.replies) collect(c.replies);
      });
    };
    collect(root.replies ?? []);
    setExpandedIds(prev => {
      const next = new Set(prev);
      all.forEach(id => next.delete(id));
      return next;
    });
  };


  return (
    <main className="app">
      <h1>Комментарии</h1>

      <p className="comments-count">
        Всего комментариев: {data.total}
      </p>

      <CommentForm
        onSubmit={handleCreateComment}
        isSubmitting={createMutation.isPending}
      />

      {createMutation.isError && (
        <p className="form-error">
          {getApiErrorMessage(createMutation.error)}
        </p>
      )}

      <div className="sorting-panel">
        <div className="sorting-panel-left">
          <span className="sorting-label">Сортировка:</span>
          <button
            type="button"
            className={
              sortBy === "createdAt" ? "sort-button active" : "sort-button"
            }
            onClick={() => handleSort("createdAt")}
          >
            {sortButtonLabel("createdAt")}
          </button>
          <button
            type="button"
            className={
              sortBy === "userName" ? "sort-button active" : "sort-button"
            }
            onClick={() => handleSort("userName")}
          >
            {sortButtonLabel("userName")}
          </button>
          <button
            type="button"
            className={sortBy === "email" ? "sort-button active" : "sort-button"}
            onClick={() => handleSort("email")}
          >
            {sortButtonLabel("email")}
          </button>
        </div>
        <div className="sorting-panel-right">
          Страница {data.page} из {data.totalPages} (по {data.pageSize} на
          страницу)
        </div>
      </div>

      <section className="comments-list">
        {data.items.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={handleReply}
            isSubmitting={createMutation.isPending}
            expandedIds={expandedIds}
            onToggle={handleToggle}
            handleExpandRoot={handleExpandRoot}
            handleCollapseRoot={handleCollapseRoot}
          />
        ))}
      </section>

      <div className="pagination">
        <button
          type="button"
          disabled={page === 1}
          onClick={() => setPage((current) => current - 1)}
        >
          Назад
        </button>

        <span>
          Страница {data.page} из {data.totalPages}
        </span>

        <button
          type="button"
          disabled={page >= data.totalPages}
          onClick={() => setPage((current) => current + 1)}
        >
          Далее
        </button>
      </div>
    </main>
  );
}

export default App;




