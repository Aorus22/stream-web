import { createBrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard/Page';
import VideoPlayer from '../pages/VideoPlayer/Page';
import Search from '../pages/Search/Page';
import Browse from '../pages/Browser/Page';
import MediaDetail from '../pages/MediaDetail/Page';
import ServerLogin from '../pages/ServerLogin/Page';
import CustomProviderPage from '../pages/CustomProvider/Page';
import FullHtmlPreviewPage from '../pages/CustomProvider/FullHtmlPreview';
import { ProtectedRoute, LayoutWrapper } from './RouteWrappers';

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
        path: '/custom-provider/preview/:encodedHtml',
        element: (
            <ProtectedRoute>
                <FullHtmlPreviewPage />
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
                path: 'custom-provider',
                element: <CustomProviderPage />,
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
