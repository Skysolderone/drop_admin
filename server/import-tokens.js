import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from './config/database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取JSON数据文件
const dataPath = 'C:\\Users\\hywl\\Downloads\\data (1).json';
const rawData = fs.readFileSync(dataPath, 'utf8');
const jsonData = JSON.parse(rawData);

console.log(`准备导入 ${jsonData.length} 条token数据...`);

// 字段映射函数
function mapJsonToDatabase(jsonItem) {
    return {
        id: null, // 让数据库自动生成ID
        token_name: jsonItem.name,
        token_symbol: jsonItem.symbol,
        token_address: jsonItem.tokenAddress,
        token_desc: JSON.stringify(jsonItem.description || {}),
        logo: jsonItem.tokenLogo || '',
        swap_status: jsonItem.swapSupport === 'yes' ? 1 : 0,
        no_swap_url: jsonItem.swapUrl || '',
        airdrop_status: jsonItem.airdropSupport === 'yes' ? 1 : 0,
        top_status: jsonItem.isPinned === 'yes' ? 1 : 0,
        hot_status: jsonItem.isHot === 'yes' ? 1 : 0,
        priority: jsonItem.priority || 0,
        create_at: new Date(jsonItem.createdAt),
        update_at: new Date(jsonItem.updatedAt)
    };
}

// 批量插入函数
async function batchInsertTokens() {
    try {
        console.log('开始批量插入token数据...');
        
        for (let i = 0; i < jsonData.length; i++) {
            const item = jsonData[i];
            const dbData = mapJsonToDatabase(item);
            
            try {
                // 检查是否已存在（只按地址检查，因为id是自动生成的）
                const existingRows = await query(
                    'SELECT id FROM t_airdrop_token WHERE token_address = ?',
                    [dbData.token_address]
                );
                
                if (existingRows.length > 0) {
                    console.log(`跳过已存在的token: ${dbData.token_name} (${dbData.token_address})`);
                    continue;
                }
                
                // 插入主表数据
                const sql = `INSERT INTO t_airdrop_token (
                    \`id\`, \`token_name\`, \`token_symbol\`, \`token_address\`, 
                    \`token_desc\`, \`logo\`, \`swap_status\`, \`swap_desc\`, 
                    \`no_swap_url\`, \`airdrop_status\`, \`top_status\`, \`hot_status\`, 
                    \`priority\`, \`remark\`, \`authentication\`, \`create_at\`, \`update_at\`
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
                
                const params = [
                    dbData.id,
                    dbData.token_name,
                    dbData.token_symbol,
                    dbData.token_address,
                    dbData.token_desc,
                    dbData.logo,
                    dbData.swap_status,
                    '{}', // swap_desc 默认空对象
                    dbData.no_swap_url,
                    dbData.airdrop_status,
                    dbData.top_status,
                    dbData.hot_status,
                    dbData.priority,
                    '', // remark 默认空
                    0, // authentication 默认0
                    dbData.create_at,
                    dbData.update_at
                ];
                
                const result = await query(sql, params);
                const insertedId = result.insertId; // 获取自动生成的ID
                console.log(`✓ 成功插入: ${dbData.token_name} (ID: ${insertedId}) (${i + 1}/${jsonData.length})`);
                
                // 如果有swapReason且swap不支持，插入多语言原因表
                if (dbData.swap_status === 0 && item.swapReason && typeof item.swapReason === 'object') {
                    const reasonEntries = Object.entries(item.swapReason).filter(([_, v]) => v && v.trim() !== '');
                    if (reasonEntries.length > 0) {
                        const langVals = [];
                        const langPlaceholders = [];
                        for (const [code, value] of reasonEntries) {
                            langPlaceholders.push('(?, ?, ?, ?, ?)');
                            langVals.push(insertedId, code, value, dbData.create_at, dbData.update_at);
                        }
                        const langSql = `INSERT INTO t_airdrop_lans (lan_key, lan_code, lan_value, create_at, update_at) VALUES ${langPlaceholders.join(', ')}`;
                        await query(langSql, langVals);
                        console.log(`  ✓ 插入多语言原因 ${reasonEntries.length} 条`);
                    }
                }
                
                // 如果有acquisitionMethods且airdrop支持，插入空投方法表
                if (dbData.airdrop_status === 1 && Array.isArray(item.acquisitionMethods) && item.acquisitionMethods.length > 0) {
                    const methodVals = [];
                    const methodPlaceholders = [];
                    for (const method of item.acquisitionMethods) {
                        // 获取图片URL（从images对象中的en字段）
                        let img_url = '';
                        if (method.images && typeof method.images === 'object') {
                            img_url = method.images.en || '';
                        }
                        
                        methodPlaceholders.push('(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                        methodVals.push(
                            null, // id 自增
                            insertedId, // token_id
                            1, // status 默认启用
                            method.url || '', // url
                            img_url, // img_url
                            parseInt(method.priority) || 0, // rank（使用priority字段）
                            parseInt(method.priority) || 0, // priority（使用priority字段）
                            0, // amount_day 默认0
                            0, // value_day 默认0
                            JSON.stringify([]), // countries 默认空数组
                            JSON.stringify(['android', 'ios']), // device_support 默认支持
                            null, // offline_date 默认null
                            1, // token_status 默认启用
                            '', // remark 默认空
                            dbData.create_at, // create_at
                            dbData.update_at // update_at
                        );
                    }
                    if (methodPlaceholders.length > 0) {
                        const methodSql = `INSERT INTO t_airdrop_imgs (\`id\`, \`token_id\`, \`status\`, \`url\`, \`img_url\`, \`rank\`, \`priority\`, \`amount_day\`, \`value_day\`, \`countries\`, \`device_support\`, \`offline_date\`, \`token_status\`, \`remark\`, \`create_at\`, \`update_at\`) VALUES ${methodPlaceholders.join(', ')}`;
                        await query(methodSql, methodVals);
                        console.log(`  ✓ 插入空投方法 ${item.acquisitionMethods.length} 条`);
                    }
                }
                
            } catch (itemError) {
                console.error(`✗ 插入失败: ${dbData.token_name}`, itemError.message);
            }
        }
        
        console.log('批量导入完成！');
        
    } catch (error) {
        console.error('批量导入失败:', error);
    }
}

// 执行导入
batchInsertTokens().then(() => {
    console.log('导入脚本执行完成');
    process.exit(0);
}).catch(error => {
    console.error('导入脚本执行失败:', error);
    process.exit(1);
});