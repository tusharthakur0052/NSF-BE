import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Entry, EntryDocument } from '../schemas/entry.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../schemas/subscription-plan.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Entry.name) private entryModel: Model<EntryDocument>,
    @InjectModel(SubscriptionPlan.name) private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<{ message: string, data: User }> {
    try {
      const newUser = new this.userModel(createUserDto);
      if (createUserDto.joinDate) {
        (newUser as any).createdAt = new Date(createUserDto.joinDate);
      }
      await newUser.save();

      // Create new entry
      const newEntry = new this.entryModel({
        userId: newUser._id,
        subscriptionPlanId: newUser.subscriptionPlanId,
        paymentMethod: createUserDto.paymentMethod || 'Cash',
        entryDate: createUserDto.joinDate ? new Date(createUserDto.joinDate) : new Date(),
      });
      await newEntry.save();

      return { message: 'User created successfully', data: newUser };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Phone number already exists');
      }
      throw error;
    }
  }

  async findAll(query?: any): Promise<{ message: string, data: User[] }> {
    const filter: any = { isDeleted: false };
    if (query) {
      if (query.nonActive === 'true') {
        filter.subscriptionIsActive = false;
      } else if (query.activeOnly === 'true') {
        filter.subscriptionIsActive = true;
      }
    }
    const users = await this.userModel.find(filter).lean().exec();
    const usersWithLatestSubscription = await Promise.all(
      users.map(async (user: any) => {
        const latestEntry = await this.entryModel
          .findOne({ userId: user._id as any, isDeleted: false })
          .sort({ entryDate: -1 })
          .select('entryDate')
          .lean()
          .exec();
        return {
          ...user,
          latestSubscriptionDate: latestEntry ? latestEntry.entryDate : null,
        };
      })
    );
    return {
      message: 'User fetched successfully',
      data: usersWithLatestSubscription as any
    };
  }

  async findOne(id: string): Promise<{ message: string, data: User }> {
    const user = await this.userModel.findOne({ _id: id, isDeleted: false }).lean().exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const latestEntry = await this.entryModel
      .findOne({ userId: user._id as any, isDeleted: false })
      .sort({ entryDate: -1 })
      .select('entryDate')
      .lean()
      .exec();
    const userWithLatestSubscription = {
      ...user,
      latestSubscriptionDate: latestEntry ? latestEntry.entryDate : null,
    };
    return { message: 'User fetched successfully', data: userWithLatestSubscription as any };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<{ message: string, data: User }> {
    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateUserDto, { returnDocument: 'after' })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User updated successfully', data: updatedUser };
  }

  async remove(id: string): Promise<{ message: string, data: User }> {
    const deletedUser = await this.userModel
      .findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: 'after' })
      .exec();

    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User deleted successfully', data: deletedUser };
  }

  async restore(id: string): Promise<{ message: string, data: User }> {
    const restoredUser = await this.userModel
      .findByIdAndUpdate(id, { isDeleted: false }, { returnDocument: 'after' })
      .exec();

    if (!restoredUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User restored successfully', data: restoredUser };
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleSubscriptionExpiryCron() {
    console.log('[Cron] Checking and updating member subscription statuses...');
    const result = await this.checkAndUpdateAllSubscriptionStatuses();
    console.log(`[Cron] Completed checking: ${result.updatedCount} users updated.`);
  }

  async checkAndUpdateAllSubscriptionStatuses(): Promise<{ success: boolean; updatedCount: number; data: any[] }> {
    const users = await this.userModel.find({ isDeleted: false }).exec();
    let updatedCount = 0;
    const results = [];

    for (const user of users) {
      // Find latest entry date
      const latestEntry = await this.entryModel
        .findOne({ userId: user._id as any, isDeleted: false })
        .sort({ entryDate: -1 })
        .exec();

      const startDate = latestEntry ? latestEntry.entryDate : (user as any).createdAt;
      if (!startDate) continue;

      // Find subscription plan to get duration
      const plan = await this.subscriptionPlanModel.findOne({ _id: user.subscriptionPlanId as any, isDeleted: false }).exec();
      let durationDays = 30; // default to monthly (30 days)

      if (plan) {
        const titleLower = plan.title.toLowerCase();
        if (titleLower.includes('annual') || titleLower.includes('yearly')) {
          durationDays = 365;
        } else if (titleLower.includes('quarterly')) {
          durationDays = 90;
        } else if (titleLower.includes('basic') || titleLower.includes('standard') || titleLower.includes('premium') || titleLower.includes('elite') || titleLower.includes('monthly')) {
          durationDays = 30;
        }
      }

      // Calculate expiration date
      const expiryDate = new Date(startDate);
      expiryDate.setDate(expiryDate.getDate() + durationDays);

      const today = new Date();
      // Reset times to compare dates only
      today.setHours(0, 0, 0, 0);
      const compareExpiry = new Date(expiryDate);
      compareExpiry.setHours(0, 0, 0, 0);

      // Diff in days
      const diffTime = compareExpiry.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let newStatus = 'Active';
      let isActive = true;

      if (diffDays <= 0) {
        newStatus = 'Expired';
        isActive = false;
      } else if (diffDays <= 5) {
        newStatus = 'Expiring Soon';
        isActive = true;
      }

      // Check if status changed to avoid redundant updates
      if (user.subscriptionStatus !== newStatus || user.subscriptionIsActive !== isActive) {
        await this.userModel.updateOne(
          { _id: user._id },
          { subscriptionStatus: newStatus, subscriptionIsActive: isActive }
        );
        updatedCount++;
        results.push({
          userId: user._id,
          name: `${user.firstName} ${user.lastName}`,
          oldStatus: user.subscriptionStatus,
          newStatus,
          isActive,
          expiryDate: expiryDate.toISOString().split('T')[0]
        });
      }
    }

    return {
      success: true,
      updatedCount,
      data: results
    };
  }
}
