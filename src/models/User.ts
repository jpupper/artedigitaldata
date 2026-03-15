import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'USUARIO' | 'ADMINISTRADOR';
  avatar: string;
  bio: string;
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['USUARIO', 'ADMINISTRADOR'], default: 'USUARIO' },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    displayName: { type: String, default: '' },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
