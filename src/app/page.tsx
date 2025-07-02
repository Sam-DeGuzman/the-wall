'use client';
import React, { useState, useEffect, useRef } from 'react';
import ProfilePicture from '../components/ProfilePicture';
import { supabase } from './supabaseClient';
import { PhotoIcon } from '@heroicons/react/24/solid';
import Image from 'next/image';

// Utility to get relative time
function getRelativeTime(date: Date) {
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600)
        return `${Math.floor(diff / 60)} minute${
            Math.floor(diff / 60) === 1 ? '' : 's'
        } ago`;
    if (diff < 86400)
        return `${Math.floor(diff / 3600)} hour${
            Math.floor(diff / 3600) === 1 ? '' : 's'
        } ago`;
    return date.toLocaleDateString();
}

// Define the Post type
interface Post {
    id: string;
    author_user_id: string;
    message_text: string;
    created_at: string; // ISO string
    photo_url?: string;
}

export default function Home() {
    const [userId] = useState(1); // int8 user id
    const [profileName, setProfileName] = useState('');
    const [profileBio, setProfileBio] = useState('');
    const [postText, setPostText] = useState('');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [postsLoading, setPostsLoading] = useState(true);
    const maxChars = 280;
    const remaining = maxChars - postText.length;
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch posts from Supabase on mount
    useEffect(() => {
        const fetchPosts = async () => {
            setPostsLoading(true);
            const { data, error } = await supabase
                .from('Posts')
                .select('*')
                .order('created_at', { ascending: false });
            if (!error && data) {
                setPosts(data);
            }
            setPostsLoading(false);
        };
        fetchPosts();
    }, []);

    // Fetch profile name and bio from Users table when userId changes
    useEffect(() => {
        if (!userId) return;
        const fetchProfile = async () => {
            const { data, error } = await supabase
                .from('Users')
                .select('name, bio')
                .eq('id', userId);
            if (!error && data && data.length === 1) {
                setProfileName(data[0].name);
                setProfileBio(data[0].bio);
            } else {
                setProfileName('Unknown User');
                setProfileBio('');
            }
        };
        fetchProfile();
    }, [userId]);

    const handleShare = async () => {
        if (postText.trim() === '' || !userId) return;
        const author_user_id = userId;
        const message_text = postText;
        const timestamp = new Date().toISOString();
        let photo_url = undefined;
        if (photoFile) {
            const fileExt = photoFile.name.split('.').pop();
            const fileName = `${Date.now()}-${Math.random()
                .toString(36)
                .substring(2, 8)}.${fileExt}`;
            const { error: uploadError } = await supabase.storage
                .from('wall-photos')
                .upload(fileName, photoFile, {
                    cacheControl: '3600',
                    upsert: false,
                });
            if (uploadError) {
                console.error('Photo upload error:', uploadError);
            } else {
                const { data: publicUrlData } = supabase.storage
                    .from('wall-photos')
                    .getPublicUrl(fileName);
                photo_url = publicUrlData.publicUrl;
            }
        }
        const { data, error } = await supabase
            .from('Posts')
            .insert([
                {
                    author_user_id,
                    message_text,
                    timestamp,
                    photo_url,
                },
            ])
            .select();
        if (!error && data && data.length > 0) {
            setPosts([data[0], ...posts]);
            setPostText('');
            setPhotoFile(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
        } else {
            console.error('Supabase insert error:', error, 'Data:', data);
        }
        setLoading(false);
    };

    // Helper for previewing selected file name
    const renderPhotoUploadBox = () => (
        <div
            className='w-full border-2 border-dashed border-gray-300 rounded-xl bg-[#fafafa] flex flex-col items-center justify-center py-6 cursor-pointer hover:bg-gray-100 transition mb-2'
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
        >
            <PhotoIcon className='h-8 w-8 text-gray-400 mb-2' />
            <div className='text-gray-500 text-sm font-medium'>
                Click to add photo <span className='text-xs'>(optional)</span>
            </div>
            <div className='text-xs text-gray-400'>
                JPG, PNG, GIF up to 50MB
            </div>
            {photoFile && (
                <>
                    <div className='mt-2 text-xs text-gray-700'>
                        Selected: {photoFile.name}
                    </div>
                    <div className='w-full flex justify-center mt-2'>
                        <Image
                            src={URL.createObjectURL(photoFile)}
                            alt='Preview'
                            width={200}
                            height={128}
                            className='max-w-xs max-h-32 rounded-md border border-gray-200 shadow-sm object-contain'
                            onLoad={() =>
                                URL.revokeObjectURL(
                                    URL.createObjectURL(photoFile)
                                )
                            }
                        />
                    </div>
                </>
            )}
            <input
                type='file'
                accept='image/*'
                className='hidden'
                ref={fileInputRef}
                onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                        setPhotoFile(e.target.files[0]);
                    } else {
                        setPhotoFile(null);
                    }
                }}
                disabled={loading}
            />
        </div>
    );

    return (
        <div className='min-h-screen bg-[#f9f6f2] font-sans p-0 m-0'>
            {/* Top Bar */}
            <header
                className='w-full bg-[#2196f3] text-white py-2 px-6 font-bold text-lg shadow flex items-center rounded-b-lg'
                style={{ fontFamily: 'inherit' }}
            >
                The Wall
            </header>
            <main className='max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-[320px_1fr] gap-8 py-8 px-2'>
                {/* Sidebar */}
                <aside className='flex flex-col items-center md:items-start'>
                    <ProfilePicture size={180} />
                    <div className='mt-4 text-2xl font-extrabold text-gray-900'>
                        {profileName || 'Loading...'}
                    </div>

                    {profileBio && (
                        <blockquote className='italic text-gray-500 border-l-4 border-blue-200 pl-4 mb-4'>
                            {profileBio}
                        </blockquote>
                    )}
                    <div className='w-full max-w-[260px] border-2 border-gray-300 rounded-xl bg-[#f7f7f7] p-3 mb-2'>
                        <div
                            className='font-bold text-xs mb-1 bg-gray-100 rounded px-2 py-1 inline-block border border-gray-300'
                            style={{ borderStyle: 'dashed' }}
                        >
                            Information
                        </div>
                        <div className='text-sm mt-2'>
                            <div className='mb-1'>
                                <span className='font-semibold'>Networks</span>
                                <br />
                                Manila Bikers
                            </div>
                            <div>
                                <span className='font-semibold'>
                                    Current City
                                </span>
                                <br />
                                Manila, PH
                            </div>
                        </div>
                    </div>
                </aside>
                {/* Wall Feed */}
                <section className='flex-1'>
                    {/* Post Input Box */}
                    <div className='mb-6'>
                        <div className='relative'>
                            <textarea
                                className='w-full resize-none border-2 border-black rounded-2xl bg-white focus:ring-0 focus:outline-none text-gray-800 placeholder-gray-400 min-h-[80px] p-4 text-lg font-sans'
                                placeholder="What's on your mind?"
                                rows={3}
                                maxLength={maxChars}
                                value={postText}
                                onChange={(e) => setPostText(e.target.value)}
                            />
                            {renderPhotoUploadBox()}
                            {/* Character count and Share button */}
                            <div className='flex justify-between items-center mt-2'>
                                <span className='text-xs text-gray-400 ml-2'>
                                    {remaining} characters left
                                </span>
                                <button
                                    className={`bg-[#2196f3] text-white px-6 py-2 rounded-lg font-bold shadow border-2 border-black hover:bg-blue-700 transition-colors cursor-pointer ${
                                        loading
                                            ? 'opacity-60 cursor-not-allowed'
                                            : ''
                                    }`}
                                    style={{ fontFamily: 'inherit' }}
                                    onClick={handleShare}
                                    disabled={postText.trim() === '' || loading}
                                >
                                    {loading ? 'Sharing...' : 'Share'}
                                </button>
                            </div>
                        </div>
                    </div>
                    {/* Feed Section */}
                    <div className='mt-8'>
                        <h2 className='text-xl font-bold mb-4 text-gray-800'>
                            Posts
                        </h2>
                        {/* Feed items will go here */}
                        {postsLoading ? (
                            <div className='flex justify-center items-center py-8'>
                                <span className='text-gray-500 text-base animate-pulse'>
                                    Loading posts...
                                </span>
                            </div>
                        ) : posts.length === 0 ? (
                            <div className='bg-white border-2 border-gray-300 rounded-xl p-4 text-gray-700 text-base text-center'>
                                No posts yet. Share your thoughts above!
                            </div>
                        ) : (
                            posts.map((post) => (
                                <div
                                    key={post.id}
                                    className='bg-white border-2 border-gray-300 rounded-xl p-4 mb-4'
                                >
                                    <div className='flex items-center mb-2'>
                                        <ProfilePicture size={48} />
                                        <div className='ml-3'>
                                            <div className='font-bold text-gray-900'>
                                                {profileName}
                                            </div>
                                            <div className='text-xs text-gray-500'>
                                                {getRelativeTime(
                                                    new Date(post.created_at)
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className='text-gray-800 text-base'>
                                        {post.message_text}
                                    </div>
                                    {post.photo_url && (
                                        <div className='mb-2'>
                                            <Image
                                                src={post.photo_url}
                                                alt='Post photo'
                                                width={400}
                                                height={256}
                                                className='max-h-64 rounded-lg mx-auto object-contain'
                                            />
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </section>
            </main>
        </div>
    );
}
