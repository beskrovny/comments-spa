
import { useComments, commentsQueryKey } from "./hooks/useComments";
import { useCreateComment } from "./hooks/useCreateComment";
import CommentItem from "./components/CommentItem";
import CommentForm from "./components/CommentForm";
import type { CommentFormValues } from "./schemas/commentSchema";
import { useState, useEffect } from "react";
import type { CommentSortField, SortOrder } from "./types/comment";
import "./App.css";
import { getApiErrorMessage } from "./utils/getApiErrorMessage";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "./api/socket";

function App() {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<CommentSortField>("createdAt");
  const [order, setOrder] = useState<SortOrder>("desc");

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

  return (
    <main className="app">
      <h1>Комментарии</h1>

      <div className="comments-controls">
        <label>
          Сортировать по:
          <select
            value={sortBy}
            onChange={(event) => {
              setSortBy(event.target.value as CommentSortField);
              setPage(1);
            }}
          >
            <option value="userName">Имени</option>
            <option value="email">Email</option>
            <option value="createdAt">Дате</option>
          </select>
        </label>

        <label>
          Порядок:
          <select
            value={order}
            onChange={(event) => {
              setOrder(event.target.value as SortOrder);
              setPage(1);
            }}
          >
            <option value="asc">По возрастанию</option>
            <option value="desc">По убыванию</option>
          </select>
        </label>
      </div>

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

      <section className="comments-list">
        {data.items.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            onReply={handleReply}
            isSubmitting={createMutation.isPending}
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
