// server/services/userService.ts
import { UserDao } from '../dao/userDao';
import type { IUser, ICreateUserDto, IUpdateUserDto } from '../types/user';

export class UserService {
  private userDao: UserDao;

  constructor() {
    this.userDao = new UserDao();
  }

  async getAllUsers(): Promise<IUser[]> {
    return await this.userDao.findAll();
  }

  async getUserById(id: string): Promise<IUser> {
    const user = await this.userDao.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async createUser(userData: ICreateUserDto): Promise<IUser> {
    // 检查邮箱是否已存在
    const existingUser = await this.userDao.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Email already exists');
    }

    return await this.userDao.create(userData);
  }

  async updateUser(id: string, userData: IUpdateUserDto): Promise<IUser> {
    const user = await this.userDao.update(id, userData);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    const success = await this.userDao.delete(id);
    if (!success) {
      throw new Error('User not found');
    }
  }
}