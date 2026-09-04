import {
  Controller,
  Post,
  Get,
  Delete,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  Query,
  Param,
  Req,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { DocumentService } from './document.service';
import { UploadImageDto, FileUploadSwaggerDto, MultipleFilesUploadSwaggerDto } from './dto/upload-document.dto';
import { GetImageUrlQueryDto } from './dto/get-url.dto';

@ApiTags('document')
@Controller('document')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload an image to S3 bucket and return image URL' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to upload',
    type: FileUploadSwaggerDto,
  })
  @ApiResponse({
    status: 210,
    description: 'Image successfully uploaded to S3',
    schema: {
      type: 'object',
      properties: {
        _id: { type: 'string' },
        originalName: { type: 'string' },
        filename: { type: 'string' },
        key: { type: 'string' },
        mimeType: { type: 'string' },
        size: { type: 'number' },
        url: { type: 'string', example: 'https://bucket-name.s3.us-east-1.amazonaws.com/images/1725450000000-uuid-image.png' },
        createdAt: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadImageDto,
    @Req() req: any,
  ) {
    const userId = req.user?._id || req.user?.id;
    return this.documentService.uploadImage(file, dto.folder || 'images', userId);
  }

  @Post('upload-multiple')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Upload multiple images to S3 bucket' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'List of image files to upload',
    type: MultipleFilesUploadSwaggerDto,
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() dto: UploadImageDto,
    @Req() req: any,
  ) {
    const userId = req.user?._id || req.user?.id;
    return this.documentService.uploadMultipleImages(files, dto.folder || 'images', userId);
  }

  @Get('url')
  @ApiOperation({ summary: 'Get image URL and optional presigned URL by key or ID' })
  @ApiQuery({ name: 'key', required: true, description: 'S3 Object Key or Document Mongo ID' })
  @ApiQuery({ name: 'expiresIn', required: false, description: 'Expiration time in seconds for presigned URL' })
  @ApiResponse({
    status: 200,
    description: 'Returns the S3 URL for the image',
    schema: {
      type: 'object',
      properties: {
        url: { type: 'string', example: 'https://bucket-name.s3.us-east-1.amazonaws.com/images/1725450000000-uuid-image.png' },
        key: { type: 'string' },
        signedUrl: { type: 'string' },
      },
    },
  })
  async getImageUrl(@Query() query: GetImageUrlQueryDto) {
    return this.documentService.getImageUrl(query.key, query.expiresIn);
  }

  @Get('url/*')
  @ApiOperation({ summary: 'Get image URL by wild-card S3 object key path' })
  @ApiParam({ name: '0', description: 'Full S3 key path, e.g., images/photo.png' })
  async getImageUrlByPath(@Param('0') keyPath: string, @Query('expiresIn') expiresIn?: number) {
    return this.documentService.getImageUrl(keyPath, expiresIn ? Number(expiresIn) : undefined);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all uploaded document images' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.documentService.findAll({ page, limit, search });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document details by Mongo ID' })
  @ApiParam({ name: 'id', description: 'Document MongoDB ObjectId' })
  async findOne(@Param('id') id: string) {
    return this.documentService.findById(id);
  }

  @Delete('key/*')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an image from S3 by object key path' })
  async deleteByKeyPath(@Param('0') keyPath: string) {
    return this.documentService.deleteImage(keyPath);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete an image from S3 by Mongo ID or key' })
  async deleteImage(@Param('id') id: string) {
    return this.documentService.deleteImage(id);
  }
}
