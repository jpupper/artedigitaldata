import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IChatRoom extends Document {
  name: string;
  description: string;
  isPrivate: boolean;
  creator: Types.ObjectId;
  participants: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatRoomSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    isPrivate: { type: Boolean, default: false },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.model<IChatRoom>('ChatRoom', ChatRoomSchema);
