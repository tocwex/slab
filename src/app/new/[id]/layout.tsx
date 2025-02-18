import type { Metadata, ResolvedMetadata, ResolvingMetadata } from 'next';
import { RouteUIDValidGuard } from '@/comp/Guards';

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
export async function generateMetadata(
  {params}: {params: Promise<{ id: string }>},
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const id: string = (await params).id;
  const meta: ResolvedMetadata = (await parent);
  return {
    title: `%slab | ${id} -> syndicate`,
    description: meta.description,
  };
}

export default function NewLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <RouteUIDValidGuard param="id">
      {children}
    </RouteUIDValidGuard>
  );
}
