/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            new URL(
                'https://oxryjnkkmqsswpluvzsm.supabase.co/storage/v1/object/public/wall-photos/**'
            ),
        ],
    },
};

export default nextConfig;
