import mongoose, { Schema, Types } from 'mongoose';
import { IPosteoBase, CommentSchema, IComment } from './PosteoBase';

export { IComment };

export interface IRecurso extends IPosteoBase {
  type: 'software' | 'github' | 'drive' | 'tutorial' | 'texto' | 'other';
  url: string;
  source: 'human' | 'ia';
}

const RecursoSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['software', 'github', 'drive', 'tutorial', 'texto', 'other'], default: 'other' },
    url: { type: String, required: true },
    imageUrl: { type: String, default: '' },
    youtube_video: { type: String, default: '' },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tags: [{ type: String, trim: true }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
    source: { type: String, enum: ['human', 'ia'], default: 'human' },
    visibility: { type: String, enum: ['public', 'unlisted'], default: 'public' },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

export default mongoose.model<IRecurso>('Recurso', RecursoSchema);

