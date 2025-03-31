/* eslint-disable @typescript-eslint/no-explicit-any */
import type { H3Event } from 'h3';
import { UserService } from '../services/userService';
import type { ICreateUserDto, IUpdateUserDto } from '../types/user';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  async getUsers() {
    try {
      return await this.userService.getAllUsers();
    } catch (error: any) {
      throw createError({
        statusCode: 500,
        message: error.message
      });
    }
  }

  async getUser(event: H3Event) {
    try {
      const id = event.context.params?.id || "empty";
      return await this.userService.getUserById(id);
    } catch (error: any) {
      throw createError({
        statusCode: error.message === 'User not found' ? 404 : 500,
        message: error.message
      });
    }
  }

  async createUser(event: H3Event) {
    try {
      const body = await readBody<ICreateUserDto>(event);
      return await this.userService.createUser(body);
    } catch (error: any) {
      throw createError({
        statusCode: error.message === 'Email already exists' ? 400 : 500,
        message: error.message
      });
    }
  }

  async updateUser(event: H3Event) {
    try {
      const id = event.context.params?.id || "empty";
      const body = await readBody<IUpdateUserDto>(event);
      return await this.userService.updateUser(id, body);
    } catch (error: any) {
      throw createError({
        statusCode: error.message === 'User not found' ? 404 : 500,
        message: error.message
      });
    }
  }

  async deleteUser(event: H3Event) {
    try {
      const id = event.context.params?.id || "empty";
      await this.userService.deleteUser(id);
      return { message: 'User deleted successfully' };
    } catch (error: any) {
      throw createError({
        statusCode: error.message === 'User not found' ? 404 : 500,
        message: error.message
      });
    }
  }
}