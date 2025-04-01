import { UserController } from '@/server/controller/userController';
import { connectDB } from '@/server/utils/db';

const userController = new UserController();

export default defineEventHandler(async (event: any) => {
  await connectDB();

  switch (event.method) {
    case 'GET':
      return await userController.getUsers();
    case 'POST':
      return await userController.createUser(event);
    default:
      throw createError({
        statusCode: 405,
        message: 'Method not allowed'
      });
  }
});