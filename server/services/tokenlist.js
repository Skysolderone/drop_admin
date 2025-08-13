
import { query } from '../config/database.js';


const TokenList = {
    list: async (pageIndex = 0, pageSize = 10) => {
        try {
            // 确保参数为正整数
            const safePageIndex = Math.max(0, parseInt(pageIndex) || 0);
            const safePageSize = Math.max(1, Math.min(100, parseInt(pageSize) || 10)); // 限制最大100条
            const offset = safePageIndex * safePageSize;
            
            console.log(`Fetching market data with pageIndex: ${safePageIndex}, pageSize: ${safePageSize}, offset: ${offset}`);
            
            // 使用更兼容的 LIMIT 语法
            const sql = `SELECT * FROM t_airdrop_token ORDER BY create_at DESC LIMIT ${safePageSize} OFFSET ${offset}`;
            console.log('执行 SQL:', sql);
            
            const tokens = await query(sql);
            // 追加：读取 t_airdrop_lans 聚合原因，便于前端编辑态回填
            try {
                const ids = (tokens || []).map(t => t?.id).filter(Boolean);
                if (ids.length > 0) {
                    const ph = ids.map(() => '?').join(',');
                    const lansRows = await query(
                        `SELECT lan_key, lan_code, lan_value FROM t_airdrop_lans WHERE lan_key IN (${ph})`,
                        ids
                    );
                    const byKey = new Map();
                    for (const r of lansRows || []) {
                        const k = r.lan_key;
                        if (!byKey.has(k)) byKey.set(k, {});
                        byKey.get(k)[r.lan_code] = r.lan_value;
                    }
                    for (const t of tokens) {
                        if (!t) continue;
                        const m = byKey.get(t.id);
                        if (m && Object.keys(m).length > 0) {
                            t.swap_desc = JSON.stringify(m);
                        } else if (!t.swap_desc) {
                            t.swap_desc = '{}';
                        }
                    }
                }
            } catch (aggErr) {
                console.error('聚合 t_airdrop_lans 失败（忽略不中断）:', aggErr);
            }
            return tokens;
        } catch (error) {
            console.error('TokenList.list 错误:', error);
            throw error;
        }
    },

    count: async () => {
        try {
            const sql = 'SELECT COUNT(*) as total FROM t_airdrop_token';
            console.log('执行计数 SQL:', sql);
            
            const result = await query(sql);
            return result[0]?.total || 0;
        } catch (error) {
            console.error('TokenList.count 错误:', error);
            throw error;
        }
    },

    adds: async (data) => {
        console.log('TokenList.adds 入参:', data);
        try {
            // 映射并提供默认值，尽量兼容前端字段命名
            const id = data.id || data.address || null;
            const token_name = data.name || data.token_name || data.tokenName || '';
            const token_symbol = data.symbol || data.token_symbol || data.tokenSymbol || '';
            const token_address = data.address || data.token_address || data.tokenAddress || '';
            const token_desc = typeof data.token_desc === 'string'
                ? data.token_desc
                : JSON.stringify(data.description || {});
            const logo = data.logo || data.icon || data.tokenLogo || '';
            const swap_status = data.swap_status != null
                ? Number(data.swap_status)
                : (data.swapSupport === 'no' ? 0 : 1);
            // 不再把原因实际内容持久化到 token.swap_desc；仅用于兼容保留空对象
            const swap_desc = '{}';
            const no_swap_url = data.no_swap_url || data.swapUrl || '';
            const airdrop_status = data.airdrop_status != null
                ? Number(data.airdrop_status)
                : (data.airdropSupport === 'yes' ? 1 : 0);
            const top_status = data.top_status != null
                ? Number(data.top_status)
                : (data.isPinned === 'yes' ? 1 : 0);
            const hot_status = data.hot_status != null
                ? Number(data.hot_status)
                : (data.isHot === 'yes' ? 1 : 0);
            const priority = Number(data.priority || 0);
            const remark = data.remark || '';

            const now = new Date();
            const sql = `INSERT INTO t_airdrop_token (\`id\`, \`token_name\`, \`token_symbol\`, \`token_address\`, \`token_desc\`, \`logo\`, \`swap_status\`, \`swap_desc\`, \`no_swap_url\`, \`airdrop_status\`, \`top_status\`, \`hot_status\`, \`priority\`, \`remark\`, \`create_at\`, \`update_at\`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
            const params = [
                id,
                token_name,
                token_symbol,
                token_address,
                token_desc,
                logo,
                swap_status,
                swap_desc,
                no_swap_url,
                airdrop_status,
                top_status,
                hot_status,
                priority,
                remark,
                now,
                now
            ];
            console.log('执行插入 SQL:', sql, '参数:', params);

            const result = await query(sql, params);
            const insertedId = result.insertId || data.id || null;

            // 当 swap 不支持时，将多语言原因写入 t_airdrop_lans
            try {
                if (Number(swap_status) !== 1) {
                    // 解析 swap_desc JSON
                    let reasonObj = {};
                    if (data.swapReason && typeof data.swapReason === 'object') {
                        reasonObj = data.swapReason;
                    } else if (typeof data.swap_desc === 'string') {
                        try { reasonObj = JSON.parse(data.swap_desc); } catch { reasonObj = {}; }
                    } else if (data.swap_desc && typeof data.swap_desc === 'object') {
                        reasonObj = data.swap_desc;
                    }

                    const entries = Object.entries(reasonObj).filter(([_, v]) => (v ?? '').toString().trim() !== '');
                    if (insertedId && entries.length > 0) {
                        const now = new Date();
                        // 构建多行插入
                        const vals = [];
                        const placeholders = [];
                        for (const [code, value] of entries) {
                            placeholders.push('(?, ?, ?, ?, ?)');
                            vals.push(insertedId, String(code), String(value), now, now);
                        }
                        const sqlLans = `INSERT INTO t_airdrop_lans (lan_key, lan_code, lan_value, create_at, update_at) VALUES ${placeholders.join(', ')}`;
                        console.log('写入 t_airdrop_lans SQL:', sqlLans, '参数:', vals);
                        await query(sqlLans, vals);
                    }
                }
            } catch (lanErr) {
                console.error('写入 t_airdrop_lans 失败（忽略不中断）:', lanErr);
            }

            // 当 Airdrop 支持时，写入 t_airdrop_imgs（按 airdropMethods 映射）
            try {
                if (Number(airdrop_status) === 1 && Array.isArray(data.airdropMethods) && data.airdropMethods.length > 0) {
                    // 解析 tokenId：优先使用显式 id/insertId，其次通过地址回查
                    let tokenId = insertedId || id || null;
                    if (!tokenId) {
                        try {
                            const rows = await query('SELECT id FROM t_airdrop_token WHERE token_address = ? ORDER BY create_at DESC LIMIT 1', [token_address]);
                            tokenId = rows?.[0]?.id || null;
                        } catch (idErr) {
                            console.error('回查 token id 失败（忽略不中断）:', idErr);
                        }
                    }
                    if (tokenId) {
                        const now = new Date();
                        const placeholders = [];
                        const vals = [];
                        for (const m of data.airdropMethods) {
                            // 映射字段
                            const status = m?.openingStatus === 'enable' ? 1 : 0;
                            const url = (m?.url ?? '').toString();
                            // 兼容不同前端形态：imageUrl 或 Upload fileList
                            let img_url = '';
                            if (typeof m?.imageUrl === 'string' && m.imageUrl) {
                                img_url = m.imageUrl;
                            } else if (Array.isArray(m?.image) && m.image.length > 0) {
                                const f = m.image[0] || {};
                                img_url = f.url || f.response?.url || f.thumbUrl || '';
                            } else if (typeof m?.image === 'string') {
                                img_url = m.image;
                            }
                            const rankVal = Number(m?.rank ?? 0) || 0;
                            const amountDay = Number(m?.amountPerDay ?? 0) || 0;
                            const valueDay = Number(m?.valuePerDay ?? 0) || 0;
                            const countries = Array.isArray(m?.countries) ? JSON.stringify(m.countries) : JSON.stringify([]);
                            const deviceSupport = Array.isArray(m?.devices) ? JSON.stringify(m.devices) : JSON.stringify(['android','ios']);
                            const offlineDate = m?.offlineDate ? new Date(m.offlineDate) : null;
                            const tokenStatus = m?.oneOffStatus === 'enable' ? 1 : 0;
                            const remarkVal = (m?.remark ?? '').toString();

                            placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                            // id 使用 null（自增），其余字段按列顺序写入
                            vals.push(
                                null, // id (auto-increment)
                                tokenId,
                                status,
                                url,
                                img_url,
                                rankVal,
                                amountDay,
                                valueDay,
                                countries,
                                deviceSupport,
                                offlineDate,
                                tokenStatus,
                                remarkVal,
                                now,
                                now
                            );
                        }
                        if (placeholders.length > 0) {
                            const sqlImgs = `INSERT INTO t_airdrop_imgs (\`id\`, \`token_id\`, \`status\`, \`url\`, \`img_url\`, \`rank\`, \`amount_day\`, \`value_day\`, \`countries\`, \`device_support\`, \`offline_date\`, \`token_status\`, \`remark\`, \`create_at\`, \`update_at\`) VALUES ${placeholders.join(', ')}`;
                            console.log('写入 t_airdrop_imgs SQL:', sqlImgs, '参数长度:', vals.length);
                            await query(sqlImgs, vals);
                        }
                    }
                }
            } catch (imgErr) {
                console.error('写入 t_airdrop_imgs 失败（忽略不中断）:', imgErr);
            }

            return insertedId;
        } catch (error) {
            console.error('TokenList.adds 错误:', error);
            throw error;
        }
    }
    ,
    // 获取单个 token 详情（含多语言原因与 airdrop 方法）
    detail: async (idOrAddress) => {
        try {
            const rows = await query('SELECT * FROM t_airdrop_token WHERE id = ? OR token_address = ? LIMIT 1', [idOrAddress, idOrAddress]);
            const token = rows?.[0];
            if (!token) return null;
            // 附带 swap_desc 聚合（沿用 list 逻辑）
            try {
                const lansRows = await query('SELECT lan_code, lan_value FROM t_airdrop_lans WHERE lan_key = ?', [token.id]);
                const m = {};
                for (const r of lansRows || []) m[r.lan_code] = r.lan_value;
                token.swap_desc = JSON.stringify(m);
            } catch (e) {
                // 忽略不中断
            }
            // 查询 airdrop 方法
            try {
                const imgs = await query('SELECT * FROM t_airdrop_imgs WHERE \`token_id\` = ? ORDER BY \`rank\` ASC, \`id\` ASC', [token.id]);
                // 转前端结构
                token.airdropMethods = (imgs || []).map((r) => ({
                    openingStatus: Number(r.status) === 1 ? 'enable' : 'disable',
                    url: r.url || '',
                    imageUrl: r.img_url || '',
                    rank: r.rank || 0,
                    amountPerDay: r.amount_day || 0,
                    valuePerDay: r.value_day || 0,
                    countries: (() => { try { return JSON.parse(r.countries || '[]'); } catch { return []; } })(),
                    devices: (() => { try { return JSON.parse(r.device_support || '[]'); } catch { return ['android','ios']; } })(),
                    offlineDate: r.offline_date ? new Date(r.offline_date) : null,
                    oneOffStatus: Number(r.token_status) === 1 ? 'enable' : 'disable',
                    remark: r.remark || '',
                }));
            } catch (e) {
                token.airdropMethods = [];
            }
            return token;
        } catch (error) {
            console.error('TokenList.detail 错误:', error);
            throw error;
        }
    },
    update: async (data) => {
        console.log('TokenList.update 入参:', data);
        try {
            const idOrAddress = data.id || data.address || data.tokenAddress;
            if (!idOrAddress) throw new Error('缺少主键 id/address');

            const token_name = data.name || data.token_name || data.tokenName;
            const token_symbol = data.symbol || data.token_symbol || data.tokenSymbol;
            const token_address = data.token_address || data.tokenAddress || data.address; // 允许修改
            const token_desc = typeof data.token_desc === 'string'
                ? data.token_desc
                : (data.description ? JSON.stringify(data.description) : undefined);
            // logo：允许显式清空（当前端传入空字符串时）
            const hasLogo = Object.prototype.hasOwnProperty.call(data, 'logo');
            const logo = hasLogo ? data.logo : (data.logo || data.icon || data.tokenLogo); // 可选，可为空串
            const swap_status = data.swap_status != null
                ? Number(data.swap_status)
                : (data.swapSupport != null ? (data.swapSupport === 'no' ? 0 : 1) : undefined);
            // 更新时清空 token.swap_desc，避免把原因内容写在主表
            const swap_desc = '{}';
            const no_swap_url = data.no_swap_url || data.swapUrl;
            const airdrop_status = data.airdrop_status != null
                ? Number(data.airdrop_status)
                : (data.airdropSupport != null ? (data.airdropSupport === 'yes' ? 1 : 0) : undefined);
            const top_status = data.top_status != null
                ? Number(data.top_status)
                : (data.isPinned != null ? (data.isPinned === 'yes' ? 1 : 0) : undefined);
            const hot_status = data.hot_status != null
                ? Number(data.hot_status)
                : (data.isHot != null ? (data.isHot === 'yes' ? 1 : 0) : undefined);
            const priority = data.priority != null ? Number(data.priority) : undefined;
            const remark = data.remark;

            // 动态构建 SET 子句
            const sets = [];
            const params = [];
            const pushSet = (col, val) => { if (val !== undefined) { sets.push(`\`${col}\` = ?`); params.push(val); } };
            pushSet('token_name', token_name);
            pushSet('token_symbol', token_symbol);
            pushSet('token_address', token_address);
            pushSet('token_desc', token_desc);
            pushSet('logo', logo);
            pushSet('swap_status', swap_status);
            pushSet('swap_desc', swap_desc);
            pushSet('no_swap_url', no_swap_url);
            pushSet('airdrop_status', airdrop_status);
            pushSet('top_status', top_status);
            pushSet('hot_status', hot_status);
            pushSet('priority', priority);
            pushSet('remark', remark);
            // 更新更新时间
            pushSet('update_at', new Date());

            if (sets.length === 0) return { affectedRows: 0 };

            const where = '(`id` = ? OR `token_address` = ?)';
            params.push(idOrAddress, idOrAddress);
            const sql = `UPDATE t_airdrop_token SET ${sets.join(', ')} WHERE ${where}`;
            console.log('执行更新 SQL:', sql, '参数:', params);
            const result = await query(sql, params);

            // 维护 t_airdrop_lans
            try {
                // 解析/判定 swap 状态与原因
                const swapStatusVal = swap_status;
                let reasonObj = undefined;
                if (data.swapReason && typeof data.swapReason === 'object') {
                    reasonObj = data.swapReason;
                } else if (typeof data.swap_desc === 'string') {
                    try { reasonObj = JSON.parse(data.swap_desc); } catch { reasonObj = undefined; }
                } else if (data.swap_desc && typeof data.swap_desc === 'object') {
                    reasonObj = data.swap_desc;
                }

                // 需要实际的 token id
                let tokenId = undefined;
                try {
                    const rows = await query('SELECT id FROM t_airdrop_token WHERE id = ? OR token_address = ? LIMIT 1', [idOrAddress, idOrAddress]);
                    tokenId = rows?.[0]?.id;
                } catch (idErr) {
                    console.error('查询 token id 失败:', idErr);
                }

                if (tokenId) {
                    if (swapStatusVal === 1) {
                        // 支持 Swap：删除对应语言行
                        await query('DELETE FROM t_airdrop_lans WHERE lan_key = ?', [tokenId]);
                    } else if (swapStatusVal === 0 && reasonObj) {
                        // 不支持：用新内容替换
                        await query('DELETE FROM t_airdrop_lans WHERE lan_key = ?', [tokenId]);
                        const entries = Object.entries(reasonObj).filter(([_, v]) => (v ?? '').toString().trim() !== '');
                        if (entries.length > 0) {
                            const now = new Date();
                            const vals = [];
                            const placeholders = [];
                            for (const [code, value] of entries) {
                                placeholders.push('(?, ?, ?, ?, ?)');
                                vals.push(tokenId, String(code), String(value), now, now);
                            }
                            const sqlLans = `INSERT INTO t_airdrop_lans (lan_key, lan_code, lan_value, create_at, update_at) VALUES ${placeholders.join(', ')}`;
                            console.log('更新 t_airdrop_lans SQL:', sqlLans, '参数:', vals);
                            await query(sqlLans, vals);
                        }
                    }
                    // 同步 t_airdrop_imgs：当 Airdrop 支持时，用新的 airdropMethods 全量替换
                    if (airdrop_status === 1 && Array.isArray(data.airdropMethods)) {
                        try {
                            // 先清空旧记录
                            await query('DELETE FROM t_airdrop_imgs WHERE \`token_id\` = ?', [tokenId]);
                            if (data.airdropMethods.length > 0) {
                                const now = new Date();
                                const placeholders = [];
                                const vals = [];
                                for (const m of data.airdropMethods) {
                                    const status = m?.openingStatus === 'enable' ? 1 : 0;
                                    const url = (m?.url ?? '').toString();
                                    let img_url = '';
                                    if (typeof m?.imageUrl === 'string' && m.imageUrl) {
                                        img_url = m.imageUrl;
                                    } else if (Array.isArray(m?.image) && m.image.length > 0) {
                                        const f = m.image[0] || {};
                                        img_url = f.url || f.response?.url || f.thumbUrl || '';
                                    } else if (typeof m?.image === 'string') {
                                        img_url = m.image;
                                    }
                                    const rankVal = Number(m?.rank ?? 0) || 0;
                                    const amountDay = Number(m?.amountPerDay ?? 0) || 0;
                                    const valueDay = Number(m?.valuePerDay ?? 0) || 0;
                                    const countries = Array.isArray(m?.countries) ? JSON.stringify(m.countries) : JSON.stringify([]);
                                    const deviceSupport = Array.isArray(m?.devices) ? JSON.stringify(m.devices) : JSON.stringify(['android','ios']);
                                    const offlineDate = m?.offlineDate ? new Date(m.offlineDate) : null;
                                    const tokenStatus = m?.oneOffStatus === 'enable' ? 1 : 0;
                                    const remarkVal = (m?.remark ?? '').toString();

                                    placeholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                                    vals.push(
                                        null,
                                        tokenId,
                                        status,
                                        url,
                                        img_url,
                                        rankVal,
                                        amountDay,
                                        valueDay,
                                        countries,
                                        deviceSupport,
                                        offlineDate,
                                        tokenStatus,
                                        remarkVal,
                                        now,
                                        now
                                    );
                                }
                                const sqlImgs = `INSERT INTO t_airdrop_imgs (\`id\`, \`token_id\`, \`status\`, \`url\`, \`img_url\`, \`rank\`, \`amount_day\`, \`value_day\`, \`countries\`, \`device_support\`, \`offline_date\`, \`token_status\`, \`remark\`, \`create_at\`, \`update_at\`) VALUES ${placeholders.join(', ')}`;
                                console.log('更新 t_airdrop_imgs SQL:', sqlImgs, '参数长度:', vals.length);
                                await query(sqlImgs, vals);
                            }
                        } catch (imgErr) {
                            console.error('更新 t_airdrop_imgs 失败（忽略不中断）:', imgErr);
                        }
                    } else if (airdrop_status === 0) {
                        // 不支持时清空
                        try { await query('DELETE FROM t_airdrop_imgs WHERE \`token_id\` = ?', [tokenId]); } catch {}
                    }
                }
            } catch (lanErr) {
                console.error('更新 t_airdrop_lans 失败（忽略不中断）:', lanErr);
            }

            return result;
        } catch (error) {
            console.error('TokenList.update 错误:', error);
            throw error;
        }
    }
    ,
    lansByKey: async (lanKey) => {
        try {
            const rows = await query('SELECT lan_code, lan_value FROM t_airdrop_lans WHERE lan_key = ?', [lanKey]);
            const mapping = {};
            for (const r of rows || []) {
                mapping[r.lan_code] = r.lan_value;
            }
            return mapping;
        } catch (error) {
            console.error('TokenList.lansByKey 错误:', error);
            throw error;
        }
    },
    //存图片
  
};
export default TokenList;