import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';
import { PrismaService } from '../prisma.service.js';
import { CreateCommentDto } from './create-comment.dto.js';

type SortField = 'userName' | 'email' | 'createdAt';
type SortOrder = 'asc' | 'desc';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCommentDto) {
    if (dto.parentId !== undefined) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: dto.parentId },
        select: { id: true },
      });

      if (!parent) {
        throw new NotFoundException('Parent comment not found');
      }
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
      return await this.prisma.comment.create({
        data: {
          userName: dto.userName,
          email: dto.email,
          homePage: dto.homePage,
          text: sanitizedText,
          parentId: dto.parentId,
        },
      });
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
      }),
      this.prisma.comment.count({
        where: { parentId: null },
      }),
      this.prisma.comment.findMany({
        where: { parentId: { not: null } },
        orderBy: { createdAt: 'asc' },
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
