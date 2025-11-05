import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import api from '../lib/axios';

interface InternationalizationModalProps {
    visible: boolean;
    onCancel: () => void;
    onSave: (values: any) => void;
    title: string;
    initialValues?: Record<string, string>;
}

interface LanguageConfig {
    key: string;
    label: string;
    chineseLabel: string;
}

const languages: LanguageConfig[] = [
    { key: 'es', label: 'Spanish', chineseLabel: '西班牙语' },
    { key: 'fr', label: 'French', chineseLabel: '法语' },
    { key: 'pt', label: 'Portuguese', chineseLabel: '葡萄牙语' },
    { key: 'id', label: 'Indonesian', chineseLabel: '印度尼西亚语' },
    { key: 'ja', label: 'Japanese', chineseLabel: '日语' },
    { key: 'pl', label: 'Polish', chineseLabel: '波兰语' },
    { key: 'th', label: 'Thai', chineseLabel: '泰语' },
    { key: 'zh-TW', label: 'Chinese (Traditional)', chineseLabel: '繁体中文' },
    { key: 'ko', label: 'Korean', chineseLabel: '韩语' },
    { key: 'hi', label: 'Hindi', chineseLabel: '印地语' },
    { key: 'zh-CN', label: 'Chinese (Simplified)', chineseLabel: '简体中文' },
];

// 自动翻译函数
async function translateText(text: any, targetLanguages: any) {
    const apiKey = "sk-cb616a0c850a4e0c93c84237e7034e59";
    const apiUrl = "https://api.deepseek.com/v1/chat/completions";
    const model = "deepseek-chat";

    try {
        const requests = targetLanguages.map(async (lang: any) => {
            const messages = [
                {
                    role: "system",
                    content:
                        `你是专业的翻译引擎。请将用户提供的文本准确翻译为目标语言：${lang}。\n` +
                        "要求：\n" +
                        "1) 只输出译文，不要解释；\n" +
                        "2) 保留专有名词和术语一致性；\n" +
                        "3) 保留原文中的换行与基本格式；\n" +
                        "4) 若原文已是目标语言，直接原样返回。",
                },
                {
                    role: "user",
                    content: text,
                },
            ];

            const response = await api.post(
                apiUrl,
                {
                    model,
                    messages,
                    temperature: 0.2,
                },
                {
                    headers: {
                        Authorization: `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const translated = response?.data?.choices?.[0]?.message?.content?.trim() ?? "";
            return [lang, translated];
        });

        const pairs = await Promise.all(requests);
        return Object.fromEntries(pairs);
    } catch (error: any) {
        const detail = (error as any)?.response?.data || (error as any)?.message || error;
        console.error("翻译失败:", detail);
        throw error;
    }
}

const InternationalizationModal: React.FC<InternationalizationModalProps> = ({
    visible,
    onCancel,
    onSave,
    title,
    initialValues = {}
}) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [translateLoading, setTranslateLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            // 先重置表单，清空所有字段
            form.resetFields();
            // 然后设置当前字段的初始值
            form.setFieldsValue(initialValues);
        }
    }, [visible, initialValues, form, title]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            onSave(values);
        } catch (error) {
            console.error('表单验证失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onCancel();
    };

    const handleAutoTranslate = async () => {
        try {
            setTranslateLoading(true);
            
            // 获取当前表单中的英文文本
            const currentValues = form.getFieldsValue();
            
            // 寻找有内容的英文字段作为翻译源
            let sourceText = '';
            if (currentValues.en) {
                sourceText = currentValues.en;
            } else {
                // 如果没有英文字段，提示用户先输入英文
                message.warning('请先在表单中输入英文文本作为翻译源');
                return;
            }
            
            if (!sourceText.trim()) {
                message.warning('请先输入要翻译的文本');
                return;
            }

            // 定义语言映射
            const languageMap: Record<string, string> = {
                es: '西班牙语',
                fr: '法语',
                pt: '葡萄牙语',
                id: '印度尼西亚语',
                ja: '日语',
                pl: '波兰语',
                th: '泰语',
                'zh-TW': '繁体中文',
                ko: '韩语',
                hi: '印地语',
                'zh-CN': '简体中文'
            };

            // 获取所有需要翻译的语言
            const targetLanguages = Object.values(languageMap);
            
            message.loading('正在翻译中，请稍候...', 0);
            
            // 调用翻译函数
            const translations = await translateText(sourceText, targetLanguages);
            
            // 将翻译结果映射回表单字段
            const translatedValues: Record<string, string> = {};
            Object.entries(languageMap).forEach(([key, languageName]) => {
                if (translations[languageName]) {
                    translatedValues[key] = translations[languageName];
                }
            });
            
            // 更新表单值
            form.setFieldsValue(translatedValues);
            
            message.destroy();
            message.success('自动翻译完成！');
            
        } catch (error: any) {
            message.destroy();
            console.error('翻译失败:', error);
            const errorMsg = error?.response?.data?.message || error?.message || '翻译失败，请重试';
            message.error(errorMsg);
        } finally {
            setTranslateLoading(false);
        }
    };

    return (
        <Modal
            title={`编辑 ${title} 国际化`}
            open={visible}
            onCancel={handleCancel}
            width={600}
            footer={[
                <Button key="cancel" onClick={handleCancel}>
                    关闭
                </Button>,
                <Button 
                    key="auto" 
                    loading={translateLoading}
                    onClick={handleAutoTranslate} 
                    style={{ backgroundColor: '#d4a574', borderColor: '#d4a574', color: 'white' }}
                >
                    自动翻译
                </Button>,
                <Button key="submit" type="primary" loading={loading} onClick={handleSubmit} style={{ backgroundColor: '#7c5cfc', borderColor: '#7c5cfc' }}>
                    保存
                </Button>,
            ]}
        >
            <Form
                form={form}
                layout="vertical"
            >
                {/* 英文源文本字段 */}
                <Form.Item
                    label={
                        <div>
                            <span style={{ fontWeight: 'bold' }}>English (Source)</span>
                            <br />
                            <span style={{ color: '#666', fontSize: '12px' }}>英文源文本</span>
                        </div>
                    }
                    name="en"
                >
                    <Input placeholder="请输入英文文本作为翻译源" />
                </Form.Item>

                {languages.map((lang) => (
                    <Form.Item
                        key={lang.key}
                        label={
                            <div>
                                <span style={{ fontWeight: 'bold' }}>{lang.label}</span>
                                <br />
                                <span style={{ color: '#666', fontSize: '12px' }}>{lang.chineseLabel}</span>
                            </div>
                        }
                        name={lang.key}
                    >
                        <Input placeholder={`请输入${lang.chineseLabel}文本`} />
                    </Form.Item>
                ))}
            </Form>
        </Modal>
    );
};

export default InternationalizationModal;