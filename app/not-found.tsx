import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 text-center">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
        <h1 className="text-4xl font-extrabold text-indigo-600 mb-2 font-mono">404</h1>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Page or Link Not Found</h2>
        <p className="text-sm text-slate-500 mb-6">
          The link or profile you are looking for does not exist, has expired, or is inactive.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-sm"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
