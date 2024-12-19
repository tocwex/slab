"use client";
import { useParams } from 'next/navigation';

export default function IDPage(): React.ReactNode {
  const params = useParams<{id: string}>();

  // TODO: Need "valid Urbit ID, also held in this wallet" guard
  // TODO: Add a link back to index page (or auto-redirect when wallet is disconnected

  return (
    <div className="main">
      <h1 className="text-4xl font-bold underline">
        {params.id} Profile
      </h1>
    </div>
  );
}
