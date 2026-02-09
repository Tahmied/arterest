import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import Pin from '@/models/Pin';
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
        const userId = session.user.id;

        await connectDB();

        const pin = await Pin.findById(id);

        if (!pin) {
            return NextResponse.json(
                { error: 'Pin not found' },
                { status: 404 }
            );
        }

        const isLiked = pin.likes.some((likeId: { toString: () => string }) => likeId.toString() === userId);

        if (isLiked) {
            // Unlike
            await Pin.findByIdAndUpdate(id, {
                $pull: { likes: userId },
            });
            // Remove notification
            await Notification.deleteOne({
                sender: userId,
                recipient: pin.creator,
                type: 'like',
                pin: id,
            });
        } else {
            // Like
            await Pin.findByIdAndUpdate(id, {
                $addToSet: { likes: userId },
            });
            // Create notification (only if not own pin)
            if (pin.creator.toString() !== userId) {
                const notification = await Notification.create({
                    sender: userId,
                    recipient: pin.creator,
                    type: 'like',
                    pin: id,
                });

                // Send real-time notification via WebSocket
                const io = getIO();
                if (io) {
                    io.to(`user:${pin.creator}`).emit('new-notification', {
                        ...notification.toObject(),
                        sender: { _id: userId, username: session.user.username },
                        pin: { _id: id, title: pin.title },
                    });
                }
            }
        }

        const updatedPin = await Pin.findById(id)
            .populate('creator', 'username avatar')
            .lean();

        return NextResponse.json({
            liked: !isLiked,
            likesCount: updatedPin?.likes.length || 0,
            pin: updatedPin,
        });
    } catch (error) {
        console.error('Error liking pin:', error);
        return NextResponse.json(
            { error: 'Failed to like pin' },
            { status: 500 }
        );
    }
}
