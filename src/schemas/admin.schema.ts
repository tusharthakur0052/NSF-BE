import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AdminDocument = Admin & Document;

@Schema({ timestamps: true })
export class Admin {
  @Prop({ required: true, unique: true })
  userName: string;

  @Prop({ required: true })
  password?: string;

  @Prop()
  refreshToken?: string;
  
  @Prop()
  resetToken?: string;

  @Prop()
  resetTokenExpires?: Date;
}

export const AdminSchema = SchemaFactory.createForClass(Admin);
