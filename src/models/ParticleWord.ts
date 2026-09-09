import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IParticleWord extends Document {
  word: string;
  addedBy: {
    userId?: Types.ObjectId;
    username: string;
    displayName?: string;
    avatar?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ParticleWordSchema: Schema = new Schema(
  {
    word: { type: String, required: true, trim: true, uppercase: true, unique: true },
    addedBy: {
      userId: { type: Schema.Types.ObjectId, ref: 'User', required: false },
      username: { type: String, default: 'Anónimo' },
      displayName: { type: String, default: 'Anónimo' },
      avatar: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

ParticleWordSchema.index({ word: 1 });
ParticleWordSchema.index({ 'addedBy.username': 1 });

export default mongoose.model<IParticleWord>('ParticleWord', ParticleWordSchema);
