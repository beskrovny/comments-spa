import { Test, TestingModule } from '@nestjs/testing';
import { CommentsService } from './comments.service.js';
import { PrismaService } from '../prisma.service.js';
import { CaptchaService } from '../captcha/captcha.service.js';

describe('CommentsService', () => {
  let service: CommentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: {
            comment: {
              findUnique: vi.fn(),
              create: vi.fn(),
              findMany: vi.fn(),
              count: vi.fn(),
            },
            $transaction: vi.fn(),
          },
        },
        CaptchaService,
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
