import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ITicket extends Document {
  event: Types.ObjectId;
  code: string;
  owner?: Types.ObjectId;
  ownerName?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  qrData: string;
  redeemed: boolean;
  redeemedAt?: Date;
  paymentId?: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'free';
  amountPaid?: number;
  createdAt: Date;
  updatedAt: Date;
}

const TicketSchema: Schema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Evento', required: true, index: true },
    code: { type: String, required: true, unique: true, index: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: false },
    ownerName: { type: String, default: '' },
    ownerEmail: { type: String, default: '' },
    ownerPhone: { type: String, default: '' },
    qrData: { type: String, required: true },
    redeemed: { type: Boolean, default: false },
    redeemedAt: { type: Date, required: false },
    paymentId: { type: String, default: '' },
    paymentStatus: { type: String, enum: ['pending', 'completed', 'failed', 'free'], default: 'pending' },
    amountPaid: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Compound index for faster queries
TicketSchema.index({ event: 1, redeemed: 1 });
TicketSchema.index({ event: 1, code: 1 });

export default mongoose.model<ITicket>('Ticket', TicketSchema);
