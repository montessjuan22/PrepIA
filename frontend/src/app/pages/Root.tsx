import { Outlet } from "react-router-dom";

export function Root() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0b0f19] text-gray-900 dark:text-slate-100 transition-colors duration-200">
      <Outlet />
    </div>
  );
}
