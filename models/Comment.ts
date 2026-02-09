import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IComment extends Document {
    _id: mongoose.Types.ObjectId;
    content: string;
    author: mongoose.Types.ObjectId;
    pin: mongoose.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const CommentSchema = new Schema<IComment>(
    {
        content: {
            type: String,
            required: [true, 'Comment content is required'],
            trim: true,
            maxlength: [1000, 'Comment cannot exceed 1000 characters'],
        },
        author: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        pin: {
            type: Schema.Types.ObjectId,
            ref: 'Pin',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
CommentSchema.index({ pin: 1, createdAt: -1 });

const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;
