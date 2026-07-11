import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../schemas/subscription-plan.schema';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto, UpdateSubscriptionPlanStatusDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectModel(SubscriptionPlan.name) private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
  ) {}

  async create(createDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const createdPlan = new this.subscriptionPlanModel(createDto);
    return createdPlan.save();
  }

  async findAll(): Promise<SubscriptionPlan[]> {
    return this.subscriptionPlanModel.find({ isDeleted: false }).exec();
  }

  async findOne(id: string): Promise<SubscriptionPlan> {
    const plan = await this.subscriptionPlanModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }
    return plan;
  }

  async update(id: string, updateDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const updatedPlan = await this.subscriptionPlanModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateDto, { new: true })
      .exec();
      
    if (!updatedPlan) {
      throw new NotFoundException('Subscription plan not found.');
    }
    return updatedPlan;
  }

  async remove(id: string): Promise<null> {
    const deletedPlan = await this.subscriptionPlanModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();
      
    if (!deletedPlan) {
      throw new NotFoundException('Subscription plan not found.');
    }
    return null;
  }

  async updateStatus(id: string, updateStatusDto: UpdateSubscriptionPlanStatusDto): Promise<SubscriptionPlan> {
    const updatedPlan = await this.subscriptionPlanModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isActive: updateStatusDto.isActive }, { new: true })
      .select('_id isActive')
      .exec();
      
    if (!updatedPlan) {
      throw new NotFoundException('Subscription plan not found.');
    }
    return updatedPlan;
  }
}
