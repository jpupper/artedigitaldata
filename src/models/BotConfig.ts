import mongoose, { Schema, Document } from 'mongoose';

export interface IBotConfig extends Document {
  key: string;
  value: any;
  updatedAt: Date;
}

const BotConfigSchema: Schema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Schema.Types.Mixed, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IBotConfig>('BotConfig', BotConfigSchema);

// Helper functions
export async function getBotConfig(key: string, defaultValue: any = null): Promise<any> {
  try {
    const doc = await mongoose.model<IBotConfig>('BotConfig').findOne({ key });
    return doc ? doc.value : defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function setBotConfig(key: string, value: any): Promise<void> {
  await mongoose.model<IBotConfig>('BotConfig').findOneAndUpdate(
    { key },
    { key, value },
    { upsert: true, new: true }
  );
}
