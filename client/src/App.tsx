import { useComments } from './hooks/useComments';
import { useCreateComment } from './hooks/useCreateComment';
import CommentItem from './components/CommentItem';
import CommentForm from './components/CommentForm';
import type { CommentFormValues } from './schemas/commentSchema';
import './App.css';

function App() {
  const { data, isPending, isError, error } = useComments();
  const createMutation = useCreateComment();

  const handleCreateComment = async (values: CommentFormValues) => {
    await createMutation.mutateAsync({
      ...values,
      homePage: values.homePage || undefined,
    });
  };

  if (isPending) {
    return <main className="app">Загрузка комментариев...</main>;
  }

  if (isError) {
    return (
      <main className="app">
        <p>Ошибка загрузки: {error.message}</p>
      </main>
    );
  }

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
          {createMutation.error.message}
        </p>
      )}

      <section className="comments-list">
        {data.items.map((comment) => (
          <CommentItem key={comment.id} comment={comment} />
        ))}
      </section>
    </main>
  );
}

export default App;