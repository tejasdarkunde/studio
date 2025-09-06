
"use client";

import { forwardRef } from 'react';

type CertificateProps = {
    studentName: string;
    courseName: string;
    date: string;
};

export const Certificate = forwardRef<HTMLDivElement, CertificateProps>(({ studentName, courseName, date }, ref) => {
    return (
        <div ref={ref} className="w-[1123px] h-[794px] bg-white p-12 flex flex-col items-center justify-center border-4 border-primary font-serif">
            <div className="w-full h-full border-2 border-primary flex flex-col items-center justify-center text-center p-8 relative">

                {/* Decorative Elements */}
                <div className="absolute top-4 left-4 h-16 w-16 border-t-2 border-l-2 border-accent"></div>
                <div className="absolute top-4 right-4 h-16 w-16 border-t-2 border-r-2 border-accent"></div>
                <div className="absolute bottom-4 left-4 h-16 w-16 border-b-2 border-l-2 border-accent"></div>
                <div className="absolute bottom-4 right-4 h-16 w-16 border-b-2 border-r-2 border-accent"></div>

                <p className="text-2xl text-muted-foreground tracking-widest uppercase">
                    Certificate of Achievement
                </p>

                <p className="text-lg mt-12">
                    This certificate is proudly presented to
                </p>

                <p className="text-6xl font-bold text-primary mt-6 tracking-wide">
                    {studentName}
                </p>

                <p className="text-lg mt-12">
                    for successfully completing the course
                </p>

                <p className="text-4xl font-semibold mt-6">
                    {courseName}
                </p>

                <div className="mt-auto flex justify-between w-full pt-12">
                    <div className="text-center">
                        <p className="border-t-2 border-muted-foreground pt-2 w-48 font-semibold">{date}</p>
                        <p className="text-sm text-muted-foreground">Date</p>
                    </div>
                    <div className="text-center">
                        <p className="border-t-2 border-muted-foreground pt-2 w-48 font-semibold">BSA Training Academy</p>
                        <p className="text-sm text-muted-foreground">Issuing Authority</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

Certificate.displayName = 'Certificate';
