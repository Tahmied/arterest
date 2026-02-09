'use client';

import CategoryFilter from '@/components/CategoryFilter';
import MasonryGrid from '@/components/MasonryGrid';
import PinCard from '@/components/PinCard';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { FiLoader } from 'react-icons/fi';

interface Pin {
  _id: string;
  title: string;
  imageUrl: string;
  creator: {
    _id: string;
    username: string;
    avatar?: string;
  };
  likes: string[];
  saves: string[];
  category: string;
}

function HomeContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || '';

  const [pins, setPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('For You');

  const fetchPins = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedCategory !== 'For You') {
        params.append('category', selectedCategory);
      }
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      const response = await fetch(`/api/pins?${params.toString()}`);
      const data = await response.json();
      // Filter out pins without valid imageUrl
      const validPins = (data.pins || []).filter((pin: Pin) => pin.imageUrl && pin.imageUrl.length > 0);
      setPins(validPins);
    } catch (error) {
      console.error('Error fetching pins:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, searchQuery]);

  useEffect(() => {
    fetchPins();
  }, [fetchPins]);

  const handleLike = async (pinId: string) => {
    if (!session?.user) {
      window.location.href = '/login';
      return;
    }

    const userId = session.user.id;
    const pin = pins.find((p) => p._id === pinId);
    const isCurrentlyLiked = pin?.likes?.includes(userId);

    // Optimistic update
    setPins((prev) =>
      prev.map((p) =>
        p._id === pinId
          ? {
            ...p,
            likes: isCurrentlyLiked
              ? (p.likes || []).filter((id) => id !== userId)
              : [...(p.likes || []), userId],
          }
          : p
      )
    );

    try {
      await fetch(`/api/pins/${pinId}/like`, { method: 'POST' });
    } catch (error) {
      // Rollback on error
      setPins((prev) =>
        prev.map((p) =>
          p._id === pinId
            ? {
              ...p,
              likes: isCurrentlyLiked
                ? [...(p.likes || []), userId]
                : (p.likes || []).filter((id) => id !== userId),
            }
            : p
        )
      );
      console.error('Error liking pin:', error);
    }
  };

  const handleSave = async (pinId: string) => {
    if (!session?.user) {
      window.location.href = '/login';
      return;
    }

    const userId = session.user.id;
    const pin = pins.find((p) => p._id === pinId);
    const isCurrentlySaved = pin?.saves?.includes(userId);

    // Optimistic update
    setPins((prev) =>
      prev.map((p) =>
        p._id === pinId
          ? {
            ...p,
            saves: isCurrentlySaved
              ? (p.saves || []).filter((id) => id !== userId)
              : [...(p.saves || []), userId],
          }
          : p
      )
    );

    try {
      await fetch(`/api/pins/${pinId}/save`, { method: 'POST' });
    } catch (error) {
      // Rollback on error
      setPins((prev) =>
        prev.map((p) =>
          p._id === pinId
            ? {
              ...p,
              saves: isCurrentlySaved
                ? [...(p.saves || []), userId]
                : (p.saves || []).filter((id) => id !== userId),
            }
            : p
        )
      );
      console.error('Error saving pin:', error);
    }
  };

  return (
    <div className="max-w-[1800px] mx-auto px-4 py-6">
      {/* Category Filter */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Search Results Header */}
      {searchQuery && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Search results for &quot;{searchQuery}&quot;
          </h1>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <FiLoader className="w-10 h-10 animate-spin text-[var(--primary)]" />
          <p className="text-[var(--muted-foreground)]">Loading pins...</p>
        </div>
      ) : pins.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-xl font-medium">No pins found</p>
          <p className="text-[var(--muted-foreground)]">
            {searchQuery
              ? 'Try a different search term'
              : 'Be the first to add a pin!'}
          </p>
        </div>
      ) : (
        <MasonryGrid>
          {pins.map((pin) => (
            <PinCard
              key={pin._id}
              pin={pin}
              onLike={handleLike}
              onSave={handleSave}
            />
          ))}
        </MasonryGrid>
      )}
    </div>
  );
}

function HomeLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <FiLoader className="w-10 h-10 animate-spin text-[var(--primary)]" />
      <p className="text-[var(--muted-foreground)]">Loading...</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeLoading />}>
      <HomeContent />
    </Suspense>
  );
}
