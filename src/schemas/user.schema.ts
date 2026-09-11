import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type UserDocument = User & Document;


@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true })
  phoneNumber: string;

  @Prop({ required: true })
  isWhatsAppNo: boolean;

  @Prop({ required: true })
  gender: string;

  @Prop({ required: true, type: Number })
  age: number;

  @Prop({ required: true })
  dateOfBirth: Date;

  @Prop()
  address: string;

  @Prop()
  fingerPrint: string;

  @Prop({ type: String })
  admission_No?: string;

  @Prop({ default: null })
  imageUrl?: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'DocumentFile', default: null })
  documentId?: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  subscriptionPlanId: MongooseSchema.Types.ObjectId;

  @Prop({ default: false })
  subscriptionIsActive: boolean;

  @Prop({ default: 'Active' })
  subscriptionStatus: string;

  @Prop({ type: Date })
  subscriptionExpiryDate?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  latestSubscriptionDate?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
