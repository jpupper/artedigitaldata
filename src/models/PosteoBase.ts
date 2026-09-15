import mongoose, { Schema, Document, Types } from 'mongoose';

export type PosteoType = 'post' | 'recurso' | 'evento' | 'oportunidad';

export interface IComment {
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export const CommentSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
  },
  { timestamps: true }
);

export interface IPosteoBase extends Document {
  title: string;
  description: string;
  author: Types.ObjectId;
  imageUrl: string;
  youtube_video?: string;
  tags: string[];
  likes: Types.ObjectId[];
  comments: IComment[];
  pinned: boolean;
  visibility: 'public' | 'unlisted';
  createdAt: Date;
  updatedAt: Date;
}
