import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
    commentSchema,
    type CommentFormValues,
} from '../schemas/commentSchema';
import CommentContent from './CommentContent';

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
        watch,
        setValue,
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

    const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
    const [showPreview, setShowPreview] = useState(false);

    const commentText = watch('text');
    const textField = register('text');

    const insertTag = (tag: 'i' | 'strong' | 'code' | 'a') => {
        const textarea = textAreaRef.current;

        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = commentText.slice(start, end);

        const templates = {
            i: `<i>${selectedText || 'текст'}</i>`,
            strong: `<strong>${selectedText || 'текст'}</strong>`,
            code: `<code>${selectedText || 'код'}</code>`,
            a: `<a href="" title="">${selectedText || 'ссылка'}</a>`,
        };

        const insertedText = templates[tag];

        const newText =
            commentText.slice(0, start) +
            insertedText +
            commentText.slice(end);

        setValue('text', newText, {
            shouldDirty: true,
            shouldValidate: true,
        });

        textarea.focus();

        const cursorPosition = start + insertedText.length;
        textarea.setSelectionRange(cursorPosition, cursorPosition);
    };

    const submitForm = async (values: CommentFormValues) => {
        await onSubmit(values);
        reset();
        setShowPreview(false);
    };

    return (
        <form className="comment-form" onSubmit={handleSubmit(submitForm)}>
            <h3>
                {parentId ? 'Ответить на комментарий' : 'Добавить комментарий'}
            </h3>

            <div className="form-field">
                <label htmlFor={`userName-${parentId ?? 'root'}`}>
                    Имя
                </label>

                <input
                    id={`userName-${parentId ?? 'root'}`}
                    {...register('userName')}
                    placeholder="Ваше имя"
                />

                {errors.userName && (
                    <span>{errors.userName.message}</span>
                )}
            </div>

            <div className="form-field">
                <label htmlFor={`email-${parentId ?? 'root'}`}>
                    Email
                </label>

                <input
                    id={`email-${parentId ?? 'root'}`}
                    type="email"
                    {...register('email')}
                    placeholder="example@mail.com"
                />

                {errors.email && (
                    <span>{errors.email.message}</span>
                )}
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

                {errors.homePage && (
                    <span>{errors.homePage.message}</span>
                )}
            </div>

            <div className="form-field">
                <label htmlFor={`text-${parentId ?? 'root'}`}>
                    Комментарий
                </label>

                <div className="editor-toolbar">
                    <button
                        type="button"
                        onClick={() => insertTag('i')}
                    >
                        i
                    </button>

                    <button
                        type="button"
                        onClick={() => insertTag('strong')}
                    >
                        strong
                    </button>

                    <button
                        type="button"
                        onClick={() => insertTag('code')}
                    >
                        code
                    </button>

                    <button
                        type="button"
                        onClick={() => insertTag('a')}
                    >
                        a
                    </button>
                </div>

                <textarea
                    id={`text-${parentId ?? 'root'}`}
                    {...textField}
                    ref={(element) => {
                        textField.ref(element);
                        textAreaRef.current = element;
                    }}
                    placeholder="Введите текст комментария"
                    rows={5}
                />

                <button
                    type="button"
                    onClick={() => setShowPreview((current) => !current)}
                >
                    {showPreview
                        ? 'Скрыть предпросмотр'
                        : 'Предпросмотр'}
                </button>

                {showPreview && (
                    <div className="comment-preview">
                        <h4>Предпросмотр</h4>
                        <CommentContent text={commentText} />
                    </div>
                )}

                {errors.text && (
                    <span>{errors.text.message}</span>
                )}
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