import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
    params: Promise<{ username: string }>;
}

// POST toggle follow
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const { username } = await params;
        const currentUserId = session.user.id;

        await connectDB();

        const targetUser = await User.findOne({ username: username.toLowerCase() });

        if (!targetUser) {
            return NextResponse.json(
                { error: 'User not found' },
                { status: 404 }
            );
        }

        if (targetUser._id.toString() === currentUserId) {
            return NextResponse.json(
                { error: 'Cannot follow yourself' },
                { status: 400 }
            );
        }

        const isFollowing = targetUser.followers.map(id => id.toString()).includes(currentUserId);

        if (isFollowing) {
            // Unfollow
            await User.findByIdAndUpdate(targetUser._id, {
                $pull: { followers: currentUserId },
            });
            await User.findByIdAndUpdate(currentUserId, {
                $pull: { following: targetUser._id },
            });
            // Remove notification
            await Notification.deleteOne({
                sender: currentUserId,
                recipient: targetUser._id,
                type: 'follow',
            });
        } else {
            // Follow
            await User.findByIdAndUpdate(targetUser._id, {
                $addToSet: { followers: currentUserId },
            });
            await User.findByIdAndUpdate(currentUserId, {
                $addToSet: { following: targetUser._id },
            });
            // Create notification
            await Notification.create({
                sender: currentUserId,
                recipient: targetUser._id,
                type: 'follow',
            });
        }

        const updatedUser = await User.findById(targetUser._id)
            .select('-password')
            .lean();

        return NextResponse.json({
            following: !isFollowing,
            followersCount: updatedUser?.followers.length || 0,
        });
    } catch (error) {
        console.error('Error toggling follow:', error);
        return NextResponse.json(
            { error: 'Failed to toggle follow' },
            { status: 500 }
        );
    }
}
