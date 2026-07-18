import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Entry, EntryDocument } from '../schemas/entry.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateEntryDto } from './dto/create-entry.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';

@Injectable()
export class EntriesService {
  constructor(
    @InjectModel(Entry.name) private entryModel: Model<EntryDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  async create(createEntryDto: CreateEntryDto): Promise<{ message: string, data: Entry }> {
    const user = await this.userModel.findOne({ _id: createEntryDto.userId, isDeleted: false }).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${createEntryDto.userId} not found`);
    }

    const newEntry = new this.entryModel({
      userId: user._id,
      subscriptionPlanId: createEntryDto.subscriptionPlanId || user.subscriptionPlanId,
      note: createEntryDto.note,
      paymentMethod: createEntryDto.paymentMethod || 'Cash',
      entryDate: createEntryDto.entryDate ? new Date(createEntryDto.entryDate) : new Date(),
    });

    await newEntry.save();
    await this.userModel.updateOne(
      { _id: user._id },
      { subscriptionIsActive: true, subscriptionStatus: 'Active' }
    );
    return { message: 'Entry created successfully', data: newEntry };
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    userId?: string;
    subscriptionPlanId?: string;
  }): Promise<{ message: string, data: Entry[], total: number, totalPages: number, page: number, limit: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { isDeleted: false };

    if (query.userId) {
      filter.userId = query.userId;
    }
    if (query.subscriptionPlanId) {
      filter.subscriptionPlanId = query.subscriptionPlanId;
    }
    if (query.search) {
      filter.note = { $regex: query.search, $options: 'i' };
    }

    const [entries, total] = await Promise.all([
      this.entryModel
        .find(filter)
        .populate('userId')
        .populate('subscriptionPlanId')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec(),
      this.entryModel.countDocuments(filter).exec(),
    ]);

    return {
      message: 'Entries fetched successfully',
      data: entries,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<{ message: string, data: Entry }> {
    const entry = await this.entryModel
      .findOne({ _id: id, isDeleted: false })
      .populate('userId')
      .populate('subscriptionPlanId')
      .exec();

    if (!entry) {
      throw new NotFoundException(`Entry with ID ${id} not found`);
    }
    return { message: 'Entry fetched successfully', data: entry };
  }

  async update(id: string, updateEntryDto: UpdateEntryDto): Promise<{ message: string, data: Entry }> {
    // If updating userId, check if new user exists and update subscriptionPlanId accordingly
    const updateData: any = { ...updateEntryDto };

    if (updateEntryDto.userId) {
      const user = await this.userModel.findOne({ _id: updateEntryDto.userId, isDeleted: false }).exec();
      if (!user) {
        throw new NotFoundException(`User with ID ${updateEntryDto.userId} not found`);
      }
      if (!updateEntryDto.subscriptionPlanId) {
        updateData.subscriptionPlanId = user.subscriptionPlanId;
      }
    }

    if (updateEntryDto.entryDate) {
      updateData.entryDate = new Date(updateEntryDto.entryDate);
    }

    const updatedEntry = await this.entryModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateData, { returnDocument: 'after' })
      .populate('userId')
      .populate('subscriptionPlanId')
      .exec();

    if (!updatedEntry) {
      throw new NotFoundException(`Entry with ID ${id} not found`);
    }
    return { message: 'Entry updated successfully', data: updatedEntry };
  }

  async remove(id: string): Promise<{ message: string, data: Entry }> {
    const deletedEntry = await this.entryModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { returnDocument: 'after' })
      .exec();

    if (!deletedEntry) {
      throw new NotFoundException(`Entry with ID ${id} not found`);
    }
    return { message: 'Entry deleted successfully', data: deletedEntry };
  }
}
