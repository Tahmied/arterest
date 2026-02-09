import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Comment from '@/models/Comment';
import Pin from '@/models/Pin';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET single pin
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        await connectDB();

        const pin = await Pin.findById(id)
            .populate('creator', 'username avatar bio followers following')
            .lean();

        if (!pin) {
            return NextResponse.json(
                { error: 'Pin not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(pin);
    } catch (error) {
        console.error('Error fetching pin:', error);
        return NextResponse.json(
            { error: 'Failed to fetch pin' },
            { status: 500 }
        );
    }
}

// PUT update pin
export async function PUT(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;
        const updates = await request.json();

        await connectDB();

        const pin = await Pin.findById(id);

        if (!pin) {
            return NextResponse.json(
                { error: 'Pin not found' },
                { status: 404 }
            );
        }

        if (pin.creator.toString() !== session.user.id) {
            return NextResponse.json(
                { error: 'Not authorized to update this pin' },
                { status: 403 }
            );
        }

        const updatedPin = await Pin.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        ).populate('creator', 'username avatar');

        return NextResponse.json(updatedPin);
    } catch (error) {
        console.error('Error updating pin:', error);
        return NextResponse.json(
            { error: 'Failed to update pin' },
            { status: 500 }
        );
    }
}

// DELETE pin
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { id } = await params;

        await connectDB();

        const pin = await Pin.findById(id);

        if (!pin) {
            return NextResponse.json(
                { error: 'Pin not found' },
                { status: 404 }
            );
        }

        if (pin.creator.toString() !== session.user.id) {
            return NextResponse.json(
                { error: 'Not authorized to delete this pin' },
                { status: 403 }
            );
        }

        // Delete associated comments
        await Comment.deleteMany({ pin: id });

        await Pin.findByIdAndDelete(id);

        return NextResponse.json({ message: 'Pin deleted successfully' });
    } catch (error) {
        console.error('Error deleting pin:', error);
        return NextResponse.json(
            { error: 'Failed to delete pin' },
            { status: 500 }
        );
    }
}
