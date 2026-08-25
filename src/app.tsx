import React from 'react';
import { Route, Routes } from 'react-router-dom';

import Layout from './components/Layout';
import HomePage from './pages/HomePage/HomePage';
import SendPage from './pages/SendPage/SendPage';
import MyPraisesPage from './pages/MyPraisesPage/MyPraisesPage';
import RankingPage from './pages/RankingPage/RankingPage';
import WallPage from './pages/WallPage/WallPage';
import RoleManagementPage from './pages/RoleManagementPage/RoleManagementPage';
import DataSourcePage from './pages/DataSourcePage/DataSourcePage';
import NotFound from './pages/NotFound/NotFound';

const RoutesComponent = () => {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="send" element={<SendPage />} />
        <Route path="my-praises" element={<MyPraisesPage />} />
        <Route path="ranking" element={<RankingPage />} />
        <Route path="wall" element={<WallPage />} />
        <Route path="role-management" element={<RoleManagementPage />} />
        <Route path="data-source" element={<DataSourcePage />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default RoutesComponent;
