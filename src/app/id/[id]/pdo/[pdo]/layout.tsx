import type { Metadata, ResolvedMetadata, ResolvingMetadata } from 'next';
import { PDORouteWrapper } from './components';

// https://nextjs.org/docs/app/api-reference/functions/generate-metadata#generatemetadata-function
export async function generateMetadata(
  {params}: {params: Promise<{ pdo: string }>},
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const pdo: string = (await params).pdo;
  const meta: ResolvedMetadata = (await parent);
  return {
    title: `%slab | ${pdo} pdo`,
    description: meta.description,
  };
}

export default function PDOLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <PDORouteWrapper>
      {children}
    </PDORouteWrapper>
  );
}
