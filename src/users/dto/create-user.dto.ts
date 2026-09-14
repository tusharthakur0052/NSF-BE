import { IsString, IsNotEmpty, IsPositive, IsDateString, IsEnum, IsBoolean, IsOptional, MinLength, MaxLength, IsMongoId, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';


export class CreateUserDto {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty({ message: 'First name is required' })
  @MinLength(2, { message: 'First name must be at least 2 characters long' })
  @MaxLength(50, { message: 'First name cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'First name can only contain letters, spaces, and hyphens' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @IsNotEmpty({ message: 'Last name is required' })
  @MinLength(1, { message: 'Last name is required' })
  @MaxLength(50, { message: 'Last name cannot exceed 50 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, { message: 'Last name can only contain letters, spaces, and hyphens' })
  lastName: string;

  @ApiProperty({ example: '+919876543210' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @IsString()
  @Matches(/^(\+91)?[6-9]\d{9}$/, { message: 'Phone number must be a valid 10-digit mobile number with +91 country code' })
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

  @ApiProperty({ example: '2000-01-01' })
  @IsNotEmpty({ message: 'Date of birth is required' })
  @IsDateString({}, { message: 'Date of birth must be a valid date (YYYY-MM-DD)' })
  dateOfBirth: Date;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  fingerPrint: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  admission_No?: string;

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

  @ApiProperty({ required: false, description: 'S3 or public Image URL of member' })
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiProperty({ required: false, description: 'Document ID of member photo in S3/documents collection' })
  @IsString()
  @IsOptional()
  documentId?: string;
}
