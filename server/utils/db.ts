// server/utils/db.ts
import mongoose from 'mongoose'

// 数据库连接
export async function connectDB() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nuxt-demo')
      console.log('Connected to MongoDB')
    }
  } catch (error) {
    console.error('MongoDB connection error:', error)
    throw error
  }
}