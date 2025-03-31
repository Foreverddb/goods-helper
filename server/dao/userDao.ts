// server/dao/userDao.ts
import { User } from '../models/users';
import type { IUser, ICreateUserDto, IUpdateUserDto } from '../types/user';

export class UserDao {
  async findAll(): Promise<IUser[]> {
    return await User.find().sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  async create(userData: ICreateUserDto): Promise<IUser> {
    const user = new User(userData);
    return await user.save();
  }

  async update(id: string, userData: IUpdateUserDto): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, userData, { new: true });
  }

  async delete(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }
}