import React, { Suspense } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { App } from 'antd';
import AppLayout from './Layout.tsx';
import LoadingSpinner from '../components/LoadingSpinner.tsx';
import ProtectedRoute from '../components/ProtectedRoute';

// 懒加载页面组件
const Home = React.lazy(() => import('../pages/Home'));
const About = React.lazy(() => import('../pages/About'));
const Contact = React.lazy(() => import('../pages/Contact'));
const TokenList = React.lazy(() => import('../pages/TokenList'));
const TokenMarket = React.lazy(() => import('../pages/TokenMarket'));
const Login = React.lazy(() => import('../pages/Login'));
const NotFound = React.lazy(() => import('../pages/NotFound'));

const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <Login />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    errorElement: (
      <Suspense fallback={<LoadingSpinner />}>
        <NotFound />
      </Suspense>
    ),
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Home />
          </Suspense>
        ),
      },
      {
        path: 'about',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <About />
          </Suspense>
        ),
      },
      {
        path: 'contact',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <Contact />
          </Suspense>
        ),
      },
      {
        path: 'token-list',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <TokenList />
          </Suspense>
        ),
      },
      {
        path: 'token-market',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <TokenMarket />
          </Suspense>
        ),
      },
    ],
  },
]);

const AppRouter: React.FC = () => {
  return (
    <App>
      <RouterProvider router={router} />
    </App>
  );
};

export default AppRouter;
