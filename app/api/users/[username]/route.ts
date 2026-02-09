import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ username: string }>;
}

// GET user profile
export async function GET(request: NextRequest, { params }: RouteParams) {
    try {
        const { username } = await params;

        await connectDB();

        const user = await User.findOne({ username: username.toLowerCase() })
            .select('-password')
            .populate('followers', 'username avatar')
            .populate('following', 'username avatar')
            .lean();

        if (!user) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        return NextResponse.json(
            { error: 'Failed to fetch user' },
            { status: 500 }
        );
    }
}
