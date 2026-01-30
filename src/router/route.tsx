import { createBrowserRouter, Outlet, Navigate } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import VideoPlayer from '../pages/VideoPlayer';
import Search from '../pages/Search';
import Browse from '../pages/Browse';
import MediaDetail from '../pages/MediaDetail';
import ServerLogin from '../pages/ServerLogin';
import AppLayout from '../components/AppLayout';
import { useServer } from '../contexts/ServerContext';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const { serverUrl } = useServer();

    if (!serverUrl) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}

// Layout wrapper component
function LayoutWrapper() {
    return (
        <AppLayout>
            <Outlet />
        </AppLayout>
    );
}

export const router = createBrowserRouter([
    {
        path: '/login',
        element: <ServerLogin />,
    },
    {
        path: '/watch',
        element: (
            <ProtectedRoute>
                <VideoPlayer />
            </ProtectedRoute>
        ),
    },
    {
        path: '/',
        element: (
            <ProtectedRoute>
                <LayoutWrapper />
            </ProtectedRoute>
        ),
        children: [
            {
                index: true,
                element: <Browse />,
            },
            {
                path: 'dashboard',
                element: <Dashboard />,
            },
            {
                path: 'search',
                element: <Search />,
            },
            {
                path: 'browse',
                element: <Browse />,
            },
            {
                path: 'discover',
                element: <Browse />,
            },
            {
                path: 'movie/:id',
                element: <MediaDetail />,
            },
            {
                path: 'series/:id',
                element: <MediaDetail />,
            },
            {
                path: 'tv/:id',
                element: <MediaDetail />,
            },
        ],
    },
]);
