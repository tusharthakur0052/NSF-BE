import { IsBoolean, IsDateString, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty()
  @IsNumber()
  @IsPositive()
  @IsNotEmpty()
  amount: number;

  @ApiProperty()
  @IsDateString()
  @IsNotEmpty()
  date: Date;

  @ApiProperty({ required: false })
  @IsBoolean()
  @IsOptional()
  isPaid?: boolean;
}
