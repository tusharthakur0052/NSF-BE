import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Entry, EntrySchema } from '../schemas/entry.schema';
import { User, UserSchema } from '../schemas/user.schema';
import { EntriesService } from './entries.service';
import { EntriesController } from './entries.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Entry.name, schema: EntrySchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [EntriesController],
  providers: [EntriesService],
  exports: [EntriesService],
})
export class EntriesModule {}
