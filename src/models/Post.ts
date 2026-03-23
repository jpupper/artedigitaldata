import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment {
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IPost extends Document {
  author: Types.ObjectId;
  title: string;
  description: string;
  imageUrl: string;
  youtube_video: string;
  likes: Types.ObjectId[];
  comments: IComment[];
  tags: string[];
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

const PostSchema: Schema = new Schema(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    youtube_video: { type: String, default: '' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
    tags: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

export default mongoose.model<IPost>('Post', PostSchema);
