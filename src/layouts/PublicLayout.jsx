import { Outlet } from 'react-router-dom';

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-linen text-ink">
      <main>
        <Outlet />
      </main>
    </div>
  );
}
