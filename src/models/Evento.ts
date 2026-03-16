import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment {
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IEvento extends Document {
  title: string;
  description: string;
  date: Date;
  location: string;
  imageUrl: string;
  creator: Types.ObjectId;
  participants: Types.ObjectId[];
  likes: Types.ObjectId[];
  comments: IComment[];
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

const EventoSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    location: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IEvento>('Evento', EventoSchema);
