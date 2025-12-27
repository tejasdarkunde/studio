"use client";

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function SupervisorEditTraineeRedirect() {
    const router = useRouter();
    const { iitpNo } = useParams() as { iitpNo: string };

    useEffect(() => {
        if (iitpNo) {
            router.replace(`/admin/users/${iitpNo}/edit`);
        }
    }, [router, iitpNo]);

    return null;
}
