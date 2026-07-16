import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../schemas/subscription-plan.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { SubscriptionPlansService } from './subscription-plans.service';
import { SubscriptionPlansController } from './subscription-plans.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: User.name, schema: UserSchema }
    ]),
  ],
  providers: [SubscriptionPlansService],
  controllers: [SubscriptionPlansController],
  exports: [SubscriptionPlansService],
})
export class SubscriptionPlansModule {}
