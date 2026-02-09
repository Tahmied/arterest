import { CATEGORIES } from '@/lib/constants';
import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPin extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    description: string;
    imageUrl: string;
    creator: mongoose.Types.ObjectId;
    likes: mongoose.Types.ObjectId[];
    saves: mongoose.Types.ObjectId[];
    category: string;
    createdAt: Date;
    updatedAt: Date;
}

// Re-export for backward compatibility
export { CATEGORIES };

const PinSchema = new Schema<IPin>(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        description: {
            type: String,
            default: '',
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        imageUrl: {
            type: String,
            required: [true, 'Image URL is required'],
        },
        creator: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        likes: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        saves: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
        }],
        category: {
            type: String,
            default: 'For You',
            enum: CATEGORIES,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for faster queries
PinSchema.index({ creator: 1 });
PinSchema.index({ category: 1 });
PinSchema.index({ createdAt: -1 });

const Pin: Model<IPin> = mongoose.models.Pin || mongoose.model<IPin>('Pin', PinSchema);

export default Pin;
