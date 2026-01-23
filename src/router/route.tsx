import { createBrowserRouter } from 'react-router-dom';
import Dashboard from '../pages/Dashboard';
import VideoPlayer from '../pages/VideoPlayer';
import Search from '../pages/Search';

export const router = createBrowserRouter([
    {
        path: '/',
        element: <Dashboard />,
    },
    {
        path: '/watch',
        element: <VideoPlayer />,
    },
    {
        path: '/search',
        element: <Search />,
    },
]);
