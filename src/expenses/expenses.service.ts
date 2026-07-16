import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Expense, ExpenseDocument } from '../schemas/expense.schema';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectModel(Expense.name) private expenseModel: Model<ExpenseDocument>,
  ) {}

  async create(createExpenseDto: CreateExpenseDto): Promise<{ message: string, data: Expense }> {
    const newExpense = new this.expenseModel(createExpenseDto);
    await newExpense.save();
    return { message: 'Expense created successfully', data: newExpense };
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    isPaid?: boolean;
    startDate?: string;
    endDate?: string;
  }): Promise<{ message: string, data: Expense[], total: number, page: number, limit: number }> {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { isDeleted: false };

    if (query.isPaid !== undefined) {
      filter.isPaid = query.isPaid;
    }
    if (query.search) {
      filter.description = { $regex: query.search, $options: 'i' };
    }
    if (query.startDate || query.endDate) {
      filter.date = {};
      if (query.startDate) {
        filter.date.$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        filter.date.$lte = new Date(query.endDate);
      }
    }

    const [expenses, total] = await Promise.all([
      this.expenseModel
        .find(filter)
        .skip(skip)
        .limit(limit)
        .sort({ date: -1 })
        .exec(),
      this.expenseModel.countDocuments(filter).exec(),
    ]);

    return {
      message: 'Expenses fetched successfully',
      data: expenses,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<{ message: string, data: Expense }> {
    const expense = await this.expenseModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!expense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    return { message: 'Expense fetched successfully', data: expense };
  }

  async update(id: string, updateExpenseDto: UpdateExpenseDto): Promise<{ message: string, data: Expense }> {
    const updatedExpense = await this.expenseModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateExpenseDto, { returnDocument: 'after' })
      .exec();

    if (!updatedExpense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    return { message: 'Expense updated successfully', data: updatedExpense };
  }

  async remove(id: string): Promise<{ message: string, data: Expense }> {
    const deletedExpense = await this.expenseModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, { isDeleted: true }, { returnDocument: 'after' })
      .exec();

    if (!deletedExpense) {
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }
    return { message: 'Expense deleted successfully', data: deletedExpense };
  }
}
