import mongoose, { Schema, Document, Types } from 'mongoose';

export type NotificationType =
  | 'like_post'
  | 'like_recurso'
  | 'like_evento'
  | 'private_message'
  | 'ticket_purchased'
  | 'ticket_sold';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  type: NotificationType;
  read: boolean;
  actor?: Types.ObjectId;
  actorName?: string;
  actorAvatar?: string;
  resourceId?: string;
  resourceTitle?: string;
  resourceType?: string;
  message?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema: Schema = new Schema(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['like_post', 'like_recurso', 'like_evento', 'private_message', 'ticket_purchased', 'ticket_sold'],
      required: true,
    },
    read: { type: Boolean, default: false },
    actor: { type: Schema.Types.ObjectId, ref: 'User' },
    actorName: { type: String, default: '' },
    actorAvatar: { type: String, default: '' },
    resourceId: { type: String, default: '' },
    resourceTitle: { type: String, default: '' },
    resourceType: { type: String, default: '' },
    message: { type: String, default: '' },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

export default mongoose.model<INotification>('Notification', NotificationSchema);
