import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import type { Metadata } from 'next';
import { prisma } from '@/lib/db';
import {
  Globe,
  User,
  ExternalLink,
  Scissors,
} from 'lucide-react';
import {
  TwitterIcon,
  GithubIcon,
  LinkedinIcon,
  InstagramIcon,
  YoutubeIcon,
} from '@/components/SocialIcons';

interface BioPageProps {
  params: Promise<{ username: string }> | { username: string };
}

export async function generateMetadata({
  params,
}: BioPageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const rawUsername = resolvedParams?.username;
  if (!rawUsername) return { title: 'Bio Not Found' };

  const username = rawUsername.toLowerCase().trim();
  const profile = await prisma.profile.findUnique({
    where: { username },
  });

  if (!profile) {
    return { title: 'Profile Not Found — Snip.ly' };
  }

  const name = profile.displayName || `@${profile.username}`;
  return {
    title: `${name} | Links`,
    description: profile.bio || `Check out ${name}'s verified links on Snip.ly`,
  };
}

export default async function PublicBioPage({ params }: BioPageProps) {
  const resolvedParams = await params;
  const rawUsername = resolvedParams?.username;

  if (!rawUsername) {
    notFound();
  }

  const username = rawUsername.toLowerCase().trim();

  const profile = await prisma.profile.findUnique({
    where: { username },
  });

  if (!profile) {
    notFound();
  }

  // Get active links marked for bio
  const links = await prisma.link.findMany({
    where: {
      userId: profile.userId,
      showOnBio: true,
      isActive: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const socialLinks = (profile.socialLinks as Record<string, string>) || {};

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-indigo-50/20 to-slate-50 flex flex-col items-center justify-between px-4 py-12">
      <div className="w-full max-w-md mx-auto flex-1 flex flex-col items-center">
        {/* Profile Card / Header */}
        <div className="text-center w-full mb-8">
          {/* Avatar */}
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 mx-auto overflow-hidden flex items-center justify-center shadow-lg shadow-indigo-100/70 p-1 mb-4 border-2 border-white">
            {profile.avatarUrl ? (
              <Image
                src={profile.avatarUrl}
                alt={profile.displayName || profile.username}
                width={96}
                height={96}
                className="w-full h-full object-cover rounded-full"
                unoptimized
              />
            ) : (
              <User className="w-12 h-12 text-white" />
            )}
          </div>

          {/* Name & Username */}
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {profile.displayName || profile.username}
          </h1>
          <p className="text-sm font-medium text-indigo-600 font-mono mt-0.5">
            @{profile.username}
          </p>

          {/* Bio text */}
          {profile.bio && (
            <p className="text-xs text-slate-600 mt-3 max-w-xs mx-auto leading-relaxed">
              {profile.bio}
            </p>
          )}

          {/* Social Links Row */}
          {socialLinks && Object.values(socialLinks).some((v) => Boolean(v)) && (
            <div className="flex items-center justify-center gap-3 mt-4 text-slate-500">
              {socialLinks.twitter && (
                <a
                  href={socialLinks.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:scale-105 shadow-sm transition-all"
                  aria-label="Twitter"
                >
                  <TwitterIcon size={16} />
                </a>
              )}
              {socialLinks.github && (
                <a
                  href={socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:scale-105 shadow-sm transition-all"
                  aria-label="GitHub"
                >
                  <GithubIcon size={16} />
                </a>
              )}
              {socialLinks.linkedin && (
                <a
                  href={socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:scale-105 shadow-sm transition-all"
                  aria-label="LinkedIn"
                >
                  <LinkedinIcon size={16} />
                </a>
              )}
              {socialLinks.instagram && (
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:scale-105 shadow-sm transition-all"
                  aria-label="Instagram"
                >
                  <InstagramIcon size={16} />
                </a>
              )}
              {socialLinks.youtube && (
                <a
                  href={socialLinks.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:scale-105 shadow-sm transition-all"
                  aria-label="YouTube"
                >
                  <YoutubeIcon size={16} />
                </a>
              )}
              {socialLinks.website && (
                <a
                  href={socialLinks.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-white border border-slate-100 text-slate-600 hover:text-indigo-600 hover:scale-105 shadow-sm transition-all"
                  aria-label="Website"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Links List */}
        <div className="w-full space-y-3">
          {links.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100 shadow-sm text-slate-400 text-xs">
              No links available at the moment.
            </div>
          ) : (
            links.map((link) => (
              <a
                key={link.id}
                href={`/s/${link.shortCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex items-center justify-between p-4 bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-indigo-300 rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-50 transition-colors">
                    {link.faviconUrl ? (
                      <Image
                        src={link.faviconUrl}
                        alt=""
                        width={18}
                        height={18}
                        className="w-4.5 h-4.5 object-contain"
                        unoptimized
                      />
                    ) : (
                      <Globe className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <span className="font-semibold text-slate-800 group-hover:text-indigo-600 text-sm block truncate transition-colors">
                      {link.bioTitle || link.title || `/s/${link.shortCode}`}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono truncate block">
                      /s/{link.shortCode}
                    </span>
                  </div>
                </div>

                <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
              </a>
            ))
          )}
        </div>
      </div>

      {/* Powered by Snip.ly footer */}
      <footer className="mt-12 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200/60 shadow-sm text-xs font-medium text-slate-600 hover:text-indigo-600 transition-colors"
        >
          <div className="w-4 h-4 rounded-md bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center">
            <Scissors className="w-2.5 h-2.5 text-white" />
          </div>
          Create your own free <span className="font-semibold text-slate-900">Snip.ly</span> Bio
        </Link>
      </footer>
    </div>
  );
}
