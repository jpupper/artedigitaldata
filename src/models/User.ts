import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  username: string;
  email: string;
  password: string;
  role: 'USER' | 'ADMIN' | 'SYSTEM';
  avatar: string;
  bio: string;
  displayName: string;
  socials: {
    instagram?: string;
    whatsapp?: string;
    facebook?: string;
  };
  permissions?: {
    artedigital?: {
      role: 'USUARIO' | 'ADMINISTRADOR';
    };
  };
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema(
  {
    username: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    displayName: { type: String, default: '' },
    socials: {
      instagram: { type: String, default: '' },
      whatsapp: { type: String, default: '' },
      facebook: { type: String, default: '' },
    },
    role: { type: String, enum: ['USER', 'ADMIN', 'SYSTEM'], default: 'USER' },
    permissions: {
      artedigital: {
        role: { type: String, enum: ['USUARIO', 'ADMINISTRADOR'], default: 'USUARIO' }
      }
    },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true }
);

// Usar una conexión dedicada para Auth si está definida, de lo contrario la default
const authUri = process.env.MONGODB_AUTH_URI;
let userModel: mongoose.Model<IUser>;

if (authUri) {
  const authConn = mongoose.createConnection(authUri);
  userModel = authConn.model<IUser>('User', UserSchema);
} else {
  userModel = mongoose.model<IUser>('User', UserSchema);
}

export default userModel;
