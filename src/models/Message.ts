import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IMessage extends Document {
  room: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    room: { type: Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>('Message', MessageSchema);
