
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../prisma.service.js';
import { CreateCommentDto } from './create-comment.dto.js';
import { CaptchaService } from '../captcha/captcha.service.js';
import { randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';
import sharp from 'sharp';
import { CommentsGateway } from './comments.gateway.js';

type SortField = 'userName' | 'email' | 'createdAt';
type SortOrder = 'asc' | 'desc';

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

  if (['.jpg', '.jpeg'].includes(extension)) {
    const isJpeg =
      file.buffer.length >= 3 &&
      file.buffer[0] === 0xff &&
      file.buffer[1] === 0xd8 &&
      file.buffer[2] === 0xff;

    if (!isJpeg) {
      throw new BadRequestException('Invalid JPEG file');
    }

    mimeType = 'image/jpeg';
  } else if (extension === '.png') {
    const signature = [
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ];

    const isPng = signature.every(
      (byte, index) => file.buffer[index] === byte,
    );

    if (!isPng) {
      throw new BadRequestException('Invalid PNG file');
    }

    mimeType = 'image/png';
  } else if (extension === '.gif') {
    const signature = file.buffer.toString('ascii', 0, 6);
    const isGif = signature === 'GIF87a' || signature === 'GIF89a';

    if (!isGif) {
      throw new BadRequestException('Invalid GIF file');
    }

    mimeType = 'image/gif';
  } else {
    throw new BadRequestException('Unsupported file type');
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

    let data: Buffer;

    if (mimeType === 'image/jpeg') {
      data = await processedImage.jpeg().toBuffer();
    } else if (mimeType === 'image/png') {
      data = await processedImage.png().toBuffer();
    } else {
      data = await processedImage.gif().toBuffer();
    }

    return {
      originalName,
      storedName: randomUUID(),
      mimeType,
      sizeBytes: data.length,
      data: new Uint8Array(data),
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
} catch {
  throw new BadRequestException('Unable to create comment');
}
  }

  async findAll(
    page = 1,
    sortBy: SortField = 'createdAt',
    order: SortOrder = 'desc',
  ) {
    const pageSize = 25;
    const skip = (page - 1) * pageSize;

    const [roots, total, allReplies] = await this.prisma.$transaction([
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
      this.prisma.comment.findMany({
        where: { parentId: { not: null } },
        orderBy: { createdAt: 'asc' },
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
    ]);

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
