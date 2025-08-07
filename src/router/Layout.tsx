import React from 'react';
import { Outlet } from 'react-router-dom';
import { Layout } from 'antd';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const { Content, Sider } = Layout;

const AppLayout: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <div className="header-fixed">
        <Header />
      </div>
      
      <Layout style={{ marginTop: '64px' }}>
        <Sider width={240} className="sidebar-container">
          <Sidebar />
        </Sider>
        
        <Layout>
          <Content className="main-content-area">
            <div className="content-wrapper">
              <Outlet />
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default AppLayout;
