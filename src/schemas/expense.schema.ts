import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ExpenseDocument = Expense & Document;

@Schema({ timestamps: true })
export class Expense {
  @Prop({ required: true, trim: true })
  description: string;

  @Prop({ required: true, min: 0 })
  amount: number;

  @Prop({ required: true, type: Date })
  date: Date;

  @Prop({ default: false })
  isPaid: boolean;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
