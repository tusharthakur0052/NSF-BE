import { IsString, IsNotEmpty, IsPhoneNumber, IsPositive, IsDateString, IsEnum, IsBoolean, IsOptional, MinLength, MaxLength, IsMongoId } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  phoneNumber: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsBoolean()
  isWhatsAppNo: boolean;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  gender: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsPositive()
  age: number;

  @ApiProperty()
  @IsDateString()
  dateOfBirth: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fingerPrint: string;

  @ApiProperty()
  @IsMongoId()
  @IsNotEmpty()
  subscriptionPlanId: string;

  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  subscriptionIsActive: boolean;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  paymentMethod?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  joinDate?: string;
}
