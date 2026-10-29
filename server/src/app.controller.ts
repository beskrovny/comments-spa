import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health/db')
  async checkDatabase() {
    const result = await this.prisma.$queryRaw<
      { current_database: string }[]
    >`SELECT current_database()`;

    return {
      status: 'ok',
      database: result[0].current_database,
    };
  }
}