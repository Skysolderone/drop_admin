import React, { useState } from 'react';
import dayjs from 'dayjs';
import { Modal, Form, Tabs, Row, Col, Input, Radio, Upload, Button, message, Card, DatePicker, Checkbox } from 'antd';
import { UploadOutlined, CloseOutlined, WarningFilled } from '@ant-design/icons';
// import api from '../lib/axios';

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

    const handleSave = async () => {
        try {
            const values = await form.validateFields();

            // 统一标准化输出，贴近旧项目逻辑
            const output: any = { ...values };

            // 1) 代币 Logo 处理
            if (Array.isArray(values.tokenLogo)) {
                if (values.tokenLogo.length === 0) {
                    // 用户主动删除了 Logo：显式清空
                    output.logo = '';
                } else if (values.tokenLogo.length > 0) {
                    const f0 = values.tokenLogo[0];
                    if (f0?.url) {
                        output.logo = f0.url; // 优先使用已上传的 URL
                    } else if (f0?.originFileObj) {
                        // 兼容：未走自定义上传时，仍可提交 File
                        output.tokenLogo = f0.originFileObj as File;
                    }
                }
            } else if (initialValues?.logo) {
                // 编辑态且未触碰该字段：保留旧值
                output.logo = initialValues.logo;
            }

            // 2) Airdrop 方法归一化（按新UI结构）
            if (airdropSupport === 'yes' && Array.isArray(values.airdropMethods)) {
                output.airdropMethods = values.airdropMethods.map((m: any) => {
                    // 使用上传后的 URL，避免后端拿不到 img_url
                    const imageUrl = Array.isArray(m?.image) && m.image[0]?.url ? m.image[0].url : undefined;
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
            }

            setSaving(true);
            const res = await onSave(output);
            const code = (res && (res.code ?? res.status ?? res?.data?.code)) as number | undefined;
            const ok = code === 200;
            if (ok) {
                // 成功：清空并关闭
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
            // 表单验证失败时，滚动到第一个错误字段
            if (error && typeof error === 'object' && 'errorFields' in error) {
                const errorFields = (error as any).errorFields;
                if (Array.isArray(errorFields) && errorFields.length > 0) {
                    message.error(`请检查必填字段：${errorFields.map((f: any) => f.errors?.join('，')).filter(Boolean).join('；')}`);
                }
            } else {
                message.error('表单验证失败，请检查必填字段');
            }
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        setSwapSupport('yes');
        setAirdropSupport('yes');
        onCancel();
    };

    // 打开“新增国家”模态框
    const openAddCountryModal = (methodIndex: number) => {
        setAddCountryTarget(methodIndex);
        setAddCountryCode('');
        setAddCountryName('');
        setAddCountryVisible(true);
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

    // 进入弹窗时回填
    React.useEffect(() => {
        if (visible) {
            const iv = initialValues || {};
            const isTrue = (v: any) => v === 1 || v === '1' || v === true;
            const isFalse = (v: any) => v === 0 || v === '0' || v === false;
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
                priority: iv.priority != null ? Number(iv.priority) : 0,
                isPinned: iv.isPinned != null ? iv.isPinned : (isTrue(iv.top_status) ? 'yes' : 'no'),
                isHot: iv.isHot != null ? iv.isHot : (isTrue(iv.hot_status) ? 'yes' : 'no'),
                swapSupport: iv.swapSupport != null ? iv.swapSupport : (isFalse(iv.swap_status) ? 'no' : 'yes'),
                airdropSupport: iv.airdropSupport != null ? iv.airdropSupport : (isTrue(iv.airdrop_status) ? 'yes' : 'no'),
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
                    form.setFieldsValue({
                        tokenLogo: [{ uid: '-1', name: 'logo.png', status: 'done', url: iv.logo }]
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
                        // Upload fileList：标准化 URL，补 '/' 并兼容旧前缀
                        let img = m?.imageUrl as string | undefined;
                        if (img && !/^https?:\/\//i.test(img)) {
                            if (!img.startsWith('/')) img = `/${img}`;
                            img = img.replace(/^\/uploadsurlpic\//i, '/uploadurlpic/');
                        }
                        const fileList = img ? [{ uid: `img-${idx}`, name: 'image.png', status: 'done', url: img }] : [];
                        // DatePicker 值
                        const offlineVal = m?.offlineDate ? dayjs(m.offlineDate) : undefined;
                        return {
                            openingStatus: m?.openingStatus ?? 'enable',
                            url: m?.url ?? '',
                            image: fileList,
                            rank: m?.rank ?? undefined,
                            amountPerDay: m?.amountPerDay ?? undefined,
                            valuePerDay: m?.valuePerDay ?? undefined,
                            countries: countriesArr,
                            devices: devicesArr,
                            offlineDate: offlineVal,
                            oneOffStatus: m?.oneOffStatus ?? 'disable',
                        };
                    });
                    form.setFieldsValue({ airdropMethods: mapped });
                }).catch(() => {/* ignore */ });
            }
        }
    }, [visible, initialValues]);

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
                const res = await api.post('/api/upload', formData, {
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
                // 归一化路径：加前导斜杠并兼容旧前缀
                if (!/^https?:\/\//i.test(url)) {
                    if (!url.startsWith('/')) url = `/${url}`;
                    url = url.replace(/^\/uploadsurlpic\//i, '/uploadurlpic/');
                }

                // 让 Upload 自身接管 fileList：为文件设置 url，返回成功
                (file as any).url = url;
                if (onSuccess) onSuccess({ url });
            } catch (e: any) {
                message.error(e?.message || '上传失败');
                if (onError) onError(e);
            }
        }
    } as any;

    // Airdrop 方法图片专用上传（保存到 /uploadurlpic）
    const airdropUploadProps = {
        beforeUpload: uploadProps.beforeUpload,
        customRequest: async (options: any) => {
            const { file, onSuccess, onError, onProgress } = options;
            try {
                const formData = new FormData();
                formData.append('file', file as File);
                const res = await api.post('/api/uploadurlpic', formData, {
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
                if (!/^https?:\/\//i.test(url)) {
                    if (!url.startsWith('/')) url = `/${url}`;
                    url = url.replace(/^\/uploadsurlpic\//i, '/uploadurlpic/');
                }
                (file as any).url = url;
                if (onSuccess) onSuccess({ url });
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

                    <div>
                        <div className="ant-form-item-label"><label className="ant-form-item-required">代币简介 (多语言)</label></div>
                        <Row gutter={[16, 16]}>
                            <Col span={12}>
                                <Form.Item name={['description', 'en']} rules={[{ required: true, message: '请填写英文简介' }]}>
                                    <TextArea placeholder="请输入English代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (English) *</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'zh-TW']}>
                                    <TextArea placeholder="请输入繁體中文代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (繁體中文)</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'ja']}>
                                    <TextArea placeholder="请输入日本語代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (日本語)</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'hi']}>
                                    <TextArea placeholder="请输入हिन्दी代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (हिन्दी)</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'pl']}>
                                    <TextArea placeholder="请输入Polski代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (Polski)</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'es']}>
                                    <TextArea placeholder="请输入Español代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (Español)</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'pt']}>
                                    <TextArea placeholder="请输入Português代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (Português)</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'ms']}>
                                    <TextArea placeholder="请输入Bahasa Melayu代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (Bahasa Melayu)</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'id']}>
                                    <TextArea placeholder="请输入Bahasa Indonesia代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (Bahasa Indonesia)</div>
                            </Col>
                            <Col span={12}>
                                <Form.Item name={['description', 'ko']}>
                                    <TextArea placeholder="请输入한국어代币简介" autoSize={{ minRows: 2, maxRows: 4 }} />
                                </Form.Item>
                                <div className="text-xs text-gray-500 -mt-2 mb-2">简介 (한국어)</div>
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
                            listType="picture"
                            accept="image/*"
                            defaultFileList={initialValues?.logo ? [{ uid: '-1', name: 'logo.png', status: 'done', url: initialValues.logo } as any] : undefined}
                        >
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
                                        name="swapReason_zh-TW"
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
                            <div className="text-xs text-gray-500" style={{ marginTop: -8, marginBottom: 4 }}>Click to input priority rank (1-999)</div>
                            <Form.Item name="priority" label="Priority">
                                <Input type="number" min={1} max={999} placeholder="" />
                            </Form.Item>
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
                                                                    // 兼容多种来源：file.url、上传响应、thumbUrl、本地文件
                                                                    let url: string | undefined =
                                                                        file?.url ||
                                                                        file?.thumbUrl ||
                                                                        (file?.response?.url ?? file?.response?.data?.url);

                                                                    // 补齐相对路径前缀，确保以 / 开头（便于被 Vite 代理到后端）
                                                                    if (url && !/^https?:\/\//i.test(url)) {
                                                                        if (!url.startsWith('/')) url = `/${url}`;
                                                                        // 兼容旧数据：统一到 /uploadurlpic
                                                                        url = url.replace(/^\/uploadsurlpic\//i, '/uploadurlpic/');
                                                                    }

                                                                    // 最后回退：本地对象 URL（仅在未拿到线上地址时使用）
                                                                    if (!url && file?.originFileObj) {
                                                                        try {
                                                                            url = URL.createObjectURL(file.originFileObj);
                                                                        } catch { }
                                                                    }

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
                                                                                <img
                                                                                    src={url}
                                                                                    alt="预览"
                                                                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
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
                                                                <Input type="number" min={1} max={999} placeholder="1-999" />
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
                                                                <Input type="number" min={0} placeholder="" />
                                                            </Form.Item>
                                                        </Col>
                                                        <Col span={12}>
                                                            <Form.Item
                                                                {...restField}
                                                                name={[field.name, 'valuePerDay']}
                                                                fieldKey={[field.fieldKey!, 'valuePerDay']}
                                                                label="Value/day"
                                                            >
                                                                <Input type="number" min={0} placeholder="" />
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
                                                            <Radio value="disable">Disable (Default)</Radio>
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
