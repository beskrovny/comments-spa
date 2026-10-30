import DOMPurify from 'dompurify';

interface CommentContentProps {
    text: string;
}

function CommentContent({ text }: CommentContentProps) {
    const cleanHtml = DOMPurify.sanitize(text, {
        ALLOWED_TAGS: ['a', 'i', 'strong', 'code'],
        ALLOWED_ATTR: ['href', 'title'],
        ALLOWED_URI_REGEXP: /^https?:\/\//i,
    });

    return (
        <div
            className="comment-content"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
        />
    );
}

export default CommentContent;