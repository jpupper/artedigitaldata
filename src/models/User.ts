import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'USUARIO' | 'ADMINISTRADOR';
  avatar: string;
  bio: string;
  displayName: string;
  socials: {
    instagram?: string;
    discord?: string;
    whatsapp?: string;
    facebook?: string;
    tiktok?: string;
  };
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
    socials: {
      instagram: { type: String, default: '' },
      discord: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      facebook: { type: String, default: '' },
      tiktok: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

export default mongoose.model<IUser>('User', UserSchema);
