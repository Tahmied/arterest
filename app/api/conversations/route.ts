import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import Message from '@/models/Message';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// GET list user's conversations
export async function GET() {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        await connectDB();

        const conversations = await Conversation.find({
            participants: session.user.id,
        })
            .populate('participants', 'username avatar')
            .sort({ lastMessageAt: -1, updatedAt: -1 })
            .lean();

        // Get unread count for each conversation
        const conversationsWithUnread = await Promise.all(
            conversations.map(async (conv) => {
                const unreadCount = await Message.countDocuments({
                    conversation: conv._id,
                    sender: { $ne: session.user.id },
                    read: false,
                });
                return {
                    ...conv,
                    unreadCount,
                };
            })
        );

        return NextResponse.json(conversationsWithUnread);
    } catch (error) {
        console.error('Error fetching conversations:', error);
        return NextResponse.json(
            { error: 'Failed to fetch conversations' },
            { status: 500 }
        );
    }
}

// POST create new conversation or get existing
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { participantId } = await request.json();

        if (!participantId) {
            return NextResponse.json(
                { error: 'Participant ID is required' },
                { status: 400 }
            );
        }

        if (participantId === session.user.id) {
            return NextResponse.json(
                { error: 'Cannot start conversation with yourself' },
                { status: 400 }
            );
        }

        await connectDB();

        // Check if conversation already exists
        let conversation = await Conversation.findOne({
            participants: { $all: [session.user.id, participantId] },
        }).populate('participants', 'username avatar');

        if (!conversation) {
            // Create new conversation
            conversation = await Conversation.create({
                participants: [session.user.id, participantId],
            });
            conversation = await Conversation.findById(conversation._id)
                .populate('participants', 'username avatar');
        }

        return NextResponse.json(conversation);
    } catch (error) {
        console.error('Error creating conversation:', error);
        return NextResponse.json(
            { error: 'Failed to create conversation' },
            { status: 500 }
        );
    }
}
