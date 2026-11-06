
import { Suspense } from "react";
import StaffShell from "@/components/staff/StaffShell";

const Loading = () => <div className="grid min-h-screen place-items-center text-muted">Loading...</div>;

// Suspense is needed because the shell reads the current URL (usePathname)
export default function StaffLayout({ children }) {
    return (
        <Suspense fallback={<Loading />}>
            <StaffShell>{children}</StaffShell>
        </Suspense>
    );
}

