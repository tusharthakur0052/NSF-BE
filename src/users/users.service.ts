import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) { }

  async create(createUserDto: CreateUserDto): Promise<{ message: string, data: User }> {
    try {
      const newUser = new this.userModel(createUserDto);
      await newUser.save();
      return { message: 'User created successfully', data: newUser };
    } catch (error) {
      if (error.code === 11000) {
        throw new ConflictException('Phone number already exists');
      }
      throw error;
    }
  }

  async findAll(): Promise<{ message: string, data: User[] }> {
    return { message: 'User fetched successfully', data: await this.userModel.find({ isDeleted: false }).exec() };
  }

  async findOne(id: string): Promise<{ message: string, data: User }> {
    const user = await this.userModel.findOne({ _id: id, isDeleted: false }).exec();
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User fetched successfully', data: user };
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<{ message: string, data: User }> {
    const updatedUser = await this.userModel
      .findOneAndUpdate({ _id: id, isDeleted: false }, updateUserDto, { new: true })
      .exec();

    if (!updatedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User updated successfully', data: updatedUser };
  }

  async remove(id: string): Promise<{ message: string, data: User }> {
    const deletedUser = await this.userModel
      .findByIdAndUpdate(id, { isDeleted: true }, { new: true })
      .exec();

    if (!deletedUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User deleted successfully', data: deletedUser };
  }

  async restore(id: string): Promise<{ message: string, data: User }> {
    const restoredUser = await this.userModel
      .findByIdAndUpdate(id, { isDeleted: false }, { new: true })
      .exec();

    if (!restoredUser) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return { message: 'User restored successfully', data: restoredUser };
  }
}
