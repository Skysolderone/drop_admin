import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Upload, Button, message, Image, Radio, Checkbox } from 'antd';
import { UploadOutlined, CloseCircleFilled } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import InternationalizationModal from './InternationalizationModal';
import api from '../lib/axios';
import { getImageUrl } from '../assets/constants';

const { Option } = Select;

interface AddBannerModalProps {
    visible: boolean;
    onCancel: () => void;
    onSave: (values: any) => void;
    initialValues?: any;
    mode: 'add' | 'edit';
}

const AddBannerModal: React.FC<AddBannerModalProps> = ({
    visible,
    onCancel,
    onSave,
    initialValues,
    mode
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [jumpType, setJumpType] = useState<string>('外部应用'); // 跟踪跳转类型状态
    
    // 国际化相关状态
    const [i18nModalVisible, setI18nModalVisible] = useState(false);
    const [currentI18nField, setCurrentI18nField] = useState<string>('');
    const [currentI18nTitle, setCurrentI18nTitle] = useState<string>('');
    const [i18nData, setI18nData] = useState<Record<string, Record<string, string>>>({
        mainTitle: {},
        subTitle: {},
        buttonText: {}
    });

    // 当模态框打开时，设置表单初始值
    useEffect(() => {
        if (!visible) {
            // 模态框关闭时重置所有状态
            form.resetFields();
            setFileList([]);
            setJumpType('外部应用');
            setI18nData({
                mainTitle: {},
                subTitle: {},
                buttonText: {}
            });
            return;
        }

        // Modal 打开时的初始化逻辑
        if (mode === 'edit' && initialValues) {
            console.log('编辑模式 - 接收到的数据:', initialValues);

            // 映射 jumpType: 从数字或英文转换为中文
            let jumpTypeValue = '外部应用'; // 默认
            const jumpType = initialValues.jumpType || initialValues.jump_type;
            const jumpNei = initialValues.jump_nei; // 检查是否有jump_nei字段

            // 如果存在jump_nei字段且有值，说明是应用内页面
            if (jumpNei) {
                jumpTypeValue = '应用内页面';
            } else if (jumpType === 1 || jumpType === '应用内页面' || jumpType === 'In-App Page') {
                jumpTypeValue = '应用内页面';
            } else if (jumpType === 2 || jumpType === '外部应用' || jumpType === 'External App') {
                jumpTypeValue = '外部应用';
            } else if (jumpType === 3 || jumpType === 'Stocks') {
                jumpTypeValue = 'Stocks';
            }

            console.log('解析后的jumpTypeValue:', jumpTypeValue, 'jump_nei:', jumpNei);

            // 处理 allowDevices: 从数字转换为数组
            let allowDevicesValue = ['android', 'ios']; // 默认全部
            const devices = initialValues.devices;
            if (devices === 1) {
                allowDevicesValue = ['android'];
            } else if (devices === 2) {
                allowDevicesValue = ['ios'];
            } else if (devices === 3) {
                allowDevicesValue = ['android', 'ios'];
            }

            // 处理 isActive: 从数字转换为 boolean 或字符串
            let isActiveValue = 'active'; // 默认有效
            const invalid = initialValues.invalid || initialValues.is_active;
            if (invalid === 1 || invalid === true) {
                isActiveValue = 'active';
            } else if (invalid === 2 || invalid === false) {
                isActiveValue = 'inactive';
            }

            // 准备表单数据
            const formData = {
                mainTitle: initialValues.mainTitle || initialValues.main_title,
                subTitle: initialValues.subTitle || initialValues.sub_title || initialValues.title,
                buttonText: initialValues.buttonText || initialValues.button_text || initialValues.btn_text,
                jumpType: jumpTypeValue,
                jumpPage: initialValues.jumpPage || initialValues.jump_page || initialValues.jump_nei, // 从jump_nei字段读取
                jumpUrl: initialValues.jumpUrl || initialValues.jump_url || initialValues.jump_link,
                priority: initialValues.priority,
                isActive: isActiveValue,
                allowDevices: allowDevicesValue,
                image: initialValues.image || initialValues.banner_img,
            };

            console.log('准备设置的表单数据:', formData);

            // 设置jumpType状态
            setJumpType(jumpTypeValue);

            // 使用 requestAnimationFrame 确保 DOM 更新后再设置值
            requestAnimationFrame(() => {
                form.setFieldsValue(formData);
                
                // 验证表单值是否设置成功
                requestAnimationFrame(() => {
                    console.log('表单当前值:', form.getFieldsValue());
                });
            });

            // 如果有现有图片，设置到文件列表中
            const imageUrl = initialValues.image || initialValues.banner_img;
            if (imageUrl) {
                setFileList([{
                    uid: '-1',
                    name: 'banner.jpg',
                    status: 'done',
                    url: imageUrl,
                }]);
            }

            // 如果有国际化数据，设置到状态中
            if (initialValues.i18n) {
                setI18nData(initialValues.i18n);
            }
        } else {
            // 添加模式，设置默认值
            setJumpType('外部应用');
            requestAnimationFrame(() => {
                form.setFieldsValue({
                    priority: 1,
                    jumpType: '外部应用',
                    isActive: 'active',
                    allowDevices: ['android', 'ios'],
                });
            });
            setFileList([]);
            setI18nData({
                mainTitle: {},
                subTitle: {},
                buttonText: {}
            });
        }
    }, [visible, mode, initialValues]);

    // 处理国际化按钮点击
    const handleI18nClick = (fieldName: string, title: string) => {
        setCurrentI18nField(fieldName);
        setCurrentI18nTitle(title);
        setI18nModalVisible(true);
    };

    // 处理国际化数据保存
    const handleI18nSave = (values: Record<string, string>) => {
        setI18nData(prev => ({
            ...prev,
            [currentI18nField]: values
        }));
        setI18nModalVisible(false);
    };

    // 处理国际化弹窗关闭
    const handleI18nCancel = () => {
        setI18nModalVisible(false);
    };

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
        showUploadList: false,
        beforeUpload: (file) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('只能上传图片文件！');
            }
            const isLt5M = file.size / 1024 / 1024 < 5;
            if (!isLt5M) {
                message.error('图片大小不能超过5MB！');
                return false;
            }
            return isImage;
        },
        customRequest: async (options: any) => {
            const { file, onSuccess, onError, onProgress } = options;
            try {
                const formData = new FormData();
                formData.append('file', file as File);
                formData.append('prefix', 'banners');
                const res = await api.post('/api/s3/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (evt:any) => {
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
        onRemove: () => {
            setFileList([]);
            form.setFieldsValue({ image: undefined });
        },
        onChange: (info) => {
            setFileList(info.fileList);
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

            // 添加国际化数据
            values.i18n = i18nData;

            // 将jumpPage映射为jump_nei保存到数据库
            if (values.jumpPage) {
                values.jump_nei = values.jumpPage;
            }

            console.log('提交的数据:', values);

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
            title={mode === 'add' ? 'Add Banner' : 'Edit Banner'}
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
                <Form.Item label="Banner图片">
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
                    rules={[{ required: true, message: '请上传Banner图片！' }]}
                >
                    <Input />
                </Form.Item>

                {/* Banner图片预览区域 */}
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
                                    alt="Banner预览"
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

                <div style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.85)' }}>
                            主标题 <span style={{ color: '#ff4d4f' }}>*</span>
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <Form.Item
                            name="mainTitle"
                            rules={[{ required: true, message: '请输入主标题！' }]}
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="请输入主标题" />
                        </Form.Item>
                        <Button 
                            style={{ 
                                backgroundColor: '#7c5cfc', 
                                borderColor: '#7c5cfc', 
                                color: 'white',
                                minWidth: '60px'
                            }}
                            onClick={() => handleI18nClick('mainTitle', '主标题')}
                        >
                            国际化
                        </Button>
                    </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.85)' }}>副标题</label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <Form.Item
                            name="subTitle"
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="请输入副标题" />
                        </Form.Item>
                        <Button 
                            style={{ 
                                backgroundColor: '#7c5cfc', 
                                borderColor: '#7c5cfc', 
                                color: 'white',
                                minWidth: '60px'
                            }}
                            onClick={() => handleI18nClick('subTitle', '副标题')}
                        >
                            国际化
                        </Button>
                    </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                    <div style={{ marginBottom: 8 }}>
                        <label style={{ fontSize: '14px', color: 'rgba(0, 0, 0, 0.85)' }}>
                            按钮文案 <span style={{ color: '#ff4d4f' }}>*</span>
                        </label>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <Form.Item
                            name="buttonText"
                            rules={[{ required: true, message: '请输入按钮文案！' }]}
                            style={{ flex: 1, marginBottom: 0 }}
                        >
                            <Input placeholder="请输入按钮文案" />
                        </Form.Item>
                        <Button 
                            style={{ 
                                backgroundColor: '#7c5cfc', 
                                borderColor: '#7c5cfc', 
                                color: 'white',
                                minWidth: '60px'
                            }}
                            onClick={() => handleI18nClick('buttonText', '按钮文案')}
                        >
                            国际化
                        </Button>
                    </div>
                </div>

                <Form.Item
                    label="跳转类型"
                    name="jumpType"
                    rules={[{ required: true, message: '请选择跳转类型！' }]}
                >
                    <Select 
                        placeholder="请选择跳转类型"
                        onChange={(value) => {
                            setJumpType(value);
                            // 当切换跳转类型时，清空跳转页面的值
                            if (value !== '应用内页面') {
                                form.setFieldsValue({ jumpPage: undefined });
                            }
                        }}
                    >
                        <Option value="应用内页面">应用内页面</Option>
                        <Option value="外部应用">外部应用</Option>
                    </Select>
                </Form.Item>

                {/* 只有选择"应用内页面"时才显示跳转页面选择 */}
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.jumpType !== currentValues.jumpType}>
                    {({ getFieldValue }) => {
                        const currentJumpType = getFieldValue('jumpType');
                        return currentJumpType === '应用内页面' ? (
                            <Form.Item
                                label="跳转页面"
                                name="jumpPage"
                                rules={[{ required: true, message: '请选择跳转页面！' }]}
                            >
                                <Select placeholder="请选择跳转页面">
                                    <Option value="Swap">Swap</Option>
                                    <Option value="Airdrop">Airdrop</Option>
                                    <Option value="Pay">Pay</Option>
                                    <Option value="Checkin">Checkin</Option>
                                    <Option value="Stocks">Stocks</Option>
                                </Select>
                            </Form.Item>
                        ) : null;
                    }}
                </Form.Item>

                {/* 只有选择"外部应用"时才显示跳转链接 */}
                <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.jumpType !== currentValues.jumpType}>
                    {({ getFieldValue }) => {
                        const currentJumpType = getFieldValue('jumpType');
                        return currentJumpType === '外部应用' ? (
                            <Form.Item
                                label="跳转链接"
                                name="jumpUrl"
                                rules={[{ required: true, message: '请输入完整URL地址！' }]}
                            >
                                <Input placeholder="请填入完整URL（例如：https://example.com）" />
                            </Form.Item>
                        ) : null;
                    }}
                </Form.Item>

                <Form.Item
                    label="排序(1-999数字越小显示越前)"
                    name="priority"
                    rules={[{ required: true, message: '请输入排序数字！' }]}
                >
                    <Input type="number" placeholder="请输入排序数字，数字越小排序越靠前" />
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

            {/* 国际化配置弹窗 */}
            <InternationalizationModal
                visible={i18nModalVisible}
                onCancel={handleI18nCancel}
                onSave={handleI18nSave}
                title={currentI18nTitle}
                initialValues={i18nData[currentI18nField] || {}}
            />
        </Modal>
    );
};

export default AddBannerModal;