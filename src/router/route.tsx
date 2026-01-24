import { createBrowserRouter, Outlet } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import VideoPlayer from '../pages/VideoPlayer';
import Search from '../pages/Search';
import Browse from '../pages/Browse';
import MediaDetail from '../pages/MediaDetail';
import AppLayout from '../components/AppLayout';

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
        path: '/',
        element: <LayoutWrapper />,
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
    {
        path: '/watch',
        element: <VideoPlayer />,
    },
]);
