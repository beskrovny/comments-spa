import { useRef, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  commentSchema,
  type CommentFormValues,
} from "../schemas/commentSchema";
import CommentContent from "./CommentContent";
import { getCaptcha, type CaptchaResponse } from "../api/captcha";

interface CommentFormProps {
  parentId?: number;
  onSubmit: (values: CommentFormValues, files: File[]) => void | Promise<void>;
  isSubmitting?: boolean;
}

function CommentForm({
  parentId,
  onSubmit,
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
      userName: "",
      email: "",
      homePage: "",
      text: "",
      captchaId: "",
      captchaAnswer: "",
    },
  });

  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [captcha, setCaptcha] = useState<CaptchaResponse | null>(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [captchaError, setCaptchaError] = useState("");

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    setCaptchaError("");

    try {
      const result = await getCaptcha();
      setCaptcha(result);
      setValue("captchaId", result.id, {
        shouldValidate: true,
      });
    } catch {
      setCaptcha(null);
      setCaptchaError("Не удалось загрузить CAPTCHA");
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    void loadCaptcha();
  }, []);

  const commentText = watch("text");
  const textField = register("text");

  const insertTag = (tag: "i" | "strong" | "code" | "a") => {
    const textarea = textAreaRef.current;

    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = commentText.slice(start, end);

    const templates = {
      i: `<i>${selectedText || "текст"}</i>`,
      strong: `<strong>${selectedText || "текст"}</strong>`,
      code: `<code>${selectedText || "код"}</code>`,
      a: `<a href="" title="">${selectedText || "ссылка"}</a>`,
    };

    const insertedText = templates[tag];

    const newText =
      commentText.slice(0, start) + insertedText + commentText.slice(end);

    setValue("text", newText, {
      shouldDirty: true,
      shouldValidate: true,
    });

    textarea.focus();

    const cursorPosition = start + insertedText.length;
    textarea.setSelectionRange(cursorPosition, cursorPosition);
  };

  const syncFileInput = (files: File[]) => {
    const input = fileInputRef.current;

    if (!input) return;

    if (files.length === 0) {
      input.value = "";
      return;
    }

    try {
      const dataTransfer = new DataTransfer();
      files.forEach((file) => dataTransfer.items.add(file));
      input.files = dataTransfer.files;
    } catch {
      // DataTransfer is unavailable; React state remains the source of truth.
      input.value = "";
    }
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((current) => {
      const nextFiles = current.filter((_, i) => i !== index);
      syncFileInput(nextFiles);
      return nextFiles;
    });
  };

  const submitForm = async (values: CommentFormValues) => {
    try {
      await onSubmit(values, selectedFiles);

      reset();
      setSelectedFiles([]);
      syncFileInput([]);
      setShowPreview(false);
    } finally {
      await loadCaptcha();
    }
  };

  return (
    <form className="comment-form" onSubmit={handleSubmit(submitForm)}>
      <h3>{parentId ? "Ответить на комментарий" : "Добавить комментарий"}</h3>

      <div className="form-fields-row">
        <div className="form-field">
          <label htmlFor={`userName-${parentId ?? "root"}`}>
            User Name (латиница и цифры) *
          </label>

          <input
            id={`userName-${parentId ?? "root"}`}
            {...register("userName")}
            placeholder="Ваше имя"
          />

          {errors.userName && <span>{errors.userName.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor={`email-${parentId ?? "root"}`}>E-mail *</label>

          <input
            id={`email-${parentId ?? "root"}`}
            type="email"
            {...register("email")}
            placeholder="example@mail.com"
          />

          {errors.email && <span>{errors.email.message}</span>}
        </div>

        <div className="form-field">
          <label htmlFor={`homePage-${parentId ?? "root"}`}>
            Home page (необязательно)
          </label>

          <input
            id={`homePage-${parentId ?? "root"}`}
            type="url"
            {...register("homePage")}
            placeholder="https://example.com"
          />

          {errors.homePage && <span>{errors.homePage.message}</span>}
        </div>
      </div>

      <div className="form-field">
        <label htmlFor={`text-${parentId ?? "root"}`}>
          Сообщение (разрешены строго закрытые теги &lt;i&gt;, &lt;strong&gt;, &lt;code&gt;, &lt;a&gt;) *
        </label>

        <div className="editor-panel">
          <div className="editor-toolbar">
            <button type="button" onClick={() => insertTag("i")}>
              i
            </button>

            <button type="button" onClick={() => insertTag("strong")}>
              strong
            </button>

            <button type="button" onClick={() => insertTag("code")}>
              code
            </button>

            <button type="button" onClick={() => insertTag("a")}>
              a
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowPreview((current) => !current)}
            className="preview-button"
          >
            {showPreview ? "Скрыть предпросмотр" : "Предпросмотр"}
          </button>
        </div>

        <textarea
          id={`text-${parentId ?? "root"}`}
          {...textField}
          ref={(element) => {
            textField.ref(element);
            textAreaRef.current = element;
          }}
          placeholder="Введите текст комментария"
className="textarea-below-panel"
          rows={5}
        />

        {showPreview && (
          <div className="comment-preview">
            <h4>Предпросмотр</h4>
            <CommentContent text={commentText} />
          </div>
        )}

        {errors.text && <span>{errors.text.message}</span>}
      </div>

      <div className="form-field captcha-block">
        <label>CAPTCHA (код с картинки) *</label>

        <div className="captcha-panel">
          <div className="captcha-section">
            <div className="captcha-visual">
              <div className="captcha-controls">
                {captcha && (
                  <img
                    src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(captcha.image)}`}
                    alt="CAPTCHA"
                  />
                )}
              </div>

              <div className="captcha-answer-row">
                <input
                  id={`captchaAnswer-${parentId ?? "root"}`}
                  className="captcha-answer"
                  {...register("captchaAnswer")}
                  placeholder="Проверочный код"
                />

                <button
                  type="button"
                  onClick={() => void loadCaptcha()}
                  disabled={captchaLoading}
                  aria-label="Обновить CAPTCHA"
                >
                  {captchaLoading ? "Загрузка..." : "↻"}
                </button>
              </div>
            </div>

            {captchaError && <span>{captchaError}</span>}
          </div>

          <div className="form-actions captcha-actions">
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Отправка..." : "Отправить"}
            </button>
          </div>
        </div>

        <input type="hidden" {...register("captchaId")} />
      </div>

      <div className="form-field">
        <label id={`attachments-label-${parentId ?? "root"}`}>
          Прикрепить файл (JPG, PNG, GIF до 320x240 или TXT до 100 КБ)
        </label>

        <input
          id={`attachments-${parentId ?? "root"}`}
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.gif,.png,.txt"
          multiple
          className="visually-hidden"
          aria-labelledby={`attachments-label-${parentId ?? "root"} attachments-button-${parentId ?? "root"}`}
          onChange={(event) => {
            setSelectedFiles(Array.from(event.target.files ?? []));
          }}
        />

        <div className="choose-files-container">
          <button
            type="button"
            id={`attachments-button-${parentId ?? "root"}`}
            className="choose-files-button"
            onClick={() => fileInputRef.current?.click()}
          >
            Выбрать файлы
          </button>
          <span className="files-status">
            {selectedFiles.length === 0
              ? "Файл не выбран"
              : `Выбрано файлов: ${selectedFiles.length}`}
          </span>
        </div>

        {selectedFiles.length > 0 && (
          <ul className="attachment-list">
            {selectedFiles.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="attachment-selection-row"
              >
                <span className="attachment-file-info">
                  {file.name} ({Math.ceil(file.size / 1024)} KB)
                </span>
                <button
                  type="button"
                  className="attachment-remove-button"
                  onClick={() => removeSelectedFile(index)}
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </form>
  );
}

export default CommentForm;
