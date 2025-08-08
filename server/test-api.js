import https from 'https';
import http from 'http';

/**
 * 测试登录接口
 * @param {string} username - 用户名
 * @param {string} password - 密码
 */
async function testLoginAPI(username, password) {
  return new Promise((resolve, reject) => {
    // 准备请求数据
    const postData = JSON.stringify({
      username: username,
      password: password
    });

    // 请求选项
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    // 创建请求
    const req = http.request(options, (res) => {
      let data = '';

      // 接收数据
      res.on('data', (chunk) => {
        data += chunk;
      });

      // 请求完成
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('响应状态码:', res.statusCode);
          console.log('响应头:', res.headers);
          console.log('响应数据:', JSON.stringify(response, null, 2));
          
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: response
          });
        } catch (error) {
          console.error('解析响应数据失败:', error);
          reject(error);
        }
      });
    });

    // 错误处理
    req.on('error', (error) => {
      console.error('请求错误:', error);
      reject(error);
    });

    // 发送请求数据
    req.write(postData);
    req.end();
  });
}

/**
 * 执行多个测试用例
 */
async function runTests() {
  console.log('开始测试登录接口...\n');

  // 测试用例
  const testCases = [
    {
      name: '测试有效用户名和密码',
      username: 'tommy',
      password: 'admin123'
    },
    // {
    //   name: '测试无效用户名',
    //   username: 'invalid_user',
    //   password: 'password123'
    // },
    // {
    //   name: '测试空用户名',
    //   username: '',
    //   password: 'password123'
    // },
    // {
    //   name: '测试空密码',
    //   username: 'admin',
    //   password: ''
    // },
    // {
    //   name: '测试错误密码',
    //   username: 'admin',
    //   password: 'wrong_password'
    // }
  ];

  for (let i = 0; i < testCases.length; i++) {
    const testCase = testCases[i];
    console.log(`\n=== ${testCase.name} ===`);
    console.log(`用户名: "${testCase.username}"`);
    console.log(`密码: "${testCase.password}"`);
    
    try {
      const result = await testLoginAPI(testCase.username, testCase.password);
      
      // 根据状态码判断结果
      if (result.statusCode === 200) {
        console.log('✅ 登录成功');
      } else if (result.statusCode === 400) {
        console.log('❌ 输入验证失败');
      } else if (result.statusCode === 401) {
        console.log('❌ 认证失败');
      } else {
        console.log('⚠️ 其他状态:', result.statusCode);
      }
      
    } catch (error) {
      console.error('❌ 测试失败:', error.message);
    }
    
    // 添加延迟避免请求过于频繁
    if (i < testCases.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

/**
 * 单独测试指定用户名和密码
 */
async function testSingleLogin(username, password) {
  console.log('\n=== 单独登录测试 ===');
  console.log(`用户名: "${username}"`);
  console.log(`密码: "${password}"`);
  
  try {
    const result = await testLoginAPI(username, password);
    return result;
  } catch (error) {
    console.error('登录测试失败:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    // 检查命令行参数
    const args = process.argv.slice(2);
    
    if (args.length >= 2) {
      // 如果提供了用户名和密码参数，执行单独测试
      const username = args[0];
      const password = args[1];
      await testSingleLogin(username, password);
    } else {
      // 否则执行所有测试用例
      await runTests();
      
      console.log('\n\n=== 使用说明 ===');
      console.log('要测试特定用户名和密码，请使用:');
      console.log('node test-api.js <用户名> <密码>');
      console.log('例如: node test-api.js admin admin123');
    }
    
  } catch (error) {
    console.error('测试执行失败:', error);
    process.exit(1);
  }
}

// // 导出函数供其他模块使用
// export { testLoginAPI, testSingleLogin };

// // 如果直接运行此文件，执行主函数
// if (import.meta.url === `file://${process.argv[1]}`) {
//   main();
// }

main().catch(error => {
  console.error('主函数执行失败:', error);
  process.exit(1);
});