import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { Tokenizer } from 'htmlparser2';
import { PrismaService } from '../prisma.service.js';
import { CreateCommentDto } from './create-comment.dto.js';
import { CaptchaService } from '../captcha/captcha.service.js';
import { randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import { CommentsGateway } from './comments.gateway.js';

type SortField = 'userName' | 'email' | 'createdAt';
type SortOrder = 'asc' | 'desc';

const ALLOWED_TAGS = new Set(['i', 'strong', 'code', 'a']);
const ALLOWED_ATTRIBUTES: Record<string, Set<string>> = {
  a: new Set(['href', 'title']),
};

function validateHtmlStructure(text: string): void {
  const stack: string[] = [];
  let error: string | undefined;

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
        const allowedAttrs = ALLOWED_ATTRIBUTES[stack[stack.length - 1]];
        for (const attrName of Object.keys(currentAttrs)) {
          if (!allowedAttrs || !allowedAttrs.has(attrName)) {
            error = `Disallowed attribute: ${attrName} on <${stack[stack.length - 1]}>`;
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
      ontext() {
        // Text content doesn't affect validation
      },
      onattribentity() {
        // Entity in attribute value, not relevant for validation
      },
      oncdata() {
        // CDATA sections not expected in comment text
      },
      oncomment() {
        // HTML comments not expected in comment text
      },
      ondeclaration() {
        // DOCTYPE declarations not expected in comment text
      },
      onprocessinginstruction() {
        // Processing instructions not expected in comment text
      },
      onselfclosingtag() {
        // Self-closing tags are treated as open+close pair
      },
      ontextentity() {
        // Text entities not relevant for validation
      },
      onend() {
        if (error) return;

        if (stack.length > 0) {
          error = `Missing closing tag: </${stack[stack.length - 1]}>`;
        }
      },
    }
  );

  tokenizer.write(text);
  tokenizer.end();

  if (error) {
    throw new BadRequestException(error);
  }
}

async function validateAttachment(file: Express.Multer.File) {
  const originalName = basename(file.originalname.replace(/\\/g, '/'));
  const extension = extname(originalName).toLowerCase();

  if (!originalName || originalName.length > 255) {
    throw new BadRequestException('Invalid file name');
  }

  if (!file.buffer?.length) {
    throw new BadRequestException('Empty files are not allowed');
  }

  if (extension === '.txt') {
    if (file.size > 100 * 1024) {
      throw new BadRequestException('TXT files must not exceed 100 KB');
    }

    try {
      new TextDecoder('utf-8', { fatal: true }).decode(file.buffer);
    } catch {
      throw new BadRequestException('TXT file must contain valid UTF-8 text');
    }

    return {
      originalName,
      storedName: randomUUID(),
      mimeType: 'text/plain',
      sizeBytes: file.buffer.length,
      data: new Uint8Array(file.buffer),
    };
  }

  let mimeType: 'image/jpeg' | 'image/png' | 'image/gif';

  const detected = await fileTypeFromBuffer(file.buffer);

  if (!detected || !['image/jpeg', 'image/png', 'image/gif'].includes(detected.mime)) {
    throw new BadRequestException('Unsupported file type');
  }

  mimeType = detected.mime as 'image/jpeg' | 'image/png' | 'image/gif';

  const expectedMimeType =
    extension === '.jpg' || extension === '.jpeg'
      ? 'image/jpeg'
      : extension === '.png'
        ? 'image/png'
        : extension === '.gif'
          ? 'image/gif'
          : null;

  if (!expectedMimeType || mimeType !== expectedMimeType) {
    throw new BadRequestException('File extension does not match image format');
  }

  try {
    const isGif = mimeType === 'image/gif';

    const image = sharp(file.buffer, {
      animated: isGif,
      limitInputPixels: 100_000_000,
    });

    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new BadRequestException('Invalid image dimensions');
    }

    const frameHeight = metadata.pageHeight ?? metadata.height;
    const pages = metadata.pages ?? 1;
    const totalPixels = metadata.width * frameHeight * pages;

    if (totalPixels > 100_000_000) {
      throw new BadRequestException('Image contains too many pixels');
    }

    const processedImage = image.resize({
      width: 320,
      height: 240,
      fit: 'inside',
      withoutEnlargement: true,
    });

    let thumbnailData: Buffer;

    if (mimeType === 'image/jpeg') {
      thumbnailData = await processedImage.jpeg().toBuffer();
    } else if (mimeType === 'image/png') {
      thumbnailData = await processedImage.png().toBuffer();
    } else {
      thumbnailData = await processedImage.gif().toBuffer();
    }

    return {
      originalName,
      storedName: randomUUID(),
      mimeType,
      sizeBytes: file.buffer.length,
      data: new Uint8Array(file.buffer),
      thumbnailData: new Uint8Array(thumbnailData),
    };
  } catch (error) {
    if (error instanceof BadRequestException) {
      throw error;
    }

    throw new BadRequestException('Unable to process image');
  }
}

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly captchaService: CaptchaService,
    private readonly commentsGateway: CommentsGateway,
  ) {}

  async create(dto: CreateCommentDto, files: Express.Multer.File[] = []) {
    if (dto.parentId !== undefined) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
    }

