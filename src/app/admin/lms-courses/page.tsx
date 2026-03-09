
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function LmsCoursesRedirectPage() {
    const router = useRouter();
    useEffect(() => {
        router.replace('/LMS/admin/courses');
    }, [router]);

    return (
        <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
            <div className="flex items-center gap-4 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Redirecting to the new LMS course management page...</p>
            </div>
        </div>
    );
}
