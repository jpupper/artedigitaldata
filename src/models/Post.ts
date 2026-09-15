import mongoose, { Schema, Types } from 'mongoose';
import { IPosteoBase, CommentSchema, IComment } from './PosteoBase';

export { IComment };

export interface IPost extends IPosteoBase {
  isContest: boolean;
  contestMonth: string;
  source: 'human' | 'ia';
}

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
    isContest: { type: Boolean, default: false },
    contestMonth: { type: String, default: '' },
    source: { type: String, enum: ['human', 'ia'], default: 'human' },
    visibility: { type: String, enum: ['public', 'unlisted'], default: 'public' },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model<IPost>('Post', PostSchema);

