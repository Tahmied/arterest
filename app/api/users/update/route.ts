import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

// PUT update user profile
export async function PUT(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { username, bio, avatar } = await request.json();

        await connectDB();

        // Check if username is already taken (if changed)
        if (username && username.toLowerCase() !== session.user.username) {
            const existingUser = await User.findOne({
                username: username.toLowerCase(),
                _id: { $ne: session.user.id },
            });

            if (existingUser) {
                return NextResponse.json(
                    { error: 'Username is already taken' },
                    { status: 400 }
                );
            }
        }

        const updateData: Record<string, string> = {};
        if (username) updateData.username = username.toLowerCase();
        if (bio !== undefined) updateData.bio = bio;
        if (avatar !== undefined) updateData.avatar = avatar;

        const updatedUser = await User.findByIdAndUpdate(
            session.user.id,
            { $set: updateData },
            { new: true }
        ).select('-password');

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Error updating profile:', error);
        return NextResponse.json(
            { error: 'Failed to update profile' },
            { status: 500 }
        );
    }
}
