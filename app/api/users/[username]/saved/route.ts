import connectDB from '@/lib/mongodb';
import Pin from '@/models/Pin';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ username: string }>;
}

// GET user's saved pins
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { username } = await params;

        await connectDB();

        const user = await User.findOne({ username: username.toLowerCase() });

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        const savedPins = await Pin.find({ saves: user._id })
            .populate('creator', 'username avatar')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(savedPins);
    } catch (error) {
        console.error('Error fetching saved pins:', error);
        return NextResponse.json(
            { error: 'Failed to fetch saved pins' },
            { status: 500 }
        );
    }
}
