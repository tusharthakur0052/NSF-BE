import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type DocumentFileDocument = DocumentFile & Document;

@Schema({ timestamps: true })
export class DocumentFile {
  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  filename: string;

  @Prop({ required: true, unique: true, index: true })
  key: string;

  @Prop({ required: true })
  mimeType: string;

  @Prop({ required: true })
  size: number;

  @Prop({ required: true })
  url: string;

  @Prop()
  bucket?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User' })
  uploadedBy?: MongooseSchema.Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const DocumentSchema = SchemaFactory.createForClass(DocumentFile);
