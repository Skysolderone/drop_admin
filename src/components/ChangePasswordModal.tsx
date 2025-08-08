import React from 'react';
import { Modal, Form, Input, Button } from 'antd';
import { EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';

interface ChangePasswordModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: (values: any) => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ visible, onCancel, onConfirm }) => {
  const [form] = Form.useForm();

  const handleConfirm = async () => {
    try {
      const values = await form.validateFields();
      onConfirm(values);
      form.resetFields();
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  return (
    <Modal
      title="Change Password"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          CANCEL
        </Button>,
        <Button key="confirm" type="primary" onClick={handleConfirm} style={{ backgroundColor: '#000', borderColor: '#000' }}>
          CONFIRM
        </Button>,
      ]}
      width={400}
      centered
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: 20 }}
      >
        <Form.Item
          label="Old Password"
          name="oldPassword"
          rules={[
            { required: true, message: 'Please input your old password!' }
          ]}
        >
          <Input.Password
            placeholder=""
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            style={{ height: 40 }}
          />
        </Form.Item>

        <Form.Item
          label="New Password"
          name="newPassword"
          rules={[
            { required: true, message: 'Please input your new password!' },
            { min: 6, message: 'Password must be at least 6 characters!' }
          ]}
        >
          <Input.Password
            placeholder=""
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            style={{ height: 40 }}
          />
        </Form.Item>

        <Form.Item
          label="Confirm New Password"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={[
            { required: true, message: 'Please confirm your new password!' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('newPassword') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(new Error('The two passwords that you entered do not match!'));
              },
            }),
          ]}
        >
          <Input.Password
            placeholder=""
            iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
            style={{ height: 40 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ChangePasswordModal;
