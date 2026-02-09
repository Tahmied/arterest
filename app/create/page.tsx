'use client';

import { CATEGORIES } from '@/lib/constants';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { FiLoader, FiUpload, FiX } from 'react-icons/fi';

export default function CreatePinPage() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [category, setCategory] = useState('For You');
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

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

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('File too large. Maximum size is 10MB.');
            return;
        }

        setImageFile(file);
        setError('');

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setImagePreview(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            const input = fileInputRef.current;
            if (input) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                input.files = dataTransfer.files;
                handleFileSelect({ target: input } as React.ChangeEvent<HTMLInputElement>);
            }
        }
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
    };

    const clearImage = () => {
        setImageFile(null);
        setImagePreview(null);
        setImageUrl('');
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const uploadFile = async (): Promise<string> => {
        if (!imageFile) throw new Error('No file selected');

        setUploading(true);
        const formData = new FormData();
        formData.append('file', imageFile);
        formData.append('type', 'pin');

        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to upload image');
        }

        const data = await response.json();
        setUploading(false);
        return data.url;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        if (!imageFile) {
            setError('Please upload an image');
            return;
        }

        setLoading(true);

        try {
            // First upload the image
            const uploadedUrl = await uploadFile();

            // Then create the pin
            const response = await fetch('/api/pins', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: title.trim(),
                    description: description.trim(),
                    imageUrl: uploadedUrl,
                    category,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create pin');
            }

            const pin = await response.json();
            router.push(`/pin/${pin._id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong');
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Create a Pin</h1>

            <div className="card p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Error Message */}
                    {error && (
                        <div className="p-4 bg-[var(--destructive)]/10 border border-[var(--destructive)]/20 rounded-xl text-[var(--destructive)] text-sm animate-fade-in flex items-center justify-between">
                            {error}
                            <button type="button" onClick={() => setError('')}>
                                <FiX className="w-4 h-4" />
                            </button>
                        </div>
                    )}

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Image Upload Area */}
                        <div>
                            <label className="block text-sm font-medium mb-2">
                                Image <span className="text-[var(--destructive)]">*</span>
                            </label>
                            <div className="relative">
                                {imagePreview ? (
                                    <div className="relative rounded-2xl overflow-hidden bg-[var(--secondary)]">
                                        <img
                                            src={imagePreview}
                                            alt="Preview"
                                            className="w-full max-h-[400px] object-contain"
                                        />
                                        <button
                                            type="button"
                                            onClick={clearImage}
                                            className="absolute top-3 right-3 p-2 bg-[var(--card)] rounded-full hover:bg-[var(--card-hover)] transition-colors"
                                        >
                                            <FiX className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        className="border-2 border-dashed border-[var(--border)] rounded-2xl p-8 text-center bg-[var(--secondary)] cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--card)] transition-all min-h-[300px] flex flex-col items-center justify-center"
                                    >
                                        <FiUpload className="w-12 h-12 mx-auto mb-4 text-[var(--primary)]" />
                                        <p className="text-[var(--foreground)] font-medium mb-2">
                                            Click to upload or drag and drop
                                        </p>
                                        <p className="text-sm text-[var(--muted-foreground)]">
                                            JPG, PNG, GIF or WebP (max 10MB)
                                        </p>
                                    </div>
                                )}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />
                            </div>
                        </div>

                        {/* Form Fields */}
                        <div className="space-y-5">
                            {/* Title */}
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium mb-2">
                                    Title <span className="text-[var(--destructive)]">*</span>
                                </label>
                                <input
                                    id="title"
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Add a title"
                                    className="input"
                                    maxLength={100}
                                    required
                                />
                                <p className="text-xs text-[var(--muted)] mt-1 text-right">
                                    {title.length}/100
                                </p>
                            </div>

                            {/* Description */}
                            <div>
                                <label htmlFor="description" className="block text-sm font-medium mb-2">
                                    Description
                                </label>
                                <textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Tell everyone what your Pin is about"
                                    className="input min-h-[120px] rounded-2xl resize-none"
                                    maxLength={2000}
                                />
                                <p className="text-xs text-[var(--muted)] mt-1 text-right">
                                    {description.length}/2000
                                </p>
                            </div>

                            {/* Category */}
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium mb-2">
                                    Category
                                </label>
                                <select
                                    id="category"
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                    className="input appearance-none cursor-pointer"
                                >
                                    {CATEGORIES.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || uploading || !title.trim() || !imageFile}
                                className="btn-primary w-full flex items-center justify-center gap-2"
                            >
                                {loading || uploading ? (
                                    <>
                                        <FiLoader className="w-5 h-5 animate-spin" />
                                        {uploading ? 'Uploading...' : 'Creating...'}
                                    </>
                                ) : (
                                    'Create Pin'
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
