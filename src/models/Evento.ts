import mongoose, { Schema, Types } from 'mongoose';
import { IPosteoBase, CommentSchema, IComment } from './PosteoBase';

export { IComment };

export interface ITicketConfig {
  enabled: boolean;
  price: number;
  paymentLink: string;
  successMessage: string;
  purchaseMessage: string;
  manualPaymentInfo?: string;
  mode?: string;
  maxTickets: number;
  isContribution: boolean;
}

export interface IEvento extends IPosteoBase {
  date: Date;
  location: string;
  creator: Types.ObjectId;
  participants: Types.ObjectId[];
  ticketConfig: ITicketConfig;
  doorUsers: Types.ObjectId[];
}

const TicketConfigSchema: Schema = new Schema({
  enabled: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  paymentLink: { type: String, default: '' },
  successMessage: { type: String, default: '' },
  purchaseMessage: { type: String, default: '' },
  mode: { type: String, enum: ['auto', 'manual'], default: 'auto' },
  manualPaymentInfo: { type: String, default: '' },
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
    doorUsers: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    pinned: { type: Boolean, default: false },
    tags: { type: [String], default: [] },
    visibility: { type: String, enum: ['public', 'unlisted'], default: 'public' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// Virtual author compatible con IPosteoBase
EventoSchema.virtual('author')
  .get(function() {
    return this.creator;
  })
  .set(function(val) {
    this.creator = val;
  });

export default mongoose.model<IEvento>('Evento', EventoSchema);

