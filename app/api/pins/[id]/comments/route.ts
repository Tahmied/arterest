import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET comments for a pin
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;

        await connectDB();

        const comments = await Comment.find({ pin: id })
            .populate('author', 'username avatar')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(comments);
    } catch (error) {
        console.error('Error fetching comments:', error);
        return NextResponse.json(
            { error: 'Failed to fetch comments' },
            { status: 500 }
        );
    }
}

// POST add a comment to a pin
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const { content } = await request.json();

        if (!content || !content.trim()) {
            return NextResponse.json(
                { error: 'Comment content is required' },
                { status: 400 }
            );
        }

        await connectDB();

        const comment = await Comment.create({
            content: content.trim(),
            author: session.user.id,
            pin: id,
        });

        const populatedComment = await Comment.findById(comment._id)
            .populate('author', 'username avatar')
            .lean();

        return NextResponse.json(populatedComment, { status: 201 });
    } catch (error) {
        console.error('Error adding comment:', error);
        return NextResponse.json(
            { error: 'Failed to add comment' },
            { status: 500 }
        );
    }
}
