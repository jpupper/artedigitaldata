import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment {
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface IRecurso extends Document {
  title: string;
  description: string;
  type: 'software' | 'github' | 'drive' | 'tutorial' | 'texto' | 'other';
  url: string;
  author: Types.ObjectId;
  imageUrl?: string;
  youtube_video?: string;
  tags: string[];
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
  },
  { timestamps: true }
);

export default mongoose.model<IRecurso>('Recurso', RecursoSchema);
