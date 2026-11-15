import { ModuleSkeleton } from "./loading/SkeletonLayouts";

export function PageLoader() {
  return <div className="p-1 animate-in fade-in duration-200"><ModuleSkeleton /></div>;
}

export default PageLoader;
