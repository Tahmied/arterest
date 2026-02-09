'use client';

import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { FiArrowLeft, FiCamera, FiFileText, FiLoader, FiUser } from 'react-icons/fi';

export default function EditProfilePage() {
    const { data: session, status, update } = useSession();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatar, setAvatar] = useState('');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        if (session?.user) {
            setUsername(session.user.username || '');
            // Fetch full user data for bio and avatar
            fetch(`/api/users/${session.user.username}`)
                .then((res) => res.json())
                .then((data) => {
                    setBio(data.bio || '');
                    setAvatar(data.avatar || '');
                })
                .catch(console.error);
        }
    }, [session]);

    // Redirect if not authenticated
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <FiLoader className="w-10 h-10 animate-spin text-[var(--primary)]" />
            </div>
        );
    }

    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!validTypes.includes(file.type)) {
            setError('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.');
            return;
        }

        // Validate file size (max 5MB for avatars)
        if (file.size > 5 * 1024 * 1024) {
            setError('File too large. Maximum size is 5MB.');
            return;
        }

        setAvatarFile(file);
        setError('');

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const uploadAvatar = async (): Promise<string> => {
        if (!avatarFile) return avatar; // Return existing avatar if no new file

        setUploading(true);
        const formData = new FormData();
        formData.append('file', avatarFile);
        formData.append('type', 'avatar');

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to upload avatar');
        }

        const data = await response.json();
        setUploading(false);
        return data.url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!username.trim()) {
            setError('Username is required');
            return;
        }

        if (username.length < 3) {
            setError('Username must be at least 3 characters');
            return;
        }

        setLoading(true);

        try {
            // Upload avatar if a new file was selected
            const avatarUrl = await uploadAvatar();

            const response = await fetch('/api/users/update', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: username.trim(),
                    bio: bio.trim(),
                    avatar: avatarUrl,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            setSuccess('Profile updated successfully!');
            setAvatar(avatarUrl);
            setAvatarFile(null);
            setAvatarPreview(null);

            // Update session if username changed
            if (data.username !== session?.user.username) {
                await update({ username: data.username });
                router.push(`/profile/${data.username}`);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const displayAvatar = avatarPreview || avatar;

    return (
        <div className="max-w-xl mx-auto px-4 py-8">
            {/* Back Button */}
            <Link
                href={`/profile/${session?.user.username}`}
                className="flex items-center gap-2 mb-6 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
            >
                <FiArrowLeft className="w-5 h-5" />
                Back to profile
            </Link>

            <h1 className="text-3xl font-bold mb-8">Edit Profile</h1>

            <div className="card p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-xl text-[var(--destructive)] text-sm animate-fade-in">
                            {error}
                        </div>
                    )}

                    {/* Success Message */}
                    {success && (
                        <div className="p-4 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl text-[var(--success)] text-sm animate-fade-in">
                            {success}
                        </div>
                    )}

                    {/* Avatar Upload */}
                    <div className="flex flex-col items-center gap-4">
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="relative w-28 h-28 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-3xl font-bold overflow-hidden cursor-pointer group"
                        >
                            {displayAvatar ? (
                                <img
                                    src={displayAvatar}
                                    alt={username}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                username.charAt(0).toUpperCase() || 'U'
                            )}
                            {/* Hover overlay */}
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <FiCamera className="w-8 h-8 text-white" />
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-sm text-[var(--primary)] hover:text-[var(--primary-light)] transition-colors"
                        >
                            Change photo
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            onChange={handleFileSelect}
                            className="hidden"
                        />
                        <p className="text-xs text-[var(--muted)]">
                            JPG, PNG, GIF or WebP (max 5MB)
                        </p>
                    </div>

                    {/* Username */}
                    <div>
                        <label htmlFor="username" className="flex items-center gap-2 text-sm font-medium mb-2">
                            <FiUser className="w-4 h-4" />
                            Username
                        </label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Your username"
                            className="input"
                            maxLength={30}
                            required
                        />
                        <p className="text-xs text-[var(--muted)] mt-1">
                            {username.length}/30 characters
                        </p>
                    </div>

                    {/* Bio */}
                    <div>
                        <label htmlFor="bio" className="flex items-center gap-2 text-sm font-medium mb-2">
                            <FiFileText className="w-4 h-4" />
                            Bio
                        </label>
                        <textarea
                            id="bio"
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself"
                            className="input min-h-[120px] rounded-2xl resize-none"
                            maxLength={500}
                        />
                        <p className="text-xs text-[var(--muted)] mt-1">
                            {bio.length}/500 characters
                        </p>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || uploading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading || uploading ? (
                            <>
                                <FiLoader className="w-5 h-5 animate-spin" />
                                {uploading ? 'Uploading...' : 'Saving...'}
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
