import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';
import { DocumentFile, DocumentFileDocument } from '../schemas/document.schema';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);
  private s3Client: S3Client;
  private bucketName: string;
  private region: string;
  private customDomain: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(DocumentFile.name)
    private readonly documentModel: Model<DocumentFileDocument>,
  ) {
    this.region = this.configService.get<string>('AWS_REGION') || 'us-east-1';
    this.bucketName =
      this.configService.get<string>('AWS_S3_BUCKET') ||
      this.configService.get<string>('AWS_S3_BUCKET_NAME') ||
      'my-app-uploads';
    this.customDomain = this.configService.get<string>('AWS_S3_CUSTOM_DOMAIN') || '';

    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('AWS_SECRET_ACCESS_KEY');

    this.s3Client = new S3Client({
      region: this.region,
      ...(accessKeyId && secretAccessKey
        ? {
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        }
        : {}),
    });
  }

  private isImageMimeType(mimeType: string): boolean {
    const allowedImageMimeTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml',
      'image/avif',
    ];
    return allowedImageMimeTypes.includes(mimeType.toLowerCase());
  }

  private constructPublicUrl(key: string): string {
    if (this.customDomain) {
      const cleanDomain = this.customDomain.replace(/\/$/, '');
      return `${cleanDomain}/${key}`;
    }
    return `https://${this.bucketName}.s3.${this.region}.amazonaws.com/${key}`;
  }

  /**
   * Upload an image to AWS S3 bucket and save metadata to MongoDB
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'images',
    userId?: string,
  ): Promise<DocumentFile> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    if (!this.isImageMimeType(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type (${file.mimetype}). Only image files (JPEG, PNG, WEBP, GIF, SVG, AVIF) are allowed.`,
      );
    }

    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const cleanFolder = folder.replace(/^\/+|\/+$/g, '');
    const key = `${cleanFolder}/${Date.now()}-${randomUUID()}-${sanitizedFilename}`;

    try {
      const putCommand = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      });

      await this.s3Client.send(putCommand);
    } catch (error) {
      this.logger.error(`Failed to upload file to S3: ${error.message}`, error.stack);
      throw new BadRequestException(`S3 Upload failed: ${error.message}`);
    }

    const url = this.constructPublicUrl(key);

    const documentRecord = new this.documentModel({
      originalName: file.originalname,
      filename: sanitizedFilename,
      key,
      mimeType: file.mimetype,
      size: file.size,
      url,
      bucket: this.bucketName,
      uploadedBy: userId || null,
      isDeleted: false,
    });

    return documentRecord.save();
  }

  /**
   * Upload multiple images to S3
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'ns-fitness',
    userId?: string,
  ): Promise<DocumentFile[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No image files provided');
    }

    const uploadPromises = files.map((file) => this.uploadImage(file, folder, userId));
    return Promise.all(uploadPromises);
  }

  /**
   * Get image URL and metadata by key or document ID
   */
  async getImageUrl(
    keyOrId: string,
    expiresIn?: number,
  ): Promise<{ url: string; key: string; signedUrl?: string; document?: DocumentFile }> {
    if (!keyOrId) {
      throw new BadRequestException('Image key or ID must be provided');
    }

    // Try finding by key or _id in DB
    let documentRecord = await this.documentModel
      .findOne({
        $or: [{ key: keyOrId }, { _id: keyOrId.match(/^[0-9a-fA-F]{24}$/) ? keyOrId : null }],
        isDeleted: false,
      })
      .exec();

    const key = documentRecord ? documentRecord.key : keyOrId;
    const publicUrl = documentRecord ? documentRecord.url : this.constructPublicUrl(key);

    let signedUrl: string | undefined;
    if (expiresIn && expiresIn > 0) {
      try {
        const getCommand = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        });
        signedUrl = await getSignedUrl(this.s3Client, getCommand, { expiresIn });
      } catch (error) {
        this.logger.warn(`Could not generate presigned URL for key ${key}: ${error.message}`);
      }
    }

    return {
      url: publicUrl,
      key,
      ...(signedUrl ? { signedUrl } : {}),
      ...(documentRecord ? { document: documentRecord } : {}),
    };
  }

  /**
   * Generate a presigned download URL for a key
   */
  async getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      return await getSignedUrl(this.s3Client, getCommand, { expiresIn });
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}: ${error.message}`);
      throw new BadRequestException(`Could not generate signed URL: ${error.message}`);
    }
  }

  /**
   * Get document record by key
   */
  async findByKey(key: string): Promise<DocumentFile> {
    const doc = await this.documentModel.findOne({ key, isDeleted: false }).exec();
    if (!doc) {
      throw new NotFoundException(`Document with key '${key}' not found`);
    }
    return doc;
  }

  /**
   * Get document record by ID
   */
  async findById(id: string): Promise<DocumentFile> {
    const doc = await this.documentModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!doc) {
      throw new NotFoundException(`Document with ID '${id}' not found`);
    }
    return doc;
  }

  /**
   * Soft delete or hard delete document from S3 and DB
   */
  async deleteImage(keyOrId: string): Promise<{ success: boolean; message: string }> {
    let documentRecord = await this.documentModel
      .findOne({
        $or: [{ key: keyOrId }, { _id: keyOrId.match(/^[0-9a-fA-F]{24}$/) ? keyOrId : null }],
        isDeleted: false,
      })
      .exec();

    const key = documentRecord ? documentRecord.key : keyOrId;

    try {
      const deleteCommand = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });
      await this.s3Client.send(deleteCommand);
    } catch (error) {
      this.logger.warn(`Failed to delete object from S3 (${key}): ${error.message}`);
    }

    if (documentRecord) {
      documentRecord.isDeleted = true;
      await documentRecord.save();
    }

    return {
      success: true,
      message: `Image with key '${key}' deleted successfully`,
    };
  }

  /**
   * List uploaded documents
   */
  async findAll(query: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.max(1, Math.min(100, query.limit || 10));
    const skip = (page - 1) * limit;

    const filter: any = { isDeleted: false };
    if (query.search) {
      filter.$or = [
        { originalName: { $regex: query.search, $options: 'i' } },
        { filename: { $regex: query.search, $options: 'i' } },
        { key: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.documentModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.documentModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
