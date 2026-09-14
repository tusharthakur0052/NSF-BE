import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from '../schemas/user.schema';
import { Entry, EntrySchema } from '../schemas/entry.schema';
import { SubscriptionPlan, SubscriptionPlanSchema } from '../schemas/subscription-plan.schema';
import { UsersService } from '././users.service';
import { UsersController } from '././users.controller';
import { DocumentService } from 'src/document/document.service';
import { DocumentFile, DocumentSchema } from 'src/schemas/document.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Entry.name, schema: EntrySchema },
      { name: SubscriptionPlan.name, schema: SubscriptionPlanSchema },
      { name: DocumentFile.name, schema: DocumentSchema },
    ]),
  ],
  providers: [UsersService, DocumentService],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule { }
