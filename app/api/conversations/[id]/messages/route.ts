import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';

// Get global io instance
const getIO = (): SocketIOServer | null => {
    return (global as typeof globalThis & { io?: SocketIOServer }).io || null;
};

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET messages for a conversation
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '50');
        const before = searchParams.get('before');

        await connectDB();

        // Verify user is participant
        const conversation = await Conversation.findOne({
            _id: id,
            participants: session.user.id,
        });

        if (!conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Build query
        const query: Record<string, unknown> = { conversation: id };
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        const messages = await Message.find(query)
            .populate('sender', 'username avatar')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        // Mark messages as read
        await Message.updateMany(
            {
                conversation: id,
                sender: { $ne: session.user.id },
                read: false,
            },
            { read: true }
        );

        return NextResponse.json(messages.reverse());
    } catch (error) {
        console.error('Error fetching messages:', error);
        return NextResponse.json(
            { error: 'Failed to fetch messages' },
            { status: 500 }
        );
    }
}

// POST send a new message
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

        if (!content?.trim()) {
            return NextResponse.json(
                { error: 'Message content is required' },
                { status: 400 }
            );
        }

        await connectDB();

        // Verify user is participant
        const conversation = await Conversation.findOne({
            _id: id,
            participants: session.user.id,
        });

        if (!conversation) {
            return NextResponse.json(
                { error: 'Conversation not found' },
                { status: 404 }
            );
        }

        // Create message
        const message = await Message.create({
            conversation: id,
            sender: session.user.id,
            content: content.trim(),
        });

        // Update conversation
        await Conversation.findByIdAndUpdate(id, {
            lastMessage: message._id,
            lastMessageText: content.trim().substring(0, 100),
            lastMessageAt: new Date(),
        });

        // Populate sender info
        const populatedMessage = await Message.findById(message._id)
            .populate('sender', 'username avatar')
            .lean();

        // Get the other participant for WebSocket notification
        const otherParticipant = conversation.participants.find(
            (p: { toString: () => string }) => p.toString() !== session.user.id
        );

        // Emit via WebSocket if available
        const io = getIO();
        if (io) {
            // Send to conversation room
            io.to(`conversation:${id}`).emit('new-message', populatedMessage);

            // Send notification to the other user's personal channel
            if (otherParticipant) {
                io.to(`user:${otherParticipant}`).emit('new-message-notification', {
                    conversationId: id,
                    message: populatedMessage,
                });
            }
        }

        return NextResponse.json(populatedMessage, { status: 201 });
    } catch (error) {
        console.error('Error sending message:', error);
        return NextResponse.json(
            { error: 'Failed to send message' },
            { status: 500 }
        );
    }
}
