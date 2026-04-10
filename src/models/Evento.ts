import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IComment {
  user: Types.ObjectId;
  text: string;
  createdAt: Date;
}

export interface ITicketConfig {
  enabled: boolean;
  price: number;
  paymentLink: string;
  successMessage: string;
  maxTickets: number;
  isContribution: boolean;
}

export interface IEvento extends Document {
  title: string;
  description: string;
  date: Date;
  location: string;
  imageUrl: string;
  youtube_video: string;
  creator: Types.ObjectId;
  participants: Types.ObjectId[];
  likes: Types.ObjectId[];
  comments: IComment[];
  ticketConfig: ITicketConfig;
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

const TicketConfigSchema: Schema = new Schema({
  enabled: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  paymentLink: { type: String, default: '' },
  successMessage: { type: String, default: '' },
  maxTickets: { type: Number, default: 100 },
  isContribution: { type: Boolean, default: false },
}, { _id: false });

const EventoSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    date: { type: Date, required: true },
    location: { type: String, default: '' },
    imageUrl: { type: String, default: '' },
    youtube_video: { type: String, default: '' },
    creator: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    likes: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
    ticketConfig: { type: TicketConfigSchema, default: () => ({ enabled: false }) },
  },
  { timestamps: true }
);

export default mongoose.model<IEvento>('Evento', EventoSchema);
