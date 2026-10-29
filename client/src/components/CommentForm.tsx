import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    commentSchema,
    type CommentFormValues,
} from '../schemas/commentSchema';

interface CommentFormProps {
    parentId?: number;
    onSubmit: (values: CommentFormValues) => void | Promise<void>;
    onCancel?: () => void;
    isSubmitting?: boolean;
}

function CommentForm({
    parentId,
    onSubmit,
    onCancel,
    isSubmitting = false,
}: CommentFormProps) {
    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CommentFormValues>({
        resolver: zodResolver(commentSchema),
        defaultValues: {
            userName: '',
            email: '',
            homePage: '',
            text: '',
        },
    });

    const submitForm = async (values: CommentFormValues) => {
        await onSubmit(values);
        reset();
    };

    return (
        <form className="comment-form" onSubmit={handleSubmit(submitForm)}>
            <h3>{parentId ? 'Ответить на комментарий' : 'Добавить комментарий'}</h3>

            <div className="form-field">
                <label htmlFor={`userName-${parentId ?? 'root'}`}>Имя</label>
                <input
                    id={`userName-${parentId ?? 'root'}`}
                    {...register('userName')}
                    placeholder="Ваше имя"
                />
                {errors.userName && <span>{errors.userName.message}</span>}
            </div>

            <div className="form-field">
                <label htmlFor={`email-${parentId ?? 'root'}`}>Email</label>
                <input
                    id={`email-${parentId ?? 'root'}`}
                    type="email"
                    {...register('email')}
                    placeholder="example@mail.com"
                />
                {errors.email && <span>{errors.email.message}</span>}
            </div>

            <div className="form-field">
                <label htmlFor={`homePage-${parentId ?? 'root'}`}>
                    Домашняя страница (необязательно)
                </label>
                <input
                    id={`homePage-${parentId ?? 'root'}`}
                    type="url"
                    {...register('homePage')}
                    placeholder="https://example.com"
                />
                {errors.homePage && <span>{errors.homePage.message}</span>}
            </div>

            <div className="form-field">
                <label htmlFor={`text-${parentId ?? 'root'}`}>Комментарий</label>
                <textarea
                    id={`text-${parentId ?? 'root'}`}
                    {...register('text')}
                    placeholder="Введите текст комментария"
                    rows={5}
                />
                {errors.text && <span>{errors.text.message}</span>}
            </div>

            <div className="form-actions">
                <button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Отправка...' : 'Отправить'}
                </button>

                {onCancel && (
                    <button type="button" onClick={onCancel}>
                        Отмена
                    </button>
                )}
            </div>
        </form>
    );
}

export default CommentForm;