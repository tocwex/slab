import type { Metadata, ResolvedMetadata, ResolvingMetadata } from 'next';
import { SyndicateRouteWrapper } from './components';

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
export async function generateMetadata(
  {params}: {params: Promise<{ sy: string }>},
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const sy: string = (await params).sy;
  const meta: ResolvedMetadata = (await parent);
  return {
    title: `%slab | ${sy} syndicate`,
    description: meta.description,
  };
}

export default function SyndicateLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <SyndicateRouteWrapper>
      {children}
    </SyndicateRouteWrapper>
  );
}
