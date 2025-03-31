// server/models/User.ts
import mongoose from 'mongoose';
import type { IUser } from '../types/user';

const userSchema = new mongoose.Schema<IUser>({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  age: { 
    type: Number, 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

export const User = mongoose.models.User || mongoose.model<IUser>('User', userSchema);