import React, { useState, useEffect } from 'react';
import { Card } from 'antd';

const Home: React.FC = () => {

  const [userInfo, setUserInfo] = useState<any>(null);

  useEffect(() => {
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Welcome, super admin {userInfo?.username || 'xxx'}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        
      </div>

      
    </div>
  );
};

export default Home;
