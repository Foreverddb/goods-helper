/* eslint-disable @typescript-eslint/no-explicit-any */
import { UserService } from '../services/userService';
import type { ICreateUserDto, IUpdateUserDto } from '../types/user';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getUsers() {
  }

  async createUser() {

  }

  async updateUser() {
    
  }

  async deleteUser() {
    
  }
}