import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SubscriptionPlan, SubscriptionPlanDocument } from '../schemas/subscription-plan.schema';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateSubscriptionPlanDto } from './dto/create-subscription-plan.dto';
import { UpdateSubscriptionPlanDto, UpdateSubscriptionPlanStatusDto } from './dto/update-subscription-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(
    @InjectModel(SubscriptionPlan.name) private subscriptionPlanModel: Model<SubscriptionPlanDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  async create(createDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const createdPlan = new this.subscriptionPlanModel(createDto);
    return createdPlan.save();
  }

  async findAll(): Promise<any[]> {
    const plans = await this.subscriptionPlanModel.find({ isDeleted: false }).lean().exec();
    return Promise.all(
      plans.map(async (plan: any) => {
        const userCount = await this.userModel.countDocuments({
          subscriptionPlanId: plan._id,
          isDeleted: false,
        });
        return {
          ...plan,
          userCount,
        };
      }),
    );
  }

  async findOne(id: string): Promise<any> {
    const plan = await this.subscriptionPlanModel.findOne({ _id: id, isDeleted: false }).lean().exec();
    if (!plan) {
      throw new NotFoundException('Subscription plan not found.');
    }
    const userCount = await this.userModel.countDocuments({
      subscriptionPlanId: plan._id as any,
      isDeleted: false,
    });
    return {
      ...plan,
      userCount,
    };
  }

  async update(id: string, updateDto: UpdateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const updatedPlan = await this.subscriptionPlanModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateDto, { returnDocument: 'after' })
      .exec();

    if (!updatedPlan) {
      throw new NotFoundException('Subscription plan not found.');
    }
    return updatedPlan;
  }

  async remove(id: string): Promise<null> {
    const deletedPlan = await this.subscriptionPlanModel
      .findByIdAndUpdate(id, { isDeleted: true }, { returnDocument: 'after' })
      .exec();

    if (!deletedPlan) {
      throw new NotFoundException('Subscription plan not found.');
    }
    return null;
  }

  async updateStatus(id: string, updateStatusDto: UpdateSubscriptionPlanStatusDto): Promise<SubscriptionPlan> {
    const updatedPlan = await this.subscriptionPlanModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isActive: updateStatusDto.isActive }, { returnDocument: 'after' })
      .select('_id isActive')
      .exec();

    if (!updatedPlan) {
      throw new NotFoundException('Subscription plan not found.');
    }
    return updatedPlan;
  }
}
