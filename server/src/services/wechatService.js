const config = require('../config');

async function exchangeWechatCode(code) {
  const appId = config.wechatAppId;
  const appSecret = config.wechatAppSecret;
  const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${appId}&secret=${appSecret}&js_code=${code}&grant_type=authorization_code`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.errcode) {
    throw new Error(`微信登录失败: ${data.errmsg}`);
  }

  return data.openid;
}

module.exports = { exchangeWechatCode };
