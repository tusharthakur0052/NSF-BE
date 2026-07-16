import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type EntryDocument = Entry & Document;

@Schema({ timestamps: true })
export class Entry {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  userId: MongooseSchema.Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'SubscriptionPlan', required: true })
  subscriptionPlanId: MongooseSchema.Types.ObjectId;

  @Prop()
  note?: string;

  @Prop({ type: String, enum: ['Cash', 'UPI'], default: 'Cash' })
  paymentMethod: string;

  @Prop({ type: Date, default: Date.now })
  entryDate: Date;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const EntrySchema = SchemaFactory.createForClass(Entry);
