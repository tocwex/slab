import type { Metadata, ResolvedMetadata, ResolvingMetadata } from 'next';
import { IDRouteWrapper } from '@/comp/IDRouteWrapper';

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
export async function generateMetadata(
  {params}: {params: Promise<{ id: string }>},
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const id: string = (await params).id;
  const meta: ResolvedMetadata = (await parent);
  return {
    title: `%slab | ${id}`,
    description: meta.description,
  };
}

export default function IDLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <IDRouteWrapper>
      {children}
    </IDRouteWrapper>
  );
}
