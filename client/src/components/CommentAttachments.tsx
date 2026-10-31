import { useEffect, useState } from 'react';
import type { Attachment } from '../types/comment';
import { http } from '../api/http';

interface CommentAttachmentsProps {
  attachments: Attachment[];
}

function CommentAttachments({ attachments }: CommentAttachmentsProps) {
  const [selectedImage, setSelectedImage] = useState<Attachment | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [isTextLoading, setIsTextLoading] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);

  const imageAttachments = attachments.filter((file) =>
    file.mimeType.startsWith('image/'),
  );

  const textAttachments = attachments.filter(
    (file) => file.mimeType === 'text/plain',
  );

  useEffect(() => {
    if (!selectedImage && textContent === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedImage(null);
        setTextContent(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedImage, textContent]);

const openTextFile = async (file: Attachment) => {
  setIsTextLoading(true);
  setTextError(null);
  setTextContent(null);

  try {
    const response = await http.get(`/attachments/${file.id}`, {
      responseType: 'arraybuffer',
    });

    const content = new TextDecoder('utf-8').decode(response.data);
    setTextContent(content);
  } catch {
    setTextError('Не удалось загрузить файл.');
  } finally {
    setIsTextLoading(false);
  }
};

  if (attachments.length === 0) return null;

  return (
    <div className="comment-attachments">
      {imageAttachments.length > 0 && (
        <div className="comment-attachment-images">
          {imageAttachments.map((file) => (
            <button
              key={file.id}
              type="button"
              className="comment-attachment-image-button"
              onClick={() => setSelectedImage(file)}
              aria-label={`Открыть изображение ${file.originalName}`}
            >
              <img
                src={`${http.defaults.baseURL}/attachments/${file.id}`}
                alt={file.originalName}
                className="comment-attachment-image"
              />
            </button>
          ))}
        </div>
      )}

      {textAttachments.length > 0 && (
        <div className="comment-attachment-files">
          {textAttachments.map((file) => (
            <div key={file.id} className="comment-attachment-file">
              <span>
                {file.originalName} ({Math.ceil(file.sizeBytes / 1024)} KB)
              </span>

              <button type="button" onClick={() => openTextFile(file)}>
                Просмотреть
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedImage && (
        <div
          className="attachment-modal"
          role="dialog"
          aria-modal="true"
          aria-label={selectedImage.originalName}
          onClick={() => setSelectedImage(null)}
        >
          <button
            type="button"
            className="attachment-modal-close"
            onClick={() => setSelectedImage(null)}
            aria-label="Закрыть"
          >
            ×
          </button>

          <img
            src={`${http.defaults.baseURL}/attachments/${selectedImage.id}`}
            alt={selectedImage.originalName}
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}

      {(isTextLoading || textContent !== null || textError) && (
        <div
          className="attachment-modal"
          role="dialog"
          aria-modal="true"
          onClick={() => {
            setTextContent(null);
            setTextError(null);
          }}
        >
          <div
            className="attachment-text-preview"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="attachment-modal-close"
              onClick={() => {
                setTextContent(null);
                setTextError(null);
              }}
              aria-label="Закрыть"
            >
              ×
            </button>

            {isTextLoading && <p>Загрузка...</p>}
            {textError && <p className="form-error">{textError}</p>}
            {textContent !== null && <pre>{textContent}</pre>}
          </div>
        </div>
      )}
    </div>
  );
}

export default CommentAttachments;