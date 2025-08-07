import React from 'react';
import { Card, Statistic, Row, Col } from 'antd';

const TokenMarket: React.FC = () => {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Token Market Info</h1>
      
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Market Cap"
              value={2.5}
              precision={2}
              valueStyle={{ color: '#3f8600' }}
              prefix="$"
              suffix="T"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="24h Volume"
              value={125.6}
              precision={2}
              valueStyle={{ color: '#cf1322' }}
              prefix="$"
              suffix="B"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Tokens"
              value={1432}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="New Listings"
              value={23}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Market Overview" className="mb-4">
        <p>Here you can view detailed market information, charts, and analytics for all tokens.</p>
        <p>Market data is updated in real-time to provide the most accurate information.</p>
      </Card>
    </div>
  );
};

export default TokenMarket;
