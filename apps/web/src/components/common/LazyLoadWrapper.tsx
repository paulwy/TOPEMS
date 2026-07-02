import React, { Suspense } from 'react';
import { SkeletonScreen } from './SkeletonScreen';
import type { ComponentType, LazyExoticComponent } from 'react';

interface LazyLoadWrapperProps {
  lazyComponent: LazyExoticComponent<ComponentType<any>>;
  skeletonVariant?: 'dashboard' | 'list' | 'form' | 'detail';
}

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  lazyComponent: LazyComponent,
  skeletonVariant = 'dashboard',
}) => {
  return (
    <Suspense fallback={<SkeletonScreen variant={skeletonVariant} />}>
      <LazyComponent />
    </Suspense>
  );
};

export default LazyLoadWrapper;
