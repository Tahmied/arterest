'use client';

import { signOut, useSession } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { FiLogOut, FiMenu, FiPlus, FiSearch, FiUser, FiX } from 'react-icons/fi';
import ChatButton from './ChatButton';
import NotificationBell from './NotificationBell';

export default function Header() {
    const { data: session, status } = useSession();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            window.location.href = `/?search=${encodeURIComponent(searchQuery)}`;
        }
    };

    return (
        <header className="sticky top-0 z-50 bg-[var(--background)] border-b border-[var(--border)]">
            <div className="max-w-[1400px] mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2 shrink-0">
                        <span className="text-2xl font-bold text-[var(--primary)]">Arterest</span>
                    </Link>

                    {/* Search Bar - Desktop */}
                    <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-2xl relative">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search for ideas"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="search-bar w-full"
                        />
                    </form>

                    {/* Desktop Navigation */}
                    <nav className="hidden md:flex items-center gap-3">
                        {status === 'authenticated' && session?.user ? (
                            <>
                                <Link
                                    href="/create"
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--secondary)] hover:bg-[var(--card)] rounded-full transition-colors"
                                >
                                    <FiPlus className="w-5 h-5" />
                                    <span>Upload</span>
                                </Link>
                                <NotificationBell />
                                <ChatButton />
                                <div className="relative group">
                                    <Link
                                        href={`/profile/${session.user.username}`}
                                        className="flex items-center gap-2"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-[var(--primary)] flex items-center justify-center text-white font-medium overflow-hidden">
                                            {session.user.avatar ? (
                                                <img
                                                    src={session.user.avatar}
                                                    alt={session.user.username}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                session.user.username?.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                    </Link>
                                    {/* Dropdown */}
                                    <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                                        <Link
                                            href={`/profile/${session.user.username}`}
                                            className="flex items-center gap-2 px-4 py-3 hover:bg-[var(--card-hover)] transition-colors rounded-t-xl"
                                        >
                                            <FiUser className="w-4 h-4" />
                                            <span>View Profile</span>
                                        </Link>
                                        <button
                                            onClick={() => signOut()}
                                            className="flex items-center gap-2 px-4 py-3 w-full text-left hover:bg-[var(--card-hover)] text-[var(--destructive)] transition-colors rounded-b-xl"
                                        >
                                            <FiLogOut className="w-4 h-4" />
                                            <span>Log out</span>
                                        </button>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="btn-secondary">
                                    Log in
                                </Link>
                                <Link href="/register" className="btn-primary">
                                    Sign up
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* Mobile Quick Actions */}
                    <div className="md:hidden flex items-center gap-1">
                        {status === 'authenticated' && session?.user && (
                            <>
                                <Link
                                    href="/create"
                                    className="p-2 hover:bg-[var(--secondary)] rounded-full transition-colors"
                                >
                                    <FiPlus className="w-5 h-5" />
                                </Link>
                                <NotificationBell />
                                <ChatButton />
                                <Link
                                    href={`/profile/${session.user.username}`}
                                    className="w-8 h-8 rounded-full bg-[var(--primary)] flex items-center justify-center text-white text-sm font-medium overflow-hidden"
                                >
                                    {session.user.avatar ? (
                                        <img
                                            src={session.user.avatar}
                                            alt=""
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        session.user.username?.charAt(0).toUpperCase()
                                    )}
                                </Link>
                            </>
                        )}
                        <button
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                            className="p-2 hover:bg-[var(--secondary)] rounded-full transition-colors"
                        >
                            {mobileMenuOpen ? <FiX className="w-6 h-6" /> : <FiMenu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile Search */}
                <form onSubmit={handleSearch} className="md:hidden mt-3 relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)] w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search for ideas"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-bar w-full"
                    />
                </form>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="md:hidden bg-[var(--background)] border-t border-[var(--border)] animate-fade-in">
                    <nav className="flex flex-col p-4 gap-2">
                        {status === 'authenticated' && session?.user ? (
                            <>
                                <Link
                                    href={`/profile/${session.user.username}`}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--secondary)] rounded-xl transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    <FiUser className="w-5 h-5" />
                                    <span>My Profile</span>
                                </Link>
                                <button
                                    onClick={() => {
                                        signOut();
                                        setMobileMenuOpen(false);
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--secondary)] rounded-xl transition-colors text-[var(--destructive)]"
                                >
                                    <FiLogOut className="w-5 h-5" />
                                    <span>Log out</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <Link
                                    href="/login"
                                    className="flex items-center justify-center px-4 py-3 bg-[var(--secondary)] hover:bg-[var(--card)] rounded-xl transition-colors"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Log in
                                </Link>
                                <Link
                                    href="/register"
                                    className="flex items-center justify-center px-4 py-3 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl transition-colors text-white"
                                    onClick={() => setMobileMenuOpen(false)}
                                >
                                    Sign up
                                </Link>
                            </>
                        )}
                    </nav>
                </div>
            )}
        </header>
    );
}
