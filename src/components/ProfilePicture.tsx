import React from 'react';
import Image from 'next/image';

export default function ProfilePicture({ size = 164 }: { size?: number }) {
    return (
        <Image
            src='/images/profile.webp'
            alt='Profile'
            width={size}
            height={size}
            className={`rounded-full border-4 border-white shadow-lg object-cover`}
            style={{
                borderRadius: 0,
                objectFit: 'cover',
                border: '4px solid #fff',
                background: '#e5e7eb',
                display: 'block',
            }}
        />
    );
}
