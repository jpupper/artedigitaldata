import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IVisualEffect extends Document {
  title: string;
  author: Types.ObjectId;
  flyerWords: any[];
  timelineLayers?: any[];
  timelineDuration?: number;
  hasTimeline?: boolean;
  config?: any;
  isDefaultFront?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const VisualEffectSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    flyerWords: { type: Array, default: [] },
    timelineLayers: { type: Array, default: [] },
    timelineDuration: { type: Number, default: 10.0 },
    hasTimeline: { type: Boolean, default: false },
    config: { type: Object, default: {} },
    isDefaultFront: { type: Boolean, default: false },
  },
  { timestamps: true }
);

VisualEffectSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model<IVisualEffect>('VisualEffect', VisualEffectSchema);
