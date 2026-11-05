import { Tokenizer } from 'htmlparser2';

const ALLOWED_TAGS = new Set(['i', 'strong', 'code', 'a']);
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
};

interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateHtml(text: string): ValidationResult {
  const stack: string[] = [];
  let error: string | undefined;

  // Attribute collection for the current opening tag
  let currentAttrName = '';
  const currentAttrs: Record<string, string> = {};

  const tokenizer = new Tokenizer(
    { decodeEntities: true },
    {
      onopentagname(start: number, end: number) {
        if (error) return;
        const tagName = text.substring(start, end);

        if (!ALLOWED_TAGS.has(tagName)) {
          error = `Disallowed HTML tag: <${tagName}>`;
          return;
        }

        stack.push(tagName);
      },
      onopentagend() {
        if (error) return;
        // Validate attributes for the just-completed opening tag
        const allowedAttrs = ALLOWED_ATTRIBUTES[currentTagName()];
        for (const attrName of Object.keys(currentAttrs)) {
          if (!allowedAttrs || !allowedAttrs.has(attrName)) {
            error = `Disallowed attribute: ${attrName} on <${currentTagName()}>`;
            return;
          }
        }
        Object.keys(currentAttrs).forEach((key) => delete currentAttrs[key]);
      },
      onclosetag(start: number, end: number) {
        if (error) return;
        const tagName = text.substring(start, end);

        if (stack.length === 0) {
          error = `Unexpected closing tag: </${tagName}>`;
          return;
        }

        const lastOpened = stack.pop();
        if (lastOpened !== tagName) {
          error = `Mismatched closing tag: </${tagName}> does not match <${lastOpened}>`;
          return;
        }
      },
      ontext() {
        // Text content doesn't affect validation
      },
      onattribname(start: number, end: number) {
        if (error) return;
        currentAttrName = text.substring(start, end);
      },
      onattribdata(start: number, end: number) {
        if (error) return;
        currentAttrs[currentAttrName] = text.substring(start, end);
      },
      onattribend() {
        // Attribute value complete, already stored in onattribdata
      },
      onend() {
        if (error) return;

        if (stack.length > 0) {
          error = `Missing closing tag: </${stack[stack.length - 1]}>`;
        }
      },
      // Required but unused callbacks
      onattribentity() {},
      oncdata() {},
      oncomment() {},
      ondeclaration() {},
      onprocessinginstruction() {},
      onselfclosingtag() {},
      ontextentity() {},
    }
  );

  tokenizer.write(text);
  tokenizer.end();

  if (error) {
    return { valid: false, error };
  }

  return { valid: true };

  function currentTagName(): string {
    return stack.length > 0 ? stack[stack.length - 1] : '';
  }
}