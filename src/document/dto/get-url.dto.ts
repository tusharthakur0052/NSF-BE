import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetImageUrlQueryDto {
  @ApiProperty({
    description: 'S3 object key or file key',
    example: 'images/1725450000000-sample.png',
  })
  @IsNotEmpty()
  @IsString()
  key: string;

  @ApiPropertyOptional({
    description: 'Expiration time in seconds for presigned URL (if generating signed URL)',
    example: 3600,
    default: 3600,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  expiresIn?: number;
}
