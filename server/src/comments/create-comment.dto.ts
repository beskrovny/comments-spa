import {
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsUrl,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9]+$/, {
    message: 'Name can contain only Latin letters and digits',
  })
  userName!: string;

  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  @IsUrl({ require_protocol: true })
  homePage?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(10000)
  text!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  parentId?: number;
}
