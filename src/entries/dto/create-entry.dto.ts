import { IsMongoId, IsNotEmpty, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEntryDto {
  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  userId: string;

  @ApiProperty({ required: false })
  @IsMongoId()
  @IsOptional()
  subscriptionPlanId?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  note?: string;

  @ApiProperty({ enum: ['Cash', 'UPI'], default: 'Cash' })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  entryDate?: string;
}
