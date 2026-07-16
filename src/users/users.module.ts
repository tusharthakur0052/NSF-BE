import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Entry, EntrySchema } from '../schemas/entry.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../schemas/subscription-plan.schema';
import { UsersService } from '././users.service';
import { UsersController } from '././users.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Entry.name, schema: EntrySchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
    ]),
  ],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
