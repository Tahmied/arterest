import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Pin from '@/models/Pin';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST toggle save on pin
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

        const isSaved = pin.saves.map(id => id.toString()).includes(userId);

        if (isSaved) {
            // Unsave
            await Pin.findByIdAndUpdate(id, {
                $pull: { saves: userId },
            });
        } else {
            // Save
            await Pin.findByIdAndUpdate(id, {
                $addToSet: { saves: userId },
            });
        }

        const updatedPin = await Pin.findById(id)
            .populate('creator', 'username avatar')
            .lean();

        return NextResponse.json({
            saved: !isSaved,
            savesCount: updatedPin?.saves.length || 0,
            pin: updatedPin,
        });
    } catch (error) {
        console.error('Error toggling save:', error);
        return NextResponse.json(
            { error: 'Failed to toggle save' },
            { status: 500 }
        );
    }
}