const attachments = await Promise.all(
  files.map((file) => validateAttachment(file)),
);

    if (!this.captchaService.verify(dto.captchaId, dto.captchaAnswer)) {
      throw new BadRequestException('Invalid or expired CAPTCHA');
    }

    validateHtmlStructure(dto.text);

    const sanitizedText = sanitizeHtml(dto.text, {
      allowedTags: ['i', 'strong', 'code', 'a'],
      allowedAttributes: {
        a: ['href', 'title'],
      },
      allowedSchemes: ['http', 'https'],
      allowedSchemesAppliedToAttributes: ['href'],
      exclusiveFilter: (frame) => ['script', 'style'].includes(frame.tag),
    }).trim();

    if (!sanitizedText) {
      throw new BadRequestException('Comment must contain text');
    }

try {
  const comment = await this.prisma.comment.create({
    data: {
      userName: dto.userName,
      email: dto.email,
      homePage: dto.homePage,
      text: sanitizedText,
      parentId: dto.parentId,
      attachments: attachments.length
        ? {
            create: attachments,
          }
        : undefined,
    },
    include: {
      attachments: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          sizeBytes: true,
          createdAt: true,
        },
      },
    },
  });

  this.commentsGateway.emitCommentCreated(comment);

  return comment;
} catch (error) {
  if (error instanceof BadRequestException) {
    throw error;
  }
  throw error;
}
  }

  async findAll(
    page = 1,
    sortBy: SortField = 'createdAt',
    order: SortOrder = 'desc',
  ) {
    const pageSize = 25;
    const skip = (page - 1) * pageSize;

    const [roots, total] = await this.prisma.$transaction([
      this.prisma.comment.findMany({
        where: { parentId: null },
        orderBy: { [sortBy]: order },
        skip,
        take: pageSize,
        include: {
          attachments: {
            select: {
              id: true,
              originalName: true,
              mimeType: true,
              sizeBytes: true,
              createdAt: true,
            },
          },
        },
      }),
      this.prisma.comment.count({
        where: { parentId: null },
      }),
    ]);

    let allReplies: Array<{
      id: number;
      parentId: number | null;
      userName: string;
      email: string;
      homePage: string | null;
      text: string;
      createdAt: Date;
      attachments: Array<{
        id: number;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        createdAt: Date;
      }>;
    }> = [];

    if (roots.length > 0) {
      const rootIds = roots.map((r) => r.id);
      const placeholders = rootIds.map((_, i) => `$${i + 1}`).join(', ');

      const replyRows = await this.prisma.$queryRawUnsafe(
        `
        WITH RECURSIVE comment_tree AS (
          SELECT id, parent_id, user_name, email, home_page, text, created_at
          FROM comments
          WHERE parent_id IN (${placeholders})

          UNION ALL

          SELECT c.id, c.parent_id, c.user_name, c.email, c.home_page, c.text, c.created_at
          FROM comments c
          INNER JOIN comment_tree ct ON c.parent_id = ct.id
        )
        SELECT * FROM comment_tree ORDER BY created_at ASC
        `,
        ...rootIds,
      ) as Array<{
        id: number;
        parent_id: number | null;
        user_name: string;
        email: string;
        home_page: string | null;
        text: string;
        created_at: Date;
      }>;

      allReplies = replyRows.map((r) => ({
        id: r.id,
        parentId: r.parent_id,
        userName: r.user_name,
        email: r.email,
        homePage: r.home_page,
        text: r.text,
        createdAt: r.created_at,
        attachments: [],
      }));

      const replyIds = allReplies.map((r) => r.id);
      if (replyIds.length > 0) {
        const attachments = await this.prisma.attachment.findMany({
          where: { commentId: { in: replyIds } },
          select: {
            id: true,
            commentId: true,
            originalName: true,
            mimeType: true,
            sizeBytes: true,
            createdAt: true,
          },
        });

        const attachmentsByCommentId = new Map<
          number,
          typeof attachments[number][]
        >();
        for (const att of attachments) {
          if (!attachmentsByCommentId.has(att.commentId)) {
            attachmentsByCommentId.set(att.commentId, []);
          }
          attachmentsByCommentId.get(att.commentId)!.push(att);
        }

        for (const reply of allReplies) {
          reply.attachments = attachmentsByCommentId.get(reply.id) ?? [];
        }
      }
    }

    type CommentNode = (typeof roots)[number] & {
      replies: CommentNode[];
    };

    const nodes = new Map<number, CommentNode>();

    for (const comment of [...roots, ...allReplies]) {
      nodes.set(comment.id, {
        ...comment,
        replies: [],
      });
    }

    for (const comment of allReplies) {
      const parent = comment.parentId ? nodes.get(comment.parentId) : undefined;
      const node = nodes.get(comment.id);

      if (parent && node) {
        parent.replies.push(node);
      }
    }

    return {
      items: roots
        .map((root) => nodes.get(root.id))
        .filter((node): node is CommentNode => node !== undefined),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
