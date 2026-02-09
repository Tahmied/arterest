import connectDB from '@/lib/mongodb';
import Pin from '@/models/Pin';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ username: string }>;
}

// GET user's pins
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

        const pins = await Pin.find({ creator: user._id })
            .populate('creator', 'username avatar')
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json(pins);
    } catch (error) {
        console.error('Error fetching user pins:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user pins' },
            { status: 500 }
        );
    }
}
