import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { Entry, EntryDocument } from '../schemas/entry.schema';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../schemas/subscription-plan.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as XLSX from 'xlsx';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Entry.name) private entryModel: Model<EntryDocument>,
    @InjectModel(SubscriptionPlan.name) private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
  ) { }

  private formatPhoneNumber(rawPhone?: string): string | undefined {
    if (!rawPhone) return rawPhone;
    const trimmed = rawPhone.trim();
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length === 10) {
      return `+91${digits}`;
    } else if (digits.length === 12 && digits.startsWith('91')) {
      return `+${digits}`;
    }
    return trimmed.startsWith('+') ? trimmed : `+91${trimmed}`;
  }

  async create(createUserDto: CreateUserDto): Promise<{ message: string, data: User }> {
    try {
      if (createUserDto.phoneNumber) {
        createUserDto.phoneNumber = this.formatPhoneNumber(createUserDto.phoneNumber)!;
      }
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

  async findAll(query?: any): Promise<{
    message: string;
    data: User[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = Number(query?.page) || 1;
    const limit = Number(query?.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { isDeleted: false };

    if (query?.nonActive === 'true') {
      filter.subscriptionIsActive = false;
    } else if (query?.activeOnly === 'true') {
      filter.subscriptionIsActive = true;
    }

    if (query?.status && query.status !== 'All Status') {
      filter.subscriptionStatus = query.status;
    }

    if (query?.planId && query.planId !== 'All Plans') {
      filter.subscriptionPlanId = query.planId;
    }

    if (query?.search) {
      filter.$or = [
        { firstName: { $regex: query.search, $options: 'i' } },
        { lastName: { $regex: query.search, $options: 'i' } },
        { phoneNumber: { $regex: query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.userModel
        .find(filter)
        .populate('subscriptionPlanId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.userModel.countDocuments(filter),
    ]);

    const userIds = users.map((u) => u._id);

    // Latest subscription entry of each user
    const latestEntries = await this.entryModel.aggregate([
      {
        $match: {
          isDeleted: false,
          userId: { $in: userIds },
        },
      },
      {
        $sort: {
          entryDate: -1,
        },
      },
      {
        $group: {
          _id: '$userId',
          latestSubscriptionDate: {
            $first: '$entryDate',
          },
        },
      },
    ]);

    const latestEntryMap = new Map(
      latestEntries.map((e) => [e._id.toString(), e.latestSubscriptionDate]),
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const bulkUpdates: any = [];

    const data = users.map((user: any) => {
      const latestSubscriptionDate =
        latestEntryMap.get(user._id.toString()) ?? null;

      const startDate = latestSubscriptionDate || user.createdAt;
      let expiryDate = null;

      if (startDate && user.subscriptionPlanId) {
        let durationDays = 30; // default to monthly (30 days)
        const titleLower = (user.subscriptionPlanId.title || '').toLowerCase();
        if (titleLower.includes('annual') || titleLower.includes('yearly')) {
          durationDays = 365;
        } else if (titleLower.includes('quarterly')) {
          durationDays = 90;
        } else if (
          titleLower.includes('basic') ||
          titleLower.includes('standard') ||
          titleLower.includes('premium') ||
          titleLower.includes('elite') ||
          titleLower.includes('monthly')
        ) {
          durationDays = 30;
        }

        expiryDate = new Date(startDate);
        expiryDate.setDate(expiryDate.getDate() + durationDays);
      }

      let subscriptionStatus = user.subscriptionStatus;
      let subscriptionIsActive = user.subscriptionIsActive;

      if (
        expiryDate &&
        expiryDate < today &&
        subscriptionStatus?.toUpperCase() === 'ACTIVE'
      ) {
        subscriptionStatus = 'Expired';
        subscriptionIsActive = false;

        bulkUpdates.push({
          updateOne: {
            filter: { _id: user._id },
            update: {
              $set: {
                subscriptionStatus: 'Expired',
                subscriptionIsActive: false,
                subscriptionExpiryDate: expiryDate,
              },
            },
          },
        });
      }

      return {
        ...user,
        latestSubscriptionDate,
        subscriptionExpiryDate: expiryDate,
        subscriptionStatus,
        subscriptionIsActive,
      };
    });

    if (bulkUpdates.length) {
      await this.userModel.bulkWrite(bulkUpdates);
    }

    return {
      message: 'User fetched successfully',
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
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
    if (updateUserDto.phoneNumber) {
      updateUserDto.phoneNumber = this.formatPhoneNumber(updateUserDto.phoneNumber)!;
    }
    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateUserDto, { returnDocument: 'after' })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User updated successfully', data: updatedUser };
  }

  async remove(id: string): Promise<{ message: string, data: User }> {
    const deletedUser: any = await this.userModel
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
          {
            subscriptionStatus: newStatus,
            subscriptionIsActive: isActive,
            subscriptionExpiryDate: expiryDate,
          }
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

  async importExcel(file: any): Promise<{ message: string; count: number }> {
    if (!file || !file.buffer) {
      throw new ConflictException('No file buffer provided');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet);

    const plans = await this.subscriptionPlanModel.find({ isDeleted: false }).exec();

    const getVal = (row: any, keys: string[]) => {
      for (const key of keys) {
        const foundKey = Object.keys(row).find(
          (k) => k.trim().toLowerCase() === key.toLowerCase().trim()
        );
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
          return row[foundKey];
        }
      }
      return null;
    };

    const parseExcelDate = (val: any): Date | null => {
      if (!val) return null;
      if (val instanceof Date) return val;
      if (typeof val === 'number') {
        return new Date(Math.round((val - 25569) * 86400 * 1000));
      }
      if (typeof val === 'string') {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d;
        const parts = val.split(/[./-]/);
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          let year = parseInt(parts[2], 10);
          if (year < 100) {
            year += year < 50 ? 2000 : 1900;
          }
          const parsedDate = new Date(year, month, day);
          if (!isNaN(parsedDate.getTime())) return parsedDate;
        }
      }
      return null;
    };

    let count = 0;

    for (const row of rawData) {
      const rawPhone = getVal(row, ['mob. no.']);
      if (!rawPhone) continue;
      const phoneNumber = String(rawPhone).trim();

      const fullName = String(getVal(row, ['name']) || '').trim();
      let firstName = 'Member';
      let lastName = '.';
      if (fullName) {
        const parts = fullName.split(/\s+/);
        firstName = parts[0];
        lastName = parts.slice(1).join(' ') || '.';
      }

      const planTitle = String(getVal(row, ['plan']) || '').trim().toLowerCase();
      let matchedPlan = plans.find((p) => p.title.toLowerCase() === planTitle);
      if (!matchedPlan) {
        matchedPlan = plans.find(
          (p) => p.title.toLowerCase().includes(planTitle) || planTitle.includes(p.title.toLowerCase())
        );
      }
      if (!matchedPlan && plans.length > 0) {
        matchedPlan = plans[0];
      }
      if (!matchedPlan) {
        continue;
      }

      const admissionNo = String(getVal(row, ['admission no. id']) || '').trim();
      const rawJoinDate = getVal(row, ['date of joining']);
      const joinDate = parseExcelDate(rawJoinDate) || new Date();

      const rawLatestDateSub = getVal(row, ['latest date sub.']);
      const latestDateSub = parseExcelDate(rawLatestDateSub) || joinDate;

      let user = await this.userModel.findOne({ phoneNumber, isDeleted: false }).exec();

      if (user) {
        user.firstName = firstName;
        user.lastName = lastName;
        user.subscriptionPlanId = matchedPlan._id as any;
        if (admissionNo) {
          user.fingerPrint = admissionNo;
          user.admission_No = admissionNo;
        }
        await user.save();
      } else {
        const defaultDob = new Date(new Date().getFullYear() - 25, 0, 1);
        user = new this.userModel({
          firstName,
          lastName,
          phoneNumber,
          isWhatsAppNo: true,
          gender: 'male',
          age: 25,
          dateOfBirth: defaultDob,
          subscriptionPlanId: matchedPlan._id,
          subscriptionIsActive: true,
          subscriptionStatus: 'Active',
          fingerPrint: admissionNo || undefined,
          admission_No: admissionNo || undefined,
          createdAt: joinDate,
        });
        await user.save();
      }

      const newEntry = new this.entryModel({
        userId: user._id,
        subscriptionPlanId: matchedPlan._id,
        paymentMethod: 'Cash',
        entryDate: latestDateSub,
      });
      await newEntry.save();

      count++;
    }

    return { message: 'Excel data imported successfully', count };
  }
}
