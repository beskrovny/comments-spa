import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service.js';
import { PrismaService } from '../prisma.service.js';
import { CaptchaService } from '../captcha/captcha.service.js';
import { CommentsGateway } from './comments.gateway.js';

const mockPrismaService = {
  comment: {
    findUnique: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  attachment: {
    findMany: vi.fn(),
  },
  $queryRawUnsafe: vi.fn(),
  $transaction: vi.fn(),
};

const mockCaptchaService = {
  verify: vi.fn(),
};

const mockCommentsGateway = {
  emitCommentCreated: vi.fn(),
};

describe('CommentsService', () => {
  let service: CommentsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    vi.clearAllMocks();

    (mockPrismaService.$transaction as any).mockImplementation((factories: any[]) =>
      Promise.all(factories),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CaptchaService,
          useValue: mockCaptchaService,
        },
        {
          provide: CommentsGateway,
          useValue: mockCommentsGateway,
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return paginated root comments with replies', async () => {
      const rootComments = [
        {
          id: 1,
          userName: 'user1',
          email: 'user1@example.com',
          homePage: null,
          text: 'Root comment 1',
          createdAt: new Date('2026-01-01'),
          parentId: null,
          attachments: [],
        },
        {
          id: 2,
          userName: 'user2',
          email: 'user2@example.com',
          homePage: null,
          text: 'Root comment 2',
          createdAt: new Date('2026-01-02'),
          parentId: null,
          attachments: [],
        },
      ];

      const replies = [
        {
          id: 3,
          parent_id: 1,
          user_name: 'user3',
          email: 'user3@example.com',
          home_page: null,
          text: 'Reply to root 1',
          created_at: new Date('2026-01-01T10:00:00Z'),
        },
      ];

      (prisma.comment.findMany as any).mockResolvedValueOnce(rootComments);
      (prisma.comment.count as any).mockResolvedValueOnce(2);
      (prisma.$queryRawUnsafe as any).mockResolvedValueOnce(replies);
      (prisma.attachment.findMany as any).mockResolvedValueOnce([]);

      const result = await service.findAll(1, 'createdAt', 'asc');

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(25);
      expect(result.totalPages).toBe(1);
      expect(result.items[0].replies).toHaveLength(1);
      expect(result.items[0].replies[0].id).toBe(3);
    });

    it('should return empty results when no comments exist', async () => {
      (prisma.comment.findMany as any).mockResolvedValueOnce([]);
      (prisma.comment.count as any).mockResolvedValueOnce(0);
      (prisma.$queryRawUnsafe as any).mockResolvedValueOnce([]);
      (prisma.attachment.findMany as any).mockResolvedValueOnce([]);

      const result = await service.findAll(1);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should not query replies when no root comments exist', async () => {
      (prisma.comment.findMany as any).mockResolvedValueOnce([]);
      (prisma.comment.count as any).mockResolvedValueOnce(0);

      const result = await service.findAll(1);

      expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
      expect(result.items).toHaveLength(0);
    });
  });

  describe('create', () => {
    const createDto = {
      userName: 'testUser',
      email: 'test@example.com',
      homePage: undefined,
      text: 'Test comment',
      captchaId: 'captcha-123',
      captchaAnswer: 'answer',
      parentId: undefined,
    };

    const files: Express.Multer.File[] = [];

    beforeEach(() => {
      (mockPrismaService.comment.findUnique as any).mockResolvedValue(null);
      (mockPrismaService.comment.create as any).mockResolvedValue({
        id: 1,
        ...createDto,
        attachments: [],
        createdAt: new Date(),
      });
      (mockCaptchaService.verify as any).mockReturnValue(true);
    });

    it('should create a comment successfully', async () => {
      const result = await service.create(createDto, files);

      expect(result).toBeDefined();
      expect(mockCaptchaService.verify).toHaveBeenCalledWith('captcha-123', 'answer');
      expect(mockCommentsGateway.emitCommentCreated).toHaveBeenCalled();
      expect(mockPrismaService.comment.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException when CAPTCHA is invalid', async () => {
      (mockCaptchaService.verify as any).mockReturnValue(false);

      await expect(service.create(createDto, files)).rejects.toThrow(
        'Invalid or expired CAPTCHA',
      );
    });

    it('should throw NotFoundException when parent comment does not exist', async () => {
      (mockPrismaService.comment.findUnique as any).mockResolvedValue(null);

      const dtoWithParent = { ...createDto, parentId: 999 };
      await expect(service.create(dtoWithParent, files)).rejects.toThrow(
        'Parent comment not found',
      );
    });
  });
});
