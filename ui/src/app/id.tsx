import React, { FormEvent, useCallback, useMemo } from 'react';
import { createFileRoute, Outlet } from '@tanstack/react-router'
import { RouteUIDOwnerGuard } from '@/comp/Guards';

export const Route = createFileRoute('/id')({
  component: (): React.ReactNode => (
    <RouteUIDOwnerGuard param="id">
      <Outlet />
    </RouteUIDOwnerGuard>
  ),
});
