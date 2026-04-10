import Link from "next/link";

export const metadata = { title: "Sign-in Error — NeetcodeSRS" };

const errorMessages: Record<string, { title: string; description: string }> = {
  Configuration: {
    title: "Server Configuration Error",
    description:
      "The authentication provider is not configured correctly. If you're the site owner, check that AUTH_SECRET, AUTH_GITHUB_ID, and AUTH_GITHUB_SECRET environment variables are set.",
  },
  AccessDenied: {
    title: "Access Denied",
    description: "You do not have permission to sign in. If you believe this is a mistake, please contact the site owner.",
  },
  Verification: {
    title: "Verification Error",
    description: "The sign-in link has expired or has already been used. Please try signing in again.",
  },
};

const fallback = {
  title: "Authentication Error",
  description: "Something went wrong during sign-in. Please try again.",
};

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const { title, description } = errorMessages[error ?? ""] ?? fallback;

  return (
    <div className="flex flex-col items-center justify-center py-24">
      <div className="w-full max-w-md rounded-lg border border-border bg-muted p-8 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">{description}</p>
        {error && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            Error code: {error}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/api/auth/signin"
            className="inline-flex h-9 items-center rounded-md bg-accent px-4 text-sm text-accent-foreground transition-colors duration-150 hover:opacity-90"
          >
            Try Again
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-md border border-border px-4 text-sm text-foreground transition-colors duration-150 hover:bg-muted"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}
