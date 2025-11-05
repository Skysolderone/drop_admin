import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Tabs, Row, Col, Input, Radio, Upload, Button, message, Card, DatePicker, Checkbox, Image } from 'antd';
import { UploadOutlined, CloseOutlined, WarningFilled, TranslationOutlined } from '@ant-design/icons';
import api from '../lib/axios';
import { getImageUrl } from '../assets/constants';

// 导入翻译函数
async function translateText(text: string, targetLanguages: string[]): Promise<Record<string, string>> {
    const apiKey = "sk-cb616a0c850a4e0c93c84237e7034e59";
    const apiUrl = "https://api.deepseek.com/v1/chat/completions";
    const model = "deepseek-chat";

    try {
        const requests = targetLanguages.map(async (lang: string): Promise<[string, string]> => {
            const messages = [
                {
                    role: "system" as const,
                    content:
                        `你是专业的翻译引擎。请将用户提供的文本准确翻译为目标语言：${lang}。\n` +
                        "要求：\n" +
                        "1) 只输出译文，不要解释；\n" +
                        "2) 保留专有名词和术语一致性；\n" +
                        "3) 保留原文中的换行与基本格式；\n" +
                        "4) 若原文已是目标语言，直接原样返回。",
                },
                {
                    role: "user" as const,
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

const { TextArea } = Input;

// 轻量国家标签编辑器：在一行内提供 + 按钮新增、- 按钮清空、以及每个标签右侧红色减号用于删除
const CountryTagsEditor: React.FC<{
    value?: string[];
    disabled?: boolean;
    onChange?: (v: string[]) => void;
    // 外部变化时触发一次“开始新增”的信号（递增数即可）
    triggerAddKey?: number;
    // 是否显示每个标签右侧的删除减号
    deleteMode?: boolean;
}> = ({ value = [], disabled = false, onChange, triggerAddKey, deleteMode = false }) => {
    const [editing, setEditing] = React.useState(false);
    const [input, setInput] = React.useState('');
    const inputRef = React.useRef<any>(null);
    // 待确认删除的国家码（非空即打开模态框）
    const [confirmCode, setConfirmCode] = React.useState<string | null>(null);

    // 将传入的 value 统一转换为字符串国家码数组，兼容 [{code,name}] 形式
    const normalizedCodes = React.useMemo(() => {
        try {
            const arr = Array.isArray(value) ? value : [];
            return arr
                .map((v: any) => typeof v === 'string' ? v : (v && typeof v === 'object' ? v.code : v))
                .filter((v: any) => typeof v === 'string' && v.trim() !== '')
                .map((s: string) => s.trim().toUpperCase());
        } catch {
            return [] as string[];
        }
    }, [value]);

    const addCode = (codeRaw: string) => {
        const code = (codeRaw || '').trim().toUpperCase();
        if (!code) { setEditing(false); setInput(''); return; }
        if (!/^[A-Z]{2}$/.test(code)) {
            message.warning('请输入2位国家码（如 US）');
            return;
        }
    if (normalizedCodes.includes(code)) {
            setEditing(false); setInput('');
            return;
        }
    onChange?.([...normalizedCodes, code]);
        setEditing(false); setInput('');
    };

    const removeCode = (code: string) => {
    onChange?.(normalizedCodes.filter(v => v !== code));
    };

    React.useEffect(() => {
        if (triggerAddKey && !disabled) {
            setEditing(true);
            setTimeout(() => inputRef.current?.focus?.(), 0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [triggerAddKey]);

    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
            {normalizedCodes.map((code) => (
                <span key={code} style={{ display: 'inline-flex', alignItems: 'center', padding: '0 6px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, height: 24 }}>
                    <span style={{ marginRight: 6 }}>{code}</span>
                    {deleteMode && (
                        <span
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                if (!disabled) setConfirmCode(code);
                            }}
                            title="移除"
                            style={{ cursor: disabled ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, background: '#ff7875', color: '#fff', borderRadius: 3, fontSize: 12 }}
                        >
                            -
                        </span>
                    )}
                </span>
            ))}
            {editing && !disabled && (
                <Input
                    ref={inputRef}
                    size="small"
                    style={{ width: 90 }}
                    placeholder="US"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onPressEnter={() => addCode(input)}
                    onBlur={() => { addCode(input); }}
                />
            )}
            {/* 删除确认模态框 */}
            <Modal
                centered
                title="Confirm Delete"
                open={!!confirmCode}
                onCancel={() => setConfirmCode(null)}
                maskClosable={false}
                destroyOnClose
                closeIcon={<CloseOutlined />}
                footer={[
                    <Button key="cancel" onClick={() => setConfirmCode(null)} style={{ background: '#fff', color: '#000', borderColor: '#000' }}>CANCEL</Button>,
                    <Button
                        key="confirm"
                        type="primary"
                        onClick={() => { if (confirmCode && !disabled) removeCode(confirmCode); setConfirmCode(null); }}
                        style={{ background: '#000', borderColor: '#000' }}
                    >
                        CONFIRM
                    </Button>
                ]}
                styles={{ body: { textAlign: 'center', background: '#eef3ff' } }}
            >
                <WarningFilled style={{ color: '#faad14', fontSize: 22, marginBottom: 8 }} />
                <div>Delete operation cannot be undone.</div>
                <div>Please confirm.</div>
            </Modal>
        </div>
    );
};

interface AddTokenModalProps {
    visible: boolean;
    onCancel: () => void;
    onSave: (values: any) => Promise<any> | any;
    initialValues?: any;
    mode?: 'add' | 'edit';
    // 新增：默认激活的 Tab（basic | swap | airdrop）
    defaultTabKey?: 'basic' | 'swap' | 'airdrop';
}

const AddTokenModal: React.FC<AddTokenModalProps> = ({ visible, onCancel, onSave, initialValues, mode = 'add', defaultTabKey }) => {
    const [form] = Form.useForm();
    const [swapSupport, setSwapSupport] = useState('yes');
    const [airdropSupport, setAirdropSupport] = useState('yes');
    const [saving, setSaving] = useState(false);
    const [tokenPriceCache, setTokenPriceCache] = useState<Record<string, number>>({});
    const debounceTimersRef = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
    const [translating, setTranslating] = useState(false);
    // Tabs 受控，防止某些环境下 TabHeader 使用 <a> 导致浏览器跳转
    const [activeTabKey, setActiveTabKey] = useState<'basic' | 'swap' | 'airdrop'>(defaultTabKey ?? 'basic');
    React.useEffect(() => {
        if (visible) {
            setActiveTabKey((defaultTabKey ?? 'basic'));
        }
    }, [defaultTabKey, visible]);
    // 方法删除模式（开启后每个方法卡片右上角出现红色删除按钮）
    const [methodDeleteMode, setMethodDeleteMode] = useState(false);
    // 触发某个方法下国家编辑器进入“新增模式”的计数器
    const [countryDeleteMode, setCountryDeleteMode] = useState<Record<number, boolean>>({});
    // 新增国家模态框状态
    const [addCountryVisible, setAddCountryVisible] = useState(false);
    const [addCountryTarget, setAddCountryTarget] = useState<number | null>(null);
    const [addCountryCode, setAddCountryCode] = useState('');
    const [addCountryName, setAddCountryName] = useState('');
    // 地址重复检查状态
    const [addressCheckStatus, setAddressCheckStatus] = useState<'checking' | 'duplicate' | 'available' | null>(null);
    const [duplicateTokenInfo, setDuplicateTokenInfo] = useState<{name: string, isDeleted: boolean} | null>(null);
    // 存储创建的对象URL，用于清理
    const objectUrlsRef = React.useRef<Set<string>>(new Set());
    // 跟踪初始的airdropMethods数量，用于判断是否有新增或删除
    const [initialMethodsCount, setInitialMethodsCount] = useState<number>(0);
    // 全部国家清单（对象结构），表单值仍使用代码数组
    const ALL_COUNTRIES = [
        { code: 'US', name: '美国' },
        { code: 'TH', name: '泰国' },
        { code: 'MY', name: '马来西亚' },
        { code: 'ID', name: '印度尼西亚' },
        { code: 'PL', name: '波兰' },
    ];
    const ALL_COUNTRY_CODES = ALL_COUNTRIES.map(c => c.code);


    // antd Upload 的表单绑定转换  
    const normFile = (e: any) => {
        if (Array.isArray(e)) return e;
        return e?.fileList ?? [];
    };

    // 统一的图片URL处理函数
    const getImagePreviewUrl = (file: any): string | undefined => {
        if (!file) return undefined;
        
        // 如果文件正在上传中，返回undefined
        if (file?.status === 'uploading') {
            return undefined;
        }
        
        // 优先级：上传响应的URL > file.url > thumbUrl > 本地对象URL
        let url: string | undefined = 
            file?.response?.data?.url ||
            file?.response?.url ||
            file?.url ||
            file?.thumbUrl;

        // 使用统一的图片URL处理函数，确保使用CDN
        if (url) {
            return getImageUrl(url);
        }

        // 最后回退：本地文件预览
        if (file?.originFileObj && file?.status !== 'done') {
            try {
                const objectUrl = URL.createObjectURL(file.originFileObj);
                // 存储URL用于后续清理
                objectUrlsRef.current.add(objectUrl);
                return objectUrl;
            } catch {
                // 忽略错误
            }
        }

        return undefined;
    };

    // 自动获取代币价格
    const fetchTokenPrice = async (tokenAddress: string): Promise<number | null> => {
        if (!tokenAddress) return null;
        
        // 检查缓存
        if (tokenPriceCache[tokenAddress]) {
            return tokenPriceCache[tokenAddress];
        }

        try {
            const { data: result } = await api.get(`/api/tokens/price/${encodeURIComponent(tokenAddress)}`);
            if (result.code === 200 && result.data?.price) {
                const price = parseFloat(result.data.price);
                setTokenPriceCache(prev => ({ ...prev, [tokenAddress]: price }));
                return price;
            }
        } catch (error) {
            console.error('获取价格失败:', error);
        }
        return null;
    };

    // 防抖计算Value/day
    const debouncedCalculateValuePerDay = (methodIndex: number, delay: number = 500) => {
        const key = `calculate-${methodIndex}`;
        
        // 清除之前的定时器
        if (debounceTimersRef.current[key]) {
            clearTimeout(debounceTimersRef.current[key]);
        }
        
        // 设置新的定时器
        debounceTimersRef.current[key] = setTimeout(async () => {
            const tokenAddress = form.getFieldValue('tokenAddress');
            const amountPerDay = form.getFieldValue(['airdropMethods', methodIndex, 'amountPerDay']);
            
            if (!tokenAddress || !amountPerDay || isNaN(parseFloat(amountPerDay))) {
                form.setFieldValue(['airdropMethods', methodIndex, 'valuePerDay'], '');
                return;
            }

            const price = await fetchTokenPrice(tokenAddress);
            if (price !== null) {
                const valuePerDay = (parseFloat(amountPerDay) * price).toFixed(6);
                form.setFieldValue(['airdropMethods', methodIndex, 'valuePerDay'], valuePerDay);
            }
        }, delay);
    };

    // 防抖重新计算所有方法
    const debouncedRecalculateAll = (delay: number = 800) => {
        const key = 'recalculate-all';
        
        // 清除之前的定时器
        if (debounceTimersRef.current[key]) {
            clearTimeout(debounceTimersRef.current[key]);
        }
        
        // 设置新的定时器
        debounceTimersRef.current[key] = setTimeout(() => {
            const airdropMethods = form.getFieldValue('airdropMethods') || [];
            airdropMethods.forEach((_: any, index: number) => {
                debouncedCalculateValuePerDay(index, 100);
            });
        }, delay);
    };

    // 防抖检查token地址是否重复
    const debouncedCheckTokenAddress = (address: string, delay: number = 800) => {
        const key = 'check-token-address';
        
        // 清除之前的定时器
        if (debounceTimersRef.current[key]) {
            clearTimeout(debounceTimersRef.current[key]);
        }
        
        // 重置状态
        setAddressCheckStatus(null);
        setDuplicateTokenInfo(null);
        
        // 如果地址为空，不检查
        if (!address || address.trim() === '') {
            return;
        }
        
        // 只在新增模式下检查
        if (mode !== 'add') {
            return;
        }
        
        // 设置新的定时器
        debounceTimersRef.current[key] = setTimeout(async () => {
            try {
                setAddressCheckStatus('checking');
                // 使用专门的地址检查API
                const { data: result } = await api.get(`/api/tokens/check-address/${encodeURIComponent(address.trim())}`);
                
                if (result.code === 200) {
                    if (result.data?.exists && result.data?.token) {
                        const existingToken = result.data.token;
                        setAddressCheckStatus('duplicate');
                        setDuplicateTokenInfo({
                            name: existingToken.token_name || '未知',
                            isDeleted: existingToken.remark === '0'
                        });
                    } else {
                        setAddressCheckStatus('available');
                        setDuplicateTokenInfo(null);
                    }
                } else {
                    setAddressCheckStatus(null);
                }
            } catch (error) {
                console.error('检查token地址失败:', error);
                setAddressCheckStatus(null);
            }
        }, delay);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // 显示验证中的提示
            const hideLoading = message.loading('正在验证表单数据...', 0);
            
            const values = await form.validateFields();
            
            // 验证成功，隐藏loading提示
            hideLoading();

            // 统一标准化输出，贴近旧项目逻辑
            const output: any = { ...values };

            // 1) 代币 Logo 处理
            if (Array.isArray(values.tokenLogo)) {
                if (values.tokenLogo.length === 0) {
                    // 用户主动删除了 Logo：显式清空
                    output.logo = '';
                } else if (values.tokenLogo.length > 0) {
                    const f0 = values.tokenLogo[0];
                    console.log('Processing logo file:', f0); // 调试日志
                    
                    // 优先使用上传响应中的 URL
                    if (f0?.response?.data?.url) {
                        // 新上传的文件，使用响应中的URL
                        let logoUrl = f0.response.data.url;
                        // 如果是S3 URL（objectstorageapi），保持完整URL
                        // 如果是CDN URL（img.dropwallet.world），提取路径
                        if (logoUrl.includes('img.dropwallet.world')) {
                            const match = logoUrl.match(/https?:\/\/[^\/]+(\/.*)/);
                            if (match && match[1]) {
                                logoUrl = match[1];
                            }
                        }
                        // S3 URL保持原样
                        output.logo = logoUrl;
                        console.log('Using response URL:', output.logo);
                    } else if (f0?.response?.url) {
                        // 备用：响应中的url字段
                        output.logo = f0.response.url;
                        console.log('Using response URL (fallback):', output.logo);
                    } else if (f0?.url && typeof f0.url === 'string') {
                        // 编辑时的已有文件
                        let logoUrl = f0.url;
                        // 如果URL包含CDN域名，去除它只保留路径部分
                        if (logoUrl.includes('img.dropwallet.world')) {
                            // 提取路径部分
                            const match = logoUrl.match(/https?:\/\/[^\/]+(\/.*)/);
                            if (match && match[1]) {
                                logoUrl = match[1];
                            }
                        }
                        // S3 URL保持原样
                        output.logo = logoUrl;
                        console.log('Using existing URL:', output.logo);
                    } else {
                        // 如果没有URL，说明上传可能失败了
                        console.error('No valid URL found for logo, file object:', f0);
                        message.error('Logo上传失败，请重试');
                        // 不设置logo字段，保留原值或空
                        if (initialValues?.logo) {
                            output.logo = initialValues.logo;
                        }
                    }
                }
            } else if (initialValues?.logo) {
                // 编辑态且未触碰该字段：保留旧值
                output.logo = initialValues.logo;
            }
            
            // 确保不会传递文件对象给后端
            if (output.tokenLogo) {
                console.warn('Removing tokenLogo field from output');
                delete output.tokenLogo;
            }
            
            // 额外检查，确保logo字段是字符串
            if (output.logo && typeof output.logo !== 'string') {
                console.error('Logo is not a string:', output.logo);
                message.error('Logo格式错误，请重新上传');
                throw new Error('Invalid logo format');
            }

            // 2) Airdrop 方法归一化（按新UI结构）
            if (airdropSupport === 'yes' && Array.isArray(values.airdropMethods)) {
                output.airdropMethods = values.airdropMethods.map((m: any) => {
                    // 使用上传后的 URL，避免后端拿不到 img_url
                    let imageUrl = undefined;
                    if (Array.isArray(m?.image) && m.image.length > 0) {
                        const img = m.image[0];
                        // 优先使用上传响应中的 URL
                        if (img?.response?.data?.url) {
                            // 新上传的文件，使用完整URL
                            imageUrl = img.response.data.url;
                        } else if (img?.url) {
                            // 编辑时的已有文件，保持原样
                            imageUrl = img.url;
                        }
                    }
                    const devices = Array.isArray(m?.devices) ? m.devices : [];
                    // 归一化 offlineDate
                    const od = m.offlineDate;
                    let offlineStr: string | undefined;
                    if (od) {
                        // antd v5 dayjs 对象通常有 toDate()
                        if (typeof od?.toDate === 'function') {
                            try { offlineStr = od.toDate().toISOString(); } catch { /* noop */ }
                        } else if (od instanceof Date) {
                            offlineStr = od.toISOString();
                        } else if (typeof od === 'string') {
                            offlineStr = od;
                        }
                    }

                    // 若为空则填入默认所有国家（表单内为代码数组），提交时转为对象数组 [{code,name}]
                    let selectedCountries: string[] = Array.isArray(m?.countries) ? m.countries : [];
                    if (!selectedCountries || selectedCountries.length === 0) {
                        selectedCountries = ALL_COUNTRY_CODES;
                    }
                    const codeToName = new Map(ALL_COUNTRIES.map(c => [c.code, c.name] as const));
                    const countriesObjects = selectedCountries.map((code) => ({
                        code,
                        name: codeToName.get(code) || code,
                    }));
                    const isAll = selectedCountries.length === ALL_COUNTRY_CODES.length && selectedCountries.every(c => ALL_COUNTRY_CODES.includes(c));
                    return {
                        openingStatus: m.openingStatus ?? 'enable',
                        url: m.url,
                        rank: m.rank !== undefined ? Number(m.rank) : undefined,
                        priority: m.priority !== undefined ? Number(m.priority) : undefined,
                        amountPerDay: m.amountPerDay !== undefined ? Number(m.amountPerDay) : undefined,
                        valuePerDay: m.valuePerDay !== undefined ? Number(m.valuePerDay) : undefined,
                        countriesAll: isAll,
                        // 以对象数组形式传递
                        countries: countriesObjects,
                        devices, // e.g., ['android','ios']
                        offlineDate: offlineStr,
                        oneOffStatus: m.oneOffStatus ?? 'disable',
                        imageUrl,
                    };
                });

                // 当选择支持 airdrop 且有 airdropMethods 时，设置 airdrop_at 为当前时间
                // 如果是编辑模式且methods数量增加（新增了method），强制更新airdrop_at为当前时间
                if (output.airdropMethods.length > 0) {
                    if (mode === 'edit' && output.airdropMethods.length > initialMethodsCount) {
                        // 新增了method，强制更新airdrop_at
                        output.airdrop_at = new Date().toISOString();
                        output.force_update_airdrop_at = true; // 添加标记，告诉后端强制更新
                        console.log(`新增Methods: ${initialMethodsCount} -> ${output.airdropMethods.length}, 强制更新airdrop_at`);
                    } else {
                        // 正常情况，后端会检查如果已存在则不更新
                        output.airdrop_at = new Date().toISOString();
                    }
                }
            }

            console.log('Final output to save:', output);
            console.log('Logo field value:', output.logo);
            console.log('Logo field type:', typeof output.logo);
            
            setSaving(true);
            const res = await onSave(output);
            
            console.log('=== onSave 返回结果 ===');
            console.log('res:', res);
            console.log('res.code:', res?.code);
            console.log('res.status:', res?.status);
            console.log('res.data:', res?.data);
            console.log('res.data?.code:', res?.data?.code);
            console.log('=====================');
            
            const code = (res && (res.code ?? res.status ?? res?.data?.code)) as number | undefined;
            const ok = code === 200;
            
            console.log('Calculated code:', code);
            console.log('Calculated ok:', ok);
            
            if (ok) {
                // 保存成功后，检查是否需要调用 airdropNew 接口
                const shouldCallAirdropNew = 
                    (mode === 'add' && airdropSupport === 'yes' && output.airdropMethods && output.airdropMethods.length > 0) || // 新增token且有airdrop方法
                    (mode === 'edit' && output.force_update_airdrop_at === true); // 编辑模式且新增了method

                console.log('=== airdropNew 调用检查 ===');
                console.log('mode:', mode);
                console.log('airdropSupport:', airdropSupport);
                console.log('output.airdropMethods:', output.airdropMethods);
                console.log('output.force_update_airdrop_at:', output.force_update_airdrop_at);
                console.log('shouldCallAirdropNew:', shouldCallAirdropNew);
                console.log('========================');

                if (shouldCallAirdropNew) {
                    try {
                        // 获取 token id 和 address
                        const tokenId = res?.data?.id || initialValues?.id || initialValues?.token_id;
                        const tokenAddress = output.tokenAddress || initialValues?.tokenAddress || initialValues?.address;
                        
                        if (tokenId && tokenAddress) {
                            const requestUrl = '/v2/system/airdropNew';
                            const fullUrl = `${window.location.origin}${requestUrl}`;
                            console.log('=== airdropNew 接口调用详情 ===');
                            console.log('请求路径:', requestUrl);
                            console.log('完整URL:', fullUrl);
                            console.log('请求参数:', { id: tokenId, address: tokenAddress });
                            console.log('==============================');
                            
                            await api.post(requestUrl, {
                                id: tokenId,
                                address: tokenAddress
                            });
                            console.log('airdropNew 接口调用成功');
                        } else {
                            console.warn('无法调用 airdropNew 接口: 缺少 id 或 address', { tokenId, tokenAddress });
                        }
                    } catch (error) {
                        console.error('调用 airdropNew 接口失败:', error);
                        // 不影响主流程，只记录错误
                    }
                }

                // 成功：清空并关闭
                cleanupObjectUrls();
                form.resetFields();
                setSwapSupport('yes');
                setAirdropSupport('yes');
                onCancel();
            } else {
                // 失败：不清空，保留填写内容
                if (res && (res.message || res?.data?.message)) {
                    message.error(res.message || res.data.message);
                }
            }
        } catch (error) {
            console.error('Validation failed:', error);
            // 隐藏验证loading提示
            try {
                message.destroy();
            } catch (e) {
                // ignore
            }
            
            // 表单验证失败时，滚动到第一个错误字段
            if (error && typeof error === 'object' && 'errorFields' in error) {
                const errorFields = (error as any).errorFields;
                if (Array.isArray(errorFields) && errorFields.length > 0) {
                    // 生成更友好的错误提示
                    const fieldLabels: { [key: string]: string } = {
                        'tokenName': '代币名称',
                        'tokenSymbol': '代币符号',
                        'tokenLogo': '代币Logo',
                        'description_en': '英文简介',
                        'swapReason_en': '无法兑换原因',
                        'airdropMethods': '空投方法'
                    };
                    
                    const errorMessages = errorFields.map((field: any) => {
                        const fieldName = Array.isArray(field.name) ? field.name.join('.') : field.name?.[0] || '未知字段';
                        const friendlyName = fieldLabels[fieldName] || fieldName;
                        const errors = Array.isArray(field.errors) ? field.errors.join('，') : '该字段为必填项';
                        return `${friendlyName}: ${errors}`;
                    }).filter(Boolean);
                    
                    message.error(`请完善以下信息：${errorMessages.join('；')}`);
                    
                    // 滚动到第一个错误字段
                    setTimeout(() => {
                        const firstErrorField = document.querySelector('.ant-form-item-has-error');
                        if (firstErrorField) {
                            firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    }, 100);
                } else {
                    message.error('请检查必填字段是否已正确填写');
                }
            } else {
                message.error('表单验证失败，请检查必填字段是否已正确填写');
            }
        } finally {
            setSaving(false);
        }
    };

    // 清理对象URL的函数
    const cleanupObjectUrls = () => {
        objectUrlsRef.current.forEach(url => {
            try {
                URL.revokeObjectURL(url);
            } catch (e) {
                // 忽略清理错误
            }
        });
        objectUrlsRef.current.clear();
    };

    const handleCancel = () => {
        // 清除所有防抖定时器
        Object.values(debounceTimersRef.current).forEach(timer => {
            if (timer) clearTimeout(timer);
        });
        debounceTimersRef.current = {};
        
        // 清理对象URL
        cleanupObjectUrls();
        
        form.resetFields();
        setSwapSupport('yes');
        setAirdropSupport('yes');
        setTokenPriceCache({});
        // 重置地址检查状态
        setAddressCheckStatus(null);
        setDuplicateTokenInfo(null);
        onCancel();
    };

    // 打开“新增国家”模态框
    const openAddCountryModal = (methodIndex: number) => {
        setAddCountryTarget(methodIndex);
        setAddCountryCode('');
        setAddCountryName('');
        setAddCountryVisible(true);
    };

    // 防抖翻译函数
    const debouncedTranslateSwapReason = (sourceField: string, delay: number = 1000) => {
        console.log('debouncedTranslateSwapReason called with:', sourceField);
        const key = `translate-${sourceField}`;
        
        // 清除之前的定时器
        if (debounceTimersRef.current[key]) {
            clearTimeout(debounceTimersRef.current[key]);
        }
        
        // 设置新的定时器
        debounceTimersRef.current[key] = setTimeout(async () => {
            const sourceValue = form.getFieldValue(sourceField);
            console.log('Translation triggered for:', sourceField, 'value:', sourceValue);
            
            if (!sourceValue || !sourceValue.trim()) {
                console.log('No value to translate');
                return;
            }

            // 智能检查：只有当其他字段的内容与当前输入源字段内容明显不同时，才跳过翻译
            const langFields = ['swapReason_en', 'swapReason_zh-TW', 'swapReason_ja', 'swapReason_hi', 'swapReason_pl', 'swapReason_es', 'swapReason_pt', 'swapReason_ms', 'swapReason_id', 'swapReason_ko'];
            const otherFields = langFields.filter(field => field !== sourceField);
            
            // 检查其他字段是否有明显的用户手动输入内容（长文本或明显不同的内容）
            const hasSignificantContent = otherFields.some(field => {
                const value = form.getFieldValue(field);
                if (!value || !value.trim()) return false;
                
                const trimmedValue = value.trim();
                const trimmedSource = sourceValue.trim();
                
                // 如果其他字段的内容与当前输入完全相同，说明可能是之前的自动翻译结果，可以重新翻译
                if (trimmedValue.toLowerCase() === trimmedSource.toLowerCase()) return false;
                
                // 如果内容很短（≤10个字符），认为可能是自动翻译的结果，允许重新翻译
                if (trimmedValue.length <= 10) return false;
                
                // 只有长文本（>10字符）且与源文本明显不同时，才认为是用户手动输入的重要内容
                return trimmedValue.length > 10 && 
                       Math.abs(trimmedValue.length - trimmedSource.length) > Math.max(trimmedSource.length * 0.5, 5);
            });

            console.log('Content check:', { 
                sourceValue: sourceValue.trim(), 
                hasSignificantContent,
                otherFieldsValues: otherFields.map(field => ({ field, value: form.getFieldValue(field) }))
            });

            if (hasSignificantContent) {
                console.log('Other fields have significant different content, skipping translation to preserve user input');
                return; // 其他字段已有明显不同的内容，不进行自动翻译
            }

            setTranslating(true);
            console.log('Starting translation process...');
            
            try {
                // 语言代码映射
                const langMap: Record<string, string> = {
                    'swapReason_en': 'English',
                    'swapReason_zh-TW': '繁體中文',
                    'swapReason_ja': '日本語',
                    'swapReason_hi': 'हिन्दी',
                    'swapReason_pl': 'Polski',
                    'swapReason_es': 'Español',
                    'swapReason_pt': 'Português',
                    'swapReason_ms': 'Bahasa Melayu',
                    'swapReason_id': 'Bahasa Indonesia',
                    'swapReason_ko': '한국어'
                };

                // 排除源语言，获取目标语言
                const targetFields = Object.keys(langMap).filter(field => field !== sourceField);
                const targetLanguages = targetFields.map(field => langMap[field]);

                console.log('Target languages for translation:', targetLanguages);
                console.log('Calling translateText with:', { sourceValue, targetLanguages });

                const translations = await translateText(sourceValue, targetLanguages);
                
                console.log('Translation result:', translations);

                // 将翻译结果填入对应字段（填入空白字段或短文本字段，认为短文本可能是之前的自动翻译）
                const updateFields: Record<string, string> = {};
                targetFields.forEach((field, index) => {
                    const currentValue = form.getFieldValue(field);
                    console.log(`Checking field ${field}, current value:`, currentValue);
                    
                    // 允许更新的条件：空白字段 或 内容很短（可能是之前的自动翻译）
                    const shouldUpdate = !currentValue || 
                                       !currentValue.trim() || 
                                       currentValue.trim().length <= 10; // 短于10个字符认为可以重新翻译
                    
                    if (shouldUpdate) {
                        const langName = targetLanguages[index];
                        if (translations[langName]) {
                            updateFields[field] = translations[langName];
                            console.log(`Adding translation for ${field}: ${translations[langName]}`);
                        }
                    } else {
                        console.log(`Skipping field ${field} due to existing content: ${currentValue}`);
                    }
                });

                console.log('Fields to update:', updateFields);
                
                form.setFieldsValue(updateFields);
                if (Object.keys(updateFields).length > 0) {
                    message.success(`已自动翻译 ${Object.keys(updateFields).length} 种语言`);
                    console.log('Translation completed successfully');
                } else {
                    console.log('No fields were updated (all target fields already have content)');
                }
            } catch (error: any) {
                console.error('翻译失败:', error);
                console.error('Error details:', error?.response?.data || error?.message || error);
                message.error('自动翻译失败: ' + (error?.message || '未知错误'));
            } finally {
                setTranslating(false);
                console.log('Translation process finished');
            }
        }, delay);
    };

    // 防抖翻译函数 - 代币简介
    const debouncedTranslateDescription = (sourceField: string, delay: number = 1000) => {
        console.log('debouncedTranslateDescription called with:', sourceField);
        const key = `translate-${sourceField}`;
        
        // 清除之前的定时器
        if (debounceTimersRef.current[key]) {
            clearTimeout(debounceTimersRef.current[key]);
        }
        
        // 设置新的定时器
        debounceTimersRef.current[key] = setTimeout(async () => {
            // 将字符串路径转换为数组路径，例如 'description.en' -> ['description', 'en']
            const fieldPath = sourceField.split('.');
            const sourceValue = form.getFieldValue(fieldPath);
            console.log('Translation triggered for:', sourceField, 'value:', sourceValue);
            
            if (!sourceValue || !sourceValue.trim()) {
                console.log('No value to translate');
                return;
            }

            // 智能检查：只有当其他字段的内容与当前输入源字段内容明显不同时，才跳过翻译
            const langFields = ['description.en', 'description.zh-TW', 'description.ja', 'description.hi', 'description.pl', 'description.es', 'description.pt', 'description.ms', 'description.id', 'description.ko'];
            const otherFields = langFields.filter(field => field !== sourceField);
            
            // 检查其他字段是否有明显的用户手动输入内容（长文本或明显不同的内容）
            const hasSignificantContent = otherFields.some(field => {
                const fieldPath = field.split('.');
                const value = form.getFieldValue(fieldPath);
                if (!value || !value.trim()) return false;
                
                const trimmedValue = value.trim();
                const trimmedSource = sourceValue.trim();
                
                // 如果其他字段的内容与当前输入完全相同，说明可能是之前的自动翻译结果，可以重新翻译
                if (trimmedValue.toLowerCase() === trimmedSource.toLowerCase()) return false;
                
                // 如果内容很短（≤10个字符），认为可能是自动翻译的结果，允许重新翻译
                if (trimmedValue.length <= 10) return false;
                
                // 只有长文本（>10字符）且与源文本明显不同时，才认为是用户手动输入的重要内容
                return trimmedValue.length > 10 && 
                       Math.abs(trimmedValue.length - trimmedSource.length) > Math.max(trimmedSource.length * 0.5, 5);
            });

            console.log('Content check:', { 
                sourceValue: sourceValue.trim(), 
                hasSignificantContent,
                otherFieldsValues: otherFields.map(field => ({ field, value: form.getFieldValue(field) }))
            });

            if (hasSignificantContent) {
                console.log('Other fields have significant different content, skipping translation to preserve user input');
                return; // 其他字段已有明显不同的内容，不进行自动翻译
            }

            setTranslating(true);
            console.log('Starting translation process...');
            
            try {
                // 语言代码映射
                const langMap: Record<string, string> = {
                    'description.en': 'English',
                    'description.zh-TW': '繁體中文',
                    'description.ja': '日本語',
                    'description.hi': 'हिन्दी',
                    'description.pl': 'Polski',
                    'description.es': 'Español',
                    'description.pt': 'Português',
                    'description.ms': 'Bahasa Melayu',
                    'description.id': 'Bahasa Indonesia',
                    'description.ko': '한국어'
                };

                // 排除源语言，获取目标语言
                const targetFields = Object.keys(langMap).filter(field => field !== sourceField);
                const targetLanguages = targetFields.map(field => langMap[field]);

                console.log('Target languages for translation:', targetLanguages);
                console.log('Calling translateText with:', { sourceValue, targetLanguages });

                const translations = await translateText(sourceValue, targetLanguages);
                
                console.log('Translation result:', translations);

                // 将翻译结果填入对应字段（填入空白字段或短文本字段，认为短文本可能是之前的自动翻译）
                const updateFields: Record<string, any> = {};
                targetFields.forEach((field, index) => {
                    const fieldPath = field.split('.');
                    const currentValue = form.getFieldValue(fieldPath);
                    console.log(`Checking field ${field}, current value:`, currentValue);
                    
                    // 允许更新的条件：空白字段 或 内容很短（可能是之前的自动翻译）
                    const shouldUpdate = !currentValue || 
                                       !currentValue.trim() || 
                                       currentValue.trim().length <= 10; // 短于10个字符认为可能是之前的自动翻译
                    
                    if (shouldUpdate) {
                        const langName = targetLanguages[index];
                        if (translations[langName]) {
                            // 构建嵌套对象结构，例如 description.zh-TW -> {description: {'zh-TW': value}}
                            if (!updateFields[fieldPath[0]]) {
                                updateFields[fieldPath[0]] = {};
                            }
                            updateFields[fieldPath[0]][fieldPath[1]] = translations[langName];
                            console.log(`Adding translation for ${field}: ${translations[langName]}`);
                        }
                    } else {
                        console.log(`Skipping field ${field} due to existing content: ${currentValue}`);
                    }
                });

                console.log('Fields to update:', updateFields);
                
                form.setFieldsValue(updateFields);
                if (Object.keys(updateFields).length > 0) {
                    message.success(`已自动翻译 ${Object.keys(updateFields).length} 种语言`);
                    console.log('Translation completed successfully');
                } else {
                    console.log('No fields were updated (all target fields already have content)');
                }
            } catch (error: any) {
                console.error('翻译失败:', error);
                console.error('Error details:', error?.response?.data || error?.message || error);
                message.error('自动翻译失败: ' + (error?.message || '未知错误'));
            } finally {
                setTranslating(false);
                console.log('Translation process finished');
            }
        }, delay);
    };

    // 确认新增国家
    const confirmAddCountry = () => {
        const code = (addCountryCode || '').trim().toUpperCase();
        if (!/^[A-Z]{2}$/.test(code)) {
            message.warning('请输入2位国家码，例如 JP');
            return;
        }
        if (addCountryTarget == null) {
            setAddCountryVisible(false);
            return;
        }
        const path = ['airdropMethods', addCountryTarget, 'countries'] as (string | number)[];
        const current: string[] = form.getFieldValue(path) || [];
        if (current.includes(code)) {
            message.info('该国家已存在');
            return;
        }
        form.setFieldsValue({
            airdropMethods: (() => {
                const list = form.getFieldValue('airdropMethods') || [];
                const next = [...list];
                const old = Array.isArray(next[addCountryTarget]?.countries) ? next[addCountryTarget].countries : [];
                next[addCountryTarget] = { ...(next[addCountryTarget] || {}), countries: [...old, code] };
                return next;
            })()
        });

        setAddCountryVisible(false);
    };

    // 组件卸载时清理对象URL
    React.useEffect(() => {
        return () => {
            cleanupObjectUrls();
        };
    }, []);

    // 进入弹窗时回填
    React.useEffect(() => {
        // 每次打开弹窗时清理之前的对象URL
        if (visible) {
            cleanupObjectUrls();
        }
        
        // 每次初始值变化时也清理对象URL，防止编辑不同货币时图片缓存
        if (visible && initialValues) {
            cleanupObjectUrls();
        }
        
        if (visible) {
            const iv = initialValues || {};
            const isTrue = (v: any) => v === 1 || v === '1' || v === true;
            const isFalse = (v: any) => v === 0 || v === '0' || v === false;
            
            // 在新增模式下，重置表单和相关状态
            if (mode === 'add') {
                form.resetFields();
                setSwapSupport('yes');
                setAirdropSupport('yes');
                setTokenPriceCache({});
                // 清理方法删除模式状态
                setMethodDeleteMode(false);
                setCountryDeleteMode({});
                // 重置地址检查状态
                setAddressCheckStatus(null);
                setDuplicateTokenInfo(null);
                // 重置初始methods数量
                setInitialMethodsCount(0);
                // 重置到默认tab
                setActiveTabKey(defaultTabKey ?? 'basic');
                return;
            }
            // 描述解析
            let description = undefined as any;
            if (iv.description) description = iv.description;
            else if (typeof iv.token_desc === 'string') {
                try { description = JSON.parse(iv.token_desc); } catch { description = undefined; }
            }

            // Swap 不支持原因解析（先用已有数据占位）
            let swapReason: Record<string, string> | undefined = undefined;
            if (iv.swapReason) swapReason = iv.swapReason;
            else if (typeof iv.swap_desc === 'string') {
                try { swapReason = JSON.parse(iv.swap_desc); } catch { /* noop */ }
            }

            const preset: any = {
                tokenName: iv.tokenName ?? iv.name ?? '',
                tokenSymbol: iv.tokenSymbol ?? iv.symbol ?? '',
                tokenAddress: iv.tokenAddress ?? iv.address ?? '',
                priority: iv.priority != null ? Number(iv.priority) : 999,
                isPinned: iv.isPinned != null ? iv.isPinned : (isTrue(iv.top_status) ? 'yes' : 'no'),
                isHot: iv.isHot != null ? iv.isHot : (isTrue(iv.hot_status) ? 'yes' : 'no'),
                swapSupport: iv.swapSupport != null ? iv.swapSupport : (isFalse(iv.swap_status) ? 'no' : 'yes'),
                airdropSupport: iv.airdropSupport != null ? iv.airdropSupport : (isTrue(iv.airdrop_status) ? 'yes' : 'no'),
                authentication: iv.authentication != null ? Number(iv.authentication) : 0,
                remark: iv.remark !== null && iv.remark !== undefined && iv.remark !== "" ? Number(iv.remark) : 1, // 默认为1（有效），0为失效
                description,
            };

            // swap 相关
            if (preset.swapSupport === 'no' && swapReason) {
                const langs = ['en', 'zh-TW', 'ja', 'hi', 'pl', 'es', 'pt', 'ms', 'id', 'ko'];
                langs.forEach((k) => {
                    if (swapReason && swapReason[k]) preset[`swapReason_${k}`] = swapReason[k];
                });
                if (iv.no_swap_url) preset.swapUrl = iv.no_swap_url;
                else if (iv.swapUrl) preset.swapUrl = iv.swapUrl;
            } else if (iv.no_swap_url) {
                preset.swapUrl = iv.no_swap_url;
            }

            form.setFieldsValue(preset);
            // 若已有 logo URL，则把它也写入到 tokenLogo 的表单值，便于保存时取到 URL
            if (iv.logo) {
                const cur = form.getFieldValue('tokenLogo');
                if (!cur || (Array.isArray(cur) && cur.length === 0)) {
                    // 为每个货币生成唯一的uid，避免文件对象被复用
                    const uniqueUid = `logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    form.setFieldsValue({
                        tokenLogo: [{ 
                            uid: uniqueUid, 
                            name: 'logo.png', 
                            status: 'done', 
                            url: getImageUrl(iv.logo),
                            response: { data: { url: iv.logo } }  // 添加response确保保存时能获取到正确的URL
                        }]
                    });
                }
            }
            setSwapSupport(preset.swapSupport);
            setAirdropSupport(preset.airdropSupport);

            // 初始化 Airdrop 方法的默认国家
            if ((preset.airdropSupport ?? 'yes') === 'yes') {
                const list = form.getFieldValue('airdropMethods');
                if (Array.isArray(list) && list.length > 0) {
                    const patched = list.map((item: any) => {
                        if (item && item.countriesAll === true && (!Array.isArray(item.countries) || item.countries.length === 0)) {
                            return { ...item, countries: ALL_COUNTRY_CODES };
                        }
                        if (!Array.isArray(item?.countries) || item.countries.length === 0) {
                            return { ...item, countries: ALL_COUNTRY_CODES };
                        }
                        return item;
                    });
                    form.setFieldsValue({ airdropMethods: patched });
                } else {
                    form.setFieldsValue({ airdropMethods: [{ openingStatus: 'enable', countries: ALL_COUNTRY_CODES, devices: ['android', 'ios'] }] });
                }
            }

        // 仅在编辑态且存在 id/address 时才拉取远端信息，避免新增模式导致 404
        const idOrAddr = iv.id || iv.tokenId || iv.token_id || iv.address;
        if (mode === 'edit' && idOrAddr) {
                api.get(`/api/tokens/tokenlists/${encodeURIComponent(idOrAddr)}/lans`).then(({ data }) => {
                    const ok = data?.code === 200;
                    const mapping = data?.data?.lans || {};
                    if (ok && mapping && preset.swapSupport === 'no') {
                        const langs = ['en', 'zh-TW', 'ja', 'hi', 'pl', 'es', 'pt', 'ms', 'id', 'ko'];
                        const patch: any = {};
                        langs.forEach((k) => { if (mapping[k]) patch[`swapReason_${k}`] = mapping[k]; });
                        if (Object.keys(patch).length > 0) {
                            form.setFieldsValue(patch);
                        }
                    }
                }).catch(() => {/* ignore */ });

                // 新增：拉取详情以回填 Airdrop 方法（含图片 URL）
                api.get(`/api/tokens/tokenlists/${encodeURIComponent(idOrAddr)}/detail`).then(({ data }) => {
                    const ok = data?.code === 200;
                    const detail = data?.data;
            if (!ok || !detail) return;
                    const methods = Array.isArray(detail.airdropMethods) ? detail.airdropMethods : [];
                    if (methods.length === 0) return;
                    const mapped = methods.map((m: any, idx: number) => {
                        // countries/devices 默认（若为对象数组则提取 code）
                        const rawCountries = Array.isArray(m?.countries) && m.countries.length > 0 ? m.countries : ALL_COUNTRY_CODES;
                        const countriesArr = Array.isArray(rawCountries) && typeof rawCountries[0] === 'object'
                            ? rawCountries.map((c: any) => c?.code).filter(Boolean)
                            : rawCountries;
                        const devicesArr = Array.isArray(m?.devices) && m.devices.length > 0 ? m.devices : ['android', 'ios'];
                        // Upload fileList：使用统一的图片URL处理
                        const img = m?.imageUrl;
                        const processedImgUrl = img ? getImageUrl(img) : undefined;
                        // 为每个图片生成唯一的uid，避免文件对象被复用
                        const uniqueUid = `img-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 9)}`;
                        const fileList = processedImgUrl ? [{ 
                            uid: uniqueUid, 
                            name: 'image.png', 
                            status: 'done', 
                            url: processedImgUrl,
                            response: { data: { url: img } }  // 添加response确保保存时能获取到正确的URL
                        }] : [];
                        // DatePicker 值
                        const offlineVal = m?.offlineDate ? dayjs(m.offlineDate) : undefined;
                        return {
                            openingStatus: m?.openingStatus ?? 'enable',
                            url: m?.url ?? '',
                            image: fileList,
                            rank: m?.rank ?? undefined,
                            priority: m?.priority ?? undefined,
                            amountPerDay: m?.amountPerDay ?? undefined,
                            valuePerDay: m?.valuePerDay ?? undefined,
                            countries: countriesArr,
                            devices: devicesArr,
                            offlineDate: offlineVal,
                            oneOffStatus: m?.oneOffStatus ?? 'disable',
                        };
                    });
                    form.setFieldsValue({ airdropMethods: mapped });
                    // 保存初始的methods数量，用于后续判断是否有新增或删除
                    setInitialMethodsCount(mapped.length);
                }).catch(() => {/* ignore */ });
            } else if (mode === 'edit') {
                // 如果是编辑模式但没有方法数据，设置初始数量为0
                setInitialMethodsCount(0);
            }
        }
    }, [visible, initialValues, mode, defaultTabKey]);

    // 当initialValues变化时，额外清理一次对象URL（用于编辑模式切换货币）
    React.useEffect(() => {
        if (visible && mode === 'edit' && initialValues) {
            cleanupObjectUrls();
            // 清理表单中的文件列表，强制重新创建
            form.setFieldValue('tokenLogo', []);
            form.setFieldValue('airdropMethods', []);
            
            // 短暂延迟后重新设置，确保清理完成
            setTimeout(() => {
                if (initialValues.logo) {
                    const uniqueUid = `logo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    form.setFieldsValue({
                        tokenLogo: [{ 
                            uid: uniqueUid, 
                            name: 'logo.png', 
                            status: 'done', 
                            url: getImageUrl(initialValues.logo),
                            response: { data: { url: initialValues.logo } }  // 添加response确保保存时能获取到正确的URL
                        }]
                    });
                }
            }, 50);
        }
    }, [initialValues?.id, initialValues?.tokenId, initialValues?.token_id, initialValues?.address]);

    const uploadProps = {
        beforeUpload: (file: File) => {
            const isImage = file.type.startsWith('image/');
            if (!isImage) {
                message.error('只能上传图片文件!');
            }
            // 返回 true 让 Upload 触发 customRequest 执行上传
            return isImage;
        },
        customRequest: async (options: any) => {
            const { file, onSuccess, onError, onProgress } = options;
            try {
                const formData = new FormData();
                formData.append('file', file as File);
                formData.append('prefix', 'tokens');
                const res = await api.post('/api/s3/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (evt) => {
                        if (onProgress && evt.total) {
                            onProgress({ percent: Math.round((evt.loaded / evt.total) * 100) });
                        }
                    }
                });
                const ok = res?.data?.code === 200;
                let url = res?.data?.data?.url as string | undefined;
                if (!ok || !url) throw new Error(res?.data?.message || '上传失败');
                
                // 处理不同类型的URL
                // 1. 如果是完整的S3 URL，保持原样
                // 2. 如果是相对路径，归一化处理
                if (!/^https?:\/\//i.test(url)) {
                    // 相对路径：加前导斜杠并兼容旧前缀
                    if (!url.startsWith('/')) url = `/${url}`;
                    url = url.replace(/^\/uploadsurlpic\//i, '/uploadurlpic/');
                }
                // 对于S3 URL，直接使用完整URL

                // 让 Upload 自身接管 fileList：为文件设置 url，返回成功
                console.log('Upload success, setting URL:', url);
                (file as any).url = url;
                (file as any).response = { data: { url } }; // 确保response被设置
                if (onSuccess) {
                    onSuccess({ data: { url } });
                    console.log('Called onSuccess with:', { data: { url } });
                }
            } catch (e: any) {
                message.error(e?.message || '上传失败');
                if (onError) onError(e);
            }
        }
    } as any;

    // Airdrop 方法图片专用上传
    const airdropUploadProps = {
        beforeUpload: uploadProps.beforeUpload,
        customRequest: async (options: any) => {
            const { file, onSuccess, onError, onProgress } = options;
            try {
                const formData = new FormData();
                formData.append('file', file as File);
                formData.append('prefix', 'airdrops');
                const res = await api.post('/api/s3/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                    onUploadProgress: (evt) => {
                        if (onProgress && evt.total) {
                            onProgress({ percent: Math.round((evt.loaded / evt.total) * 100) });
                        }
                    }
                });
                const ok = res?.data?.code === 200;
                let url = res?.data?.data?.url as string | undefined;
                if (!ok || !url) throw new Error(res?.data?.message || '上传失败');
                
                // 处理不同类型的URL
                // 1. 如果是完整的S3 URL，保持原样
                // 2. 如果是相对路径，归一化处理
                if (!/^https?:\/\//i.test(url)) {
                    // 相对路径：加前导斜杠并兼容旧前缀
                    if (!url.startsWith('/')) url = `/${url}`;
                    url = url.replace(/^\/uploadsurlpic\//i, '/uploadurlpic/');
                }
                // 对于S3 URL，直接使用完整URL
                
                console.log('Airdrop upload success, setting URL:', url);
                (file as any).url = url;
                (file as any).response = { data: { url } }; // 确保response被设置
                if (onSuccess) {
                    onSuccess({ data: { url } });
                    console.log('Called onSuccess with:', { data: { url } });
                }
            } catch (e: any) {
                message.error(e?.message || '上传失败');
                if (onError) onError(e);
            }
        }
    } as any;

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
                                rules={[
                                    { required: true, message: '请输入优先级' },
                                   
                                ]}
                                initialValue={999}
                            >
                                <Input 
                                    type="number" 
                                    min={1} 
                                    max={999} 
                                    step={1} 
                                    placeholder="1-999" 
                                    onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        // 检查是否为有效整数
                                        if (!isNaN(value) && Number.isInteger(value)) {
                                            if (value < 1 || value > 999) {
                                                const clampedValue = Math.min(Math.max(value, 1), 999);
                                                e.target.value = clampedValue.toString();
                                                form.setFieldValue('priority', clampedValue);
                                            }
                                        } else if (e.target.value !== '') {
                                            // 如果输入的不是有效整数，清空输入
                                            e.target.value = '';
                                        }
                                    }}
                                    onKeyPress={(e) => {
                                        // 禁止输入小数点和其他非数字字符
                                        if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                                            e.preventDefault();
                                        }
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="tokenAddress"
                                label="代币地址"
                                rules={[{ required: true, message: '请输入代币地址' }]}
                                validateStatus={
                                    addressCheckStatus === 'checking' ? 'validating' :
                                    addressCheckStatus === 'duplicate' ? 'error' :
                                    addressCheckStatus === 'available' ? 'success' : undefined
                                }
                                help={
                                    addressCheckStatus === 'checking' ? '正在检查地址是否重复...' :
                                    addressCheckStatus === 'duplicate' && duplicateTokenInfo ? 
                                        duplicateTokenInfo.isDeleted 
                                            ? `该地址已存在但已被删除 (${duplicateTokenInfo.name})`
                                            : `该地址已存在 (${duplicateTokenInfo.name})，不能重复添加`
                                    : addressCheckStatus === 'available' ? '地址可用' : undefined
                                }
                            >
                                <Input 
                                    placeholder="请输入代币地址" 
                                    onChange={(e) => {
                                        const address = e.target.value;
                                        // 清除价格缓存，使用防抖重新计算所有方法的价格
                                        setTokenPriceCache({});
                                        debouncedRecalculateAll();
                                        // 检查地址是否重复
                                        debouncedCheckTokenAddress(address);
                                    }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div className="mb-2">
                        <div className="ant-form-item-label" style={{marginBottom:'10px'}}>
                            <label className="ant-form-item-required" style={{fontWeight: 500, fontSize: 16}}>代币简介 (多语言)</label>
                        </div>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>
                                    简介 (English) <span style={{ color: '#ff4d4f' }}>*</span>
                                </div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'en']} rules={[{ required: true, message: '请填写英文简介' }]}>
                                    <TextArea 
                                        placeholder="请输入English代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.en');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (繁體中文)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'zh-TW']}>
                                    <TextArea 
                                        placeholder="请输入繁體中文代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.zh-TW');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (日本語)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'ja']}>
                                    <TextArea 
                                        placeholder="请输入日本語代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.ja');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (हिन्दी)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'hi']}>
                                    <TextArea 
                                        placeholder="请输入हिन्दी代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.hi');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (Polski)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'pl']}>
                                    <TextArea 
                                        placeholder="请输入Polski代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.pl');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (Español)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'es']}>
                                    <TextArea 
                                        placeholder="请输入Español代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.es');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (Português)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'pt']}>
                                    <TextArea 
                                        placeholder="请输入Português代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.pt');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (Bahasa Melayu)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'ms']}>
                                    <TextArea 
                                        placeholder="请输入Bahasa Melayu代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.ms');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (Bahasa Indonesia)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'id']}>
                                    <TextArea 
                                        placeholder="请输入Bahasa Indonesia代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.id');
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <div className="text-xs text-gray-500" style={{ marginBottom: '5px' }}>简介 (한국어)</div>
                                <Form.Item style={{marginBottom:'10px'}} name={['description', 'ko']}>
                                    <TextArea 
                                        placeholder="请输入한국어代币简介" 
                                        autoSize={{ minRows: 2, maxRows: 4 }}
                                        onChange={() => {
                                            debouncedTranslateDescription('description.ko');
                                        }}
                                    />
                                </Form.Item>
                            </Col> 
    </Row>
    <div className="text-sm text-blue-600 mt-1">英文简介为必填项。</div>
</div>

                    <Form.Item
                        name="tokenLogo"
                        label="代币Logo"
                        valuePropName="fileList"
                        getValueFromEvent={normFile}
                        rules={mode === 'edit' ? [] : [{ required: true, message: '请上传代币Logo' }]}
                    >
                        <Upload
                            {...uploadProps}
                            maxCount={1}
                            listType="text"
                            showUploadList={false}
                            accept="image/*"
                        >
                            <Button icon={<UploadOutlined />}>选择文件</Button>
                        </Upload>
                    </Form.Item>
                    
                    {/* Token Logo 预览区域 */}
                    <Form.Item noStyle shouldUpdate>
                        {({ getFieldValue }) => {
                            const fileList = getFieldValue('tokenLogo') || [];
                            const file = fileList[0];
                            const url = getImagePreviewUrl(file);

                            return url ? (
                                <div style={{ marginBottom: 24 }}>
                                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>Logo预览:</div>
                                    <div
                                        style={{
                                            width: 80,
                                            height: 80,
                                            borderRadius: '8px',
                                            border: '1px solid #d9d9d9',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            overflow: 'hidden',
                                            background: '#fff',
                                        }}
                                    >
                                        <Image
                                            src={url}
                                            alt="Logo预览"
                                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }}
                                            preview={{
                                                mask: <div style={{ fontSize: '12px' }}>点击放大</div>,
                                                src: (() => {
                                                    // 为预览模式生成备用URL
                                                    const originalUrl = file?.response?.data?.url || file?.url;
                                                    if (originalUrl && originalUrl.startsWith('/')) {
                                                        return `https://img.dropwallet.world${originalUrl}`;
                                                    }
                                                    return url;
                                                })()
                                            }}
                                            onError={(e) => {
                                                console.error('Logo加载失败:', url);
                                                const img = e.target as HTMLImageElement;
                                                const originalUrl = file?.response?.data?.url || file?.url;
                                                
                                                // 如果是本地路径失败，尝试使用外部CDN
                                                if (originalUrl && originalUrl.startsWith('/') && !img.src.includes('img.dropwallet.world')) {
                                                    const cdnUrl = `https://img.dropwallet.world${originalUrl}`;
                                                    console.log('重试Logo CDN URL:', cdnUrl);
                                                    img.src = cdnUrl;
                                                    return;
                                                }
                                                
                                                // 最终失败，显示错误信息
                                                img.style.display = 'none';
                                                const parent = img.parentElement;
                                                if (parent) {
                                                    parent.innerHTML = '<span style="color: #999">Logo加载失败</span>';
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : null;
                        }}
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="authentication"
                                label="是否认证"
                                initialValue={0}
                            >
                                <Radio.Group>
                                    <Radio value={1}>已认证</Radio>
                                    <Radio value={0}>未认证</Radio>
                                </Radio.Group>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="remark"
                                label="是否失效"
                                initialValue={1}
                            >
                                <Radio.Group>
                                    <Radio value={0}>失效</Radio>
                                    <Radio value={1}>有效</Radio>
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
                        <div className="p-4 rounded-lg bg-gray-50">
                            <div className="text-sm text-gray-600 mb-3">请为不支持Swap的原因提供以下语言版本：</div>
                            <div style={{ maxHeight: '350px', overflowY: 'auto', paddingRight: '8px' }}>
                                <Row gutter={[16, 16]}>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_en"
                                        label="不支持原因 (English)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_en');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_zh-TW"
                                        label="不支持原因 (繁體中文)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_zh-TW');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_ja"
                                        label="不支持原因 (日本語)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_ja');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_hi"
                                        label="不支持原因 (हिन्दी)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_hi');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_pl"
                                        label="不支持原因 (Polski)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_pl');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_es"
                                        label="不支持原因 (Español)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_es');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_pt"
                                        label="不支持原因 (Português)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_pt');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_ms"
                                        label="不支持原因 (Bahasa Melayu)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_ms');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_id"
                                        label="不支持原因 (Bahasa Indonesia)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_id');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="swapReason_ko"
                                        label="不支持原因 (한국어)"
                                    >
                                        <TextArea 
                                            placeholder="请输入不支持原因" 
                                            autoSize={{ minRows: 2, maxRows: 4 }}
                                            onChange={() => {
                                                debouncedTranslateSwapReason('swapReason_ko');
                                            }}
                                        />
                                    </Form.Item>
                                </Col>
                                </Row>
                            </div>
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

                    {/* 追加：与 Basic 页复用的置顶/Hot/优先级设置，Airdrop 不支持时隐藏 */}
                    {airdropSupport === 'yes' && (
                        <>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="isPinned" label="Top Status">
                                        <Radio.Group>
                                            <Radio value="yes">Enable</Radio>
                                            <Radio value="no">Disable(Default)</Radio>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="isHot" label="Hot Status">
                                        <Radio.Group>
                                            <Radio value="yes">Enable</Radio>
                                            <Radio value="no">Disable(Default)</Radio>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </>
                    )}

                    {airdropSupport === 'yes' && (
                        <div>
                            {/* 使用 Form.List 动态添加/删除方法 */}
                            <Form.List name="airdropMethods" initialValue={[{ openingStatus: 'enable' }]}>
                                {(fields, { add, remove }) => (
                                    <>
                                        {/* 标题 + 顶部工具栏 */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                                            <h4 style={{ margin: 0 }}>Airdrop Method</h4>
                                            <div>
                                                <Button size="small" type="primary" onClick={() => add()} style={{ marginRight: 8 }}>Add Method</Button>
                                                <Button size="small" danger ghost onClick={() => setMethodDeleteMode((v) => !v)}>
                                                    {methodDeleteMode ? 'Done' : 'Delete Mode'}
                                                </Button>
                                            </div>
                                        </div>
                                        {fields.map((field, index) => {
                                            const { key: listKey, ...restField } = field as any;
                                            return (
                                                <Card key={listKey} className="mb-4" size="small" title={`Method ${index + 1}`}
                                                    extra={methodDeleteMode ? (
                                                        <Button danger size="small" onClick={() => remove(field.name)}>-</Button>
                                                    ) : null}
                                                >
                                                    <Form.Item
                                                        {...restField}
                                                        name={[field.name, 'openingStatus']}
                                                        fieldKey={[field.fieldKey!, 'openingStatus']}
                                                        label="Opening Status"
                                                        initialValue="enable"
                                                    >
                                                        <Radio.Group>
                                                            <Radio value="enable">Enable (Default)</Radio>
                                                            <Radio value="disable">Disable</Radio>
                                                        </Radio.Group>
                                                    </Form.Item>
                                                    <Row gutter={16}>
                                                        <Col span={24}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[field.name, 'url']}
                                                                fieldKey={[field.fieldKey!, 'url']}
                                                                label="URL"
                                                                rules={[{ required: true, message: '请输入URL' }]}
                                                            >
                                                                <Input placeholder="请输入URL" />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[field.name, 'image']}
                                                                fieldKey={[field.fieldKey!, 'image']}
                                                                label="Image"
                                                                valuePropName="fileList"
                                                                getValueFromEvent={normFile}
                                                                rules={[{ required: true, message: '请上传图片' }]}
                                                            >
                                                                {/* 改为按钮 + 自定义预览框样式 */}
                                                                <Upload
                                                                    {...airdropUploadProps}
                                                                    listType="text"
                                                                    showUploadList={false}
                                                                    maxCount={1}
                                                                    accept="image/*"
                                                                >
                                                                    <Button icon={<UploadOutlined />}>选择文件</Button>
                                                                </Upload>
                                                            </Form.Item>
                                                            {/* 预览区域 */}
                                                            <Form.Item noStyle shouldUpdate>
                                                                {({ getFieldValue }) => {
                                                                    const fileList = getFieldValue(['airdropMethods', field.name, 'image']) || [];
                                                                    const file = fileList[0];
                                                                    const url = getImagePreviewUrl(file);

                                                                    return (
                                                                        <div
                                                                            style={{
                                                                                marginTop: 8,
                                                                                border: '1px solid #d9d9d9',
                                                                                borderRadius: 8,
                                                                                height: 120,
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                justifyContent: 'center',
                                                                                overflow: 'hidden',
                                                                                background: '#fff',
                                                                            }}
                                                                        >
                                                                            {url ? (
                                                                                <Image
                                                                                    src={url}
                                                                                    alt="预览"
                                                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', cursor: 'pointer' }}
                                                                                    preview={{
                                                                                        mask: <div style={{ fontSize: '12px' }}>点击放大</div>,
                                                                                        src: (() => {
                                                                                            // 为预览模式生成备用URL
                                                                                            const file = getFieldValue(['airdropMethods', field.name, 'image'])?.[0];
                                                                                            const originalUrl = file?.response?.data?.url || file?.url;
                                                                                            if (originalUrl && originalUrl.startsWith('/')) {
                                                                                                return `https://img.dropwallet.world${originalUrl}`;
                                                                                            }
                                                                                            return url;
                                                                                        })()
                                                                                    }}
                                                                                    onError={(e) => {
                                                                                        console.error('图片加载失败:', url);
                                                                                        const img = e.target as HTMLImageElement;
                                                                                        const file = getFieldValue(['airdropMethods', field.name, 'image'])?.[0];
                                                                                        const originalUrl = file?.response?.data?.url || file?.url;
                                                                                        
                                                                                        // 如果是本地路径失败，尝试使用外部CDN
                                                                                        if (originalUrl && originalUrl.startsWith('/') && !img.src.includes('img.dropwallet.world')) {
                                                                                            const cdnUrl = `https://img.dropwallet.world${originalUrl}`;
                                                                                            console.log('重试CDN URL:', cdnUrl);
                                                                                            img.src = cdnUrl;
                                                                                            return;
                                                                                        }
                                                                                        
                                                                                        // 最终失败，显示错误信息
                                                                                        img.style.display = 'none';
                                                                                        const parent = img.parentElement;
                                                                                        if (parent) {
                                                                                            parent.innerHTML = '<span style="color: #999">图片加载失败</span>';
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            ) : (
                                                                                <span style={{ color: '#999' }}>暂无预览</span>
                                                                            )}
                                                                        </div>
                                                                    );
                                                                }}
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={16}>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[field.name, 'rank']}
                                                                fieldKey={[field.fieldKey!, 'rank']}
                                                                label="Rank"
                                                                rules={[{ required: true, message: '请输入Rank' }]}
                                                            >
                                                                <Input 
                                                                    type="number" 
                                                                    min={1} 
                                                                    max={999} 
                                                                    placeholder="1-999" 
                                                                    onChange={(e) => {
                                                                        const value = parseInt(e.target.value);
                                                                        // 检查是否为有效整数
                                                                        if (!isNaN(value) && Number.isInteger(value)) {
                                                                            if (value < 1 || value > 999) {
                                                                                const clampedValue = Math.min(Math.max(value, 1), 999);
                                                                                e.target.value = clampedValue.toString();
                                                                                form.setFieldValue(['airdropMethods', field.name, 'rank'], clampedValue);
                                                                            }
                                                                        } else if (e.target.value !== '') {
                                                                            // 如果输入的不是有效整数，清空输入
                                                                            e.target.value = '';
                                                                        }
                                                                    }}
                                                                    onKeyPress={(e) => {
                                                                        // 禁止输入小数点和其他非数字字符
                                                                        if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                            e.preventDefault();
                                                                        }
                                                                    }}
                                                                />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[field.name, 'priority']}
                                                                fieldKey={[field.fieldKey!, 'priority']}
                                                                label="Priority"
                                                                rules={[{ required: true, message: '请输入Priority' }]}
                                                            >
                                                                <Input 
                                                                    type="number" 
                                                                    min={1} 
                                                                    max={999} 
                                                                    placeholder="1-999" 
                                                                    onChange={(e) => {
                                                                        const value = parseInt(e.target.value);
                                                                        // 检查是否为有效整数
                                                                        if (!isNaN(value) && Number.isInteger(value)) {
                                                                            if (value < 1 || value > 999) {
                                                                                const clampedValue = Math.min(Math.max(value, 1), 999);
                                                                                e.target.value = clampedValue.toString();
                                                                                form.setFieldValue(['airdropMethods', field.name, 'priority'], clampedValue);
                                                                            }
                                                                        } else if (e.target.value !== '') {
                                                                            // 如果输入的不是有效整数，清空输入
                                                                            e.target.value = '';
                                                                        }
                                                                    }}
                                                                    onKeyPress={(e) => {
                                                                        // 禁止输入小数点和其他非数字字符
                                                                        if (e.key === '.' || e.key === '-' || e.key === 'e' || e.key === 'E') {
                                                                            e.preventDefault();
                                                                        }
                                                                    }}
                                                                />
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>
                                                    <Row gutter={16}>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[field.name, 'amountPerDay']}
                                                                fieldKey={[field.fieldKey!, 'amountPerDay']}
                                                                label="Amount/day"
                                                            >
                                                                <Input 
                                                                    type="number" 
                                                                    min={0} 
                                                                    placeholder="" 
                                                                    onChange={() => {
                                                                        // 使用防抖函数
                                                                        debouncedCalculateValuePerDay(field.name);
                                                                    }}
                                                                />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[field.name, 'valuePerDay']}
                                                                fieldKey={[field.fieldKey!, 'valuePerDay']}
                                                                label="Value/day (自动计算)"
                                                            >
                                                                <Input 
                                                                    type="number" 
                                                                    min={0} 
                                                                    placeholder="将根据代币地址和Amount/day自动计算" 
                                                                    readOnly
                                                                />
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>

                                                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                                                        <div className="text-sm text-gray-600 mr-3">Allowed Countries (Default All)</div>
                                                        <Button
                                                            style={{ marginRight: 8 }}
                                                            size="small"
                                                            onClick={() => openAddCountryModal(field.name)}
                                                        >
                                                            +
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            onClick={() => setCountryDeleteMode((prev) => ({ ...prev, [field.name]: !prev?.[field.name] }))}
                                                        >
                                                            -
                                                        </Button>
                                                    </div>
                                                    <Form.Item name={[field.name, 'countries']} initialValue={ALL_COUNTRY_CODES}>
                                                        <CountryTagsEditor
                                                            deleteMode={!!countryDeleteMode[field.name]}
                                                        />
                                                    </Form.Item>

                                                    <div className="text-sm text-gray-600 mb-1">Allowed Devices (Default All)</div>
                                                    <Form.Item name={[field.name, 'devices']} initialValue={['android', 'ios']}>
                                                        <Checkbox.Group options={[
                                                            { label: 'Android', value: 'android' },
                                                            { label: 'iOS', value: 'ios' },
                                                        ]} />
                                                    </Form.Item>

                                                    <Row gutter={16}>
                                                        <Col span={12}>
                                                            <Form.Item name={[field.name, 'offlineDate']} label="Offline Date">
                                                                <DatePicker style={{ width: '100%' }} />
                                                            </Form.Item>
                                                        </Col>
                                                    </Row>

                                                    <Form.Item
                                                        name={[field.name, 'oneOffStatus']}
                                                        label="One-off Token Status"
                                                        initialValue="disable"
                                                    >
                                                        <Radio.Group>
                                                            <Radio value="enable">Enable</Radio>
                                                            <Radio value="disable">Disable</Radio>
                                                        </Radio.Group>
                                                    </Form.Item>
                                                </Card>
                                            );
                                        })}
                                        <Button type="dashed" onClick={() => add()} block>
                                            ➕ 添加获取方法
                                        </Button>
                                    </>
                                )}
                            </Form.List>
                        </div>
                    )}
                </div>
            ),
        },
    ];

    return (
        <>
            <Modal
                title={mode === 'edit' ? '编辑代币' : '添加代币'}
                open={visible}
                onCancel={handleCancel}
                onOk={handleSave}
                confirmLoading={saving}
                okText="保存"
                cancelText="取消"
                width={800}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    autoComplete="off"
                    initialValues={{ swapSupport: 'yes', airdropSupport: 'yes', isPinned: 'no', isHot: 'no' }}
                >
                    <Tabs
                        items={tabItems}
                        activeKey={activeTabKey}
                        onChange={(k) => setActiveTabKey(k as 'basic' | 'swap' | 'airdrop')}
                        onTabClick={(_, e) => { try { e?.preventDefault?.(); } catch {} }}
                    />
                </Form>
            </Modal>
            {/* 新增国家模态框 */}
            <Modal
                title="Add More Allowed Country"
                open={addCountryVisible}
                onCancel={() => setAddCountryVisible(false)}
                footer={[
                    <Button key="cancel" onClick={() => setAddCountryVisible(false)}>CANCEL</Button>,
                    <Button key="ok" type="primary" onClick={confirmAddCountry}>CONFIRM</Button>
                ]}
                destroyOnClose
            >
                <Form layout="vertical">
                    <Form.Item label="Country Code">
                        <Input placeholder="JP" value={addCountryCode} onChange={(e) => setAddCountryCode(e.target.value)} />
                    </Form.Item>
                    <Form.Item label="Country Name">
                        <Input placeholder="日本" value={addCountryName} onChange={(e) => setAddCountryName(e.target.value)} />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
};

export default AddTokenModal;
