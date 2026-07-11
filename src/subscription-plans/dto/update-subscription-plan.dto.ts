import { PartialType } from '@nestjs/swagger';
import { CreateSubscriptionPlanDto } from './create-subscription-plan.dto';
import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateSubscriptionPlanDto extends PartialType(CreateSubscriptionPlanDto) {}

export class UpdateSubscriptionPlanStatusDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive: boolean;
}
