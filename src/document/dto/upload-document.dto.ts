import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class UploadImageDto {
  @ApiPropertyOptional({
    description: 'Folder or directory path in S3 bucket (e.g., images, profiles, products)',
    default: 'images',
  })
  @IsOptional()
  @IsString()
  folder?: string;

  @ApiPropertyOptional({
    description: 'Optional description or tag for the image',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class FileUploadSwaggerDto {
  @ApiProperty({ type: 'string', format: 'binary', description: 'Image file to upload (JPEG, PNG, WEBP, GIF, SVG)' })
  file: any;

  @ApiPropertyOptional({ description: 'Folder or category in S3 bucket', default: 'images' })
  folder?: string;
}

export class MultipleFilesUploadSwaggerDto {
  @ApiProperty({ type: 'array', items: { type: 'string', format: 'binary' }, description: 'Image files to upload' })
  files: any[];

  @ApiPropertyOptional({ description: 'Folder or category in S3 bucket', default: 'images' })
  folder?: string;
}
