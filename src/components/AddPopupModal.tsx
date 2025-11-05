import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Upload, Button, message, InputNumber, Image, Radio, Checkbox } from 'antd';
import { UploadOutlined, CloseCircleFilled } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import api from '../lib/axios';
import { getImageUrl } from '../assets/constants';

const { Option } = Select;

interface AddPopupModalProps {
    visible: boolean;
    onCancel: () => void;
    onSave: (values: any) => void;
    initialValues?: any;
    mode: 'add' | 'edit';
}

const AddPopupModal: React.FC<AddPopupModalProps> = ({
    visible,
    onCancel,
    onSave,
    initialValues,
    mode
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    // 当模态框打开时，设置表单初始值
    useEffect(() => {
        if (visible) {
            if (mode === 'edit' && initialValues) {
                console.log('编辑模式 - 接收到的数据:', initialValues);
                
                // 处理 allowDevices: 确保是数组格式
                let allowDevicesValue = ['android', 'ios']; // 默认全选
                if (initialValues.allowDevices) {
                    if (Array.isArray(initialValues.allowDevices)) {
                        allowDevicesValue = initialValues.allowDevices;
                    } else if (typeof initialValues.allowDevices === 'string') {
                        allowDevicesValue = [initialValues.allowDevices];
                    } else if (typeof initialValues.allowDevices === 'number') {
                        // 如果是数字: 1=android, 2=ios, 3=all
                        const devices = initialValues.allowDevices;
                        if (devices === 1) {
                            allowDevicesValue = ['android'];
                        } else if (devices === 2) {
                            allowDevicesValue = ['ios'];
                        } else if (devices === 3) {
                            allowDevicesValue = ['android', 'ios'];
                        }
                    }
                }

                // 编辑模式，填充现有数据
                const formData = {
                    popupName: initialValues.popupName,
                    priority: initialValues.priority,
                    jumpType: initialValues.jumpType,
                    jumpUrl: initialValues.jumpUrl,
                    isActive: initialValues.isActive,
                    allowDevices: allowDevicesValue,
                    image: initialValues.image,
                };
                
                console.log('准备设置的表单数据:', formData);
                
                form.setFieldsValue(formData);
                
                console.log('表单当前值:', form.getFieldsValue());

                // 如果有现有图片，设置到文件列表中
                if (initialValues.image) {
                    setFileList([{
                        uid: '-1',
                        name: 'popup.jpg',
                        status: 'done',
                        url: initialValues.image,
                    }]);
                }
            } else {
                // 添加模式，重置表单并设置默认值
                form.resetFields();
                // 设置默认值
                form.setFieldsValue({
                    priority: 1,
                    jumpType: '应用内页面',
                    isActive: 'active',
                    allowDevices: ['android', 'ios'],
                });
                setFileList([]);
            }
        }
    }, [visible, mode, initialValues, form]);

    // 获取图片预览URL
    const getImagePreviewUrl = (file: UploadFile | undefined): string | undefined => {
        if (!file) return undefined;

        // 1. 优先使用 response.data.url (上传完成后的最终 S3 URL)
        const responseUrl = file?.response?.data?.url;
        if (responseUrl) {
            return getImageUrl(responseUrl);
        }

        // 2. 使用 file.url (编辑模式或已存在的图片)
        const url = file?.url || file?.thumbUrl;
        if (url) {
            return getImageUrl(url);
        }

        // 3. 最后回退：本地文件预览
        if (file?.originFileObj && file?.status !== 'done') {
            try {
                return URL.createObjectURL(file.originFileObj as File);
            } catch (err) {
                console.error('创建本地预览失败:', err);
                return undefined;
            }
        }

        return undefined;
    };

    // 文件上传配置
    const uploadProps: UploadProps = {
        fileList,
        showUploadList: true,
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('只能上传图片文件！');
                return false;
            }
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error('图片大小不能超过5MB！');
                return false;
            }
            return true;
        },
        customRequest: async (options: any) => {
            const { file, onSuccess, onError, onProgress } = options;
            try {
                const formData = new FormData();
                formData.append('file', file as File);
                formData.append('prefix', 'popups');
                const res = await api.post('/api/s3/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (evt: any) => {
                        if (onProgress && evt.total) {
                            onProgress({ percent: Math.round((evt.loaded / evt.total) * 100) });
                        }
                    }
                });
                
                if (res.data.code === 200) {
                    message.success('图片上传成功！');
                    const uploadedUrl = res.data.data.url;
                    
                    // 更新文件列表
                    setFileList([{
                        uid: file.uid,
                        name: file.name,
                        status: 'done',
                        url: uploadedUrl,
                        response: { data: { url: uploadedUrl } }
                    }]);
                    
                    // 将上传成功的文件路径设置到表单中
                    form.setFieldsValue({ image: uploadedUrl });
                    
                    if (onSuccess) {
                        onSuccess({ data: { url: uploadedUrl } }, file);
                    }
                } else {
                    message.error(res.data.message || '图片上传失败！');
                    if (onError) onError(new Error(res.data.message || '上传失败'));
                }
            } catch (e: any) {
                message.error(e?.message || '上传失败');
                if (onError) onError(e);
            }
        },
        onChange: (info) => {
            setFileList(info.fileList);
        },
        onRemove: () => {
            setFileList([]);
            form.setFieldsValue({ image: undefined });
        },
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            
            // 获取上传的图片路径
            const imageFile = fileList.find(file => file.status === 'done');
            if (imageFile) {
                if (imageFile.response) {
                    values.image = imageFile.response.data.url || imageFile.response.data.path;
                } else if (imageFile.url) {
                    values.image = imageFile.url;
                }
            }

            // 处理 allowDevices: 将数组转换为后端需要的格式
            // 如果两个都选中，传 'all' 或保持数组；如果只选一个，传对应的值
            if (values.allowDevices && Array.isArray(values.allowDevices)) {
                if (values.allowDevices.length === 2) {
                    // 两个都选中，传3或'all'
                    values.allowDevices = 'all';
                } else if (values.allowDevices.length === 1) {
                    // 只选中一个
                    values.allowDevices = values.allowDevices[0];
                } else {
                    // 都没选，默认all
                    values.allowDevices = 'all';
                }
            }

            await onSave(values);
        } catch (error) {
            console.error('表单验证失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setFileList([]);
        onCancel();
    };

    return (
        <Modal
            title={mode === 'add' ? 'Add Pop-up' : 'Edit Pop-up'}
            open={visible}
            onCancel={handleCancel}
            width={600}
            forceRender
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    取消
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit}>
                    {mode === 'add' ? '添加' : '更新'}
                </Button>,
            ]}
        >
            <Form
                form={form}
                layout="vertical"
            >
                <Form.Item
                    label="弹窗名称"
                    name="popupName"
                    rules={[{ required: true, message: '请输入弹窗名称！' }]}
                >
                    <Input placeholder="请输入弹窗名称" />
                </Form.Item>

                <Form.Item label="图片(英文):">
                    <Upload {...uploadProps}>
                        <Button icon={<UploadOutlined />}>
                            点击上传图片
                        </Button>
                    </Upload>
                </Form.Item>

                {/* Hidden field to store image URL */}
                <Form.Item
                    name="image"
                    hidden
                    rules={[{ required: true, message: '请上传弹窗图片！' }]}
                >
                    <Input />
                </Form.Item>

                {/* Popup图片预览区域 */}
                {fileList.length > 0 && fileList[0] && (() => {
                    const previewUrl = getImagePreviewUrl(fileList[0]);
                    if (!previewUrl) return null;

                    return (
                        <div style={{ marginBottom: 24 }}>
                            <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>图片预览:</div>
                            <div
                                style={{
                                    width: 200,
                                    height: 100,
                                    borderRadius: '8px',
                                    border: '1px solid #d9d9d9',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    overflow: 'hidden',
                                    background: '#fff',
                                    position: 'relative',
                                }}
                            >
                                <Image
                                    src={previewUrl}
                                    alt="Popup预览"
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }}
                                    preview={{
                                        mask: '预览'
                                    }}
                                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                                    onError={() => {
                                        console.error('图片加载失败:', previewUrl);
                                    }}
                                />
                                <CloseCircleFilled
                                    onClick={() => {
                                        setFileList([]);
                                        form.setFieldsValue({ image: undefined });
                                    }}
                                    style={{
                                        position: 'absolute',
                                        top: 1,
                                        right: 1,
                                        fontSize: 20,
                                        color: '#ff4d4f',
                                        cursor: 'pointer',
                                        background: '#fff',
                                        borderRadius: '50%',
                                        zIndex: 10,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })()}

                <Form.Item
                    label="排序(1-999数字越小显示越前)"
                    name="priority"
                    rules={[{ required: true, message: '请输入排序数字！' }]}
                >
                    <InputNumber 
                        min={1} 
                        max={999} 
                        placeholder="请输入排序数字，数字越小排序越靠前" 
                        style={{ width: '100%' }}
                    />
                </Form.Item>

                <Form.Item
                    label="跳转类型"
                    name="jumpType"
                    rules={[{ required: true, message: '请选择跳转类型！' }]}
                >
                    <Select placeholder="请选择跳转类型" style={{ width: '50%' }}>
                        <Option value="应用内页面">应用内页面</Option>
                        <Option value="外部应用">外部应用</Option>
                        <Option value="Stocks">Stocks</Option>
                    </Select>
                </Form.Item>

                <Form.Item
                    label="跳转"
                    name="jumpUrl"
                    rules={[{ required: true, message: '请输入跳转地址！' }]}
                >
                    <Input placeholder="请输入" style={{ width: '50%' }} />
                </Form.Item>

                <Form.Item
                    label="是否失效"
                    name="isActive"
                >
                    <Radio.Group>
                        <Radio value="active">有效</Radio>
                        <Radio value="inactive">失效</Radio>
                    </Radio.Group>
                </Form.Item>

                <Form.Item label="Allow Devices(Default All)" name="allowDevices">
                    <Checkbox.Group>
                        <Checkbox value="android">Android</Checkbox>
                        <Checkbox value="ios">IOS</Checkbox>
                    </Checkbox.Group>
                </Form.Item>
            </Form>
        </Modal>
    );
};

export default AddPopupModal;