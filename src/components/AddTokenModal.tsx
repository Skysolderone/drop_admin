import React, { useState } from 'react';
import { Modal, Form, Tabs, Row, Col, Input, Radio, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { TextArea } = Input;

interface AddTokenModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (values: any) => void;
}

const AddTokenModal: React.FC<AddTokenModalProps> = ({ visible, onCancel, onSave }) => {
  const [form] = Form.useForm();
  const [swapSupport, setSwapSupport] = useState('yes');
  const [airdropSupport, setAirdropSupport] = useState('yes');

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      onSave(values);
      form.resetFields();
      setSwapSupport('yes');
      setAirdropSupport('yes');
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setSwapSupport('yes');
    setAirdropSupport('yes');
    onCancel();
  };

  const uploadProps = {
    beforeUpload: (file: File) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件!');
      }
      return isImage || Upload.LIST_IGNORE;
    },
  };

  const tabItems = [
    {
      key: 'basic',
      label: '基本信息',
      children: (
        <div>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="tokenName"
                label="代币名称"
                rules={[{ required: true, message: '请输入代币名称' }]}
              >
                <Input placeholder="请输入代币名称" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tokenSymbol"
                label="代币简称"
                rules={[{ required: true, message: '请输入代币简称' }]}
              >
                <Input placeholder="请输入代币简称" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="priority"
                label="排序优先级 (1-999)"
                rules={[{ required: true, message: '请输入优先级' }]}
              >
                <Input type="number" min={1} max={999} placeholder="1-999" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="tokenAddress"
                label="代币地址"
                rules={[{ required: true, message: '请输入代币地址' }]}
              >
                <Input placeholder="请输入代币地址" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="tokenDescription"
            label="代币简介 (多语言)"
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <TextArea
                  placeholder="请输入English代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (English) *</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入繁體中文代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (繁體中文)</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入日本語代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (日本語)</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入हिन्दी代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (हिन्दी)</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入Polski代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (Polski)</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入Español代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (Español)</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入Português代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (Português)</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入Bahasa Melayu代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (Bahasa Melayu)</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入Bahasa Indonesia代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (Bahasa Indonesia)</div>
              </Col>
              <Col span={12}>
                <TextArea
                  placeholder="请输入한국어代币简介"
                  autoSize={{ minRows: 2, maxRows: 4 }}
                />
                <div className="text-xs text-gray-500 mt-1">简介 (한국어)</div>
              </Col>
            </Row>
            <div className="text-sm text-blue-600 mt-2">英文简介为必填项。</div>
          </Form.Item>

          <Form.Item
            name="tokenLogo"
            label="代币Logo"
            rules={[{ required: true, message: '请上传代币Logo' }]}
          >
            <Upload {...uploadProps} maxCount={1} listType="picture">
              <Button icon={<UploadOutlined />}>选择文件</Button>
            </Upload>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isPinned"
                label="是否置顶"
                initialValue="no"
              >
                <Radio.Group>
                  <Radio value="yes">是</Radio>
                  <Radio value="no">否</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isHot"
                label="是否Hot"
                initialValue="no"
              >
                <Radio.Group>
                  <Radio value="yes">是</Radio>
                  <Radio value="no">否</Radio>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>
        </div>
      ),
    },
    {
      key: 'swap',
      label: 'Swap 配置',
      children: (
        <div>
          <Form.Item
            name="swapSupport"
            label="Swap 支持"
            initialValue="yes"
          >
            <Radio.Group onChange={(e) => setSwapSupport(e.target.value)}>
              <Radio value="yes">支持</Radio>
              <Radio value="no">不支持</Radio>
            </Radio.Group>
          </Form.Item>

          {swapSupport === 'no' && (
            <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="text-sm text-gray-600 mb-3">请为不支持Swap的原因提供以下语言版本：</div>
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_en"
                    label="不支持原因 (English)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_zh"
                    label="不支持原因 (繁體中文)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_ja"
                    label="不支持原因 (日本語)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_hi"
                    label="不支持原因 (हिन्दी)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_pl"
                    label="不支持原因 (Polski)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_es"
                    label="不支持原因 (Español)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_pt"
                    label="不支持原因 (Português)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_ms"
                    label="不支持原因 (Bahasa Melayu)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_id"
                    label="不支持原因 (Bahasa Indonesia)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="swapReason_ko"
                    label="不支持原因 (한국어)"
                  >
                    <Input placeholder="请输入不支持原因" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item
                name="swapUrl"
                label="相关URL(可选)"
              >
                <Input placeholder="请输入相关URL" />
              </Form.Item>
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'airdrop',
      label: 'Airdrop 配置',
      children: (
        <div>
          <Form.Item
            name="airdropSupport"
            label="Airdrop 支持"
            initialValue="yes"
          >
            <Radio.Group onChange={(e) => setAirdropSupport(e.target.value)}>
              <Radio value="yes">支持</Radio>
              <Radio value="no">不支持</Radio>
            </Radio.Group>
          </Form.Item>

          {airdropSupport === 'yes' && (
            <div>
              <h4 className="mb-4">获取方法</h4>
              <div className="p-4 border border-gray-200 rounded-lg mb-4">
                <div className="flex justify-between items-center mb-3">
                  <label className="font-medium">方法 1</label>
                </div>
                <Form.Item
                  name="airdropUrl"
                  label="URL"
                  rules={[{ required: true, message: '请输入URL' }]}
                >
                  <Input placeholder="请输入URL" />
                </Form.Item>
                <Form.Item
                  name="airdropPriority"
                  label="优先级 (1-999)"
                  rules={[{ required: true, message: '请输入优先级' }]}
                >
                  <Input type="number" min={1} max={999} placeholder="1-999" />
                </Form.Item>
              </div>
              <Button type="dashed" className="w-full">
                ➕ 添加获取方法
              </Button>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <Modal
      title="添加代币"
      open={visible}
      onCancel={handleCancel}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      width={800}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Tabs items={tabItems} />
      </Form>
    </Modal>
  );
};

export default AddTokenModal;
