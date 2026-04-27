/**
 * 消息常量
 * 按业务模块分类，统一管理系统提示消息
 */

export const AUTH = {
  LOGIN_SUCCESS: '登录成功',
  LOGIN_FAILED: '登录失败，请检查账号密码',
  LOGOUT_SUCCESS: '退出登录成功',
  REGISTER_SUCCESS: '注册成功',
  REGISTER_FAILED: '注册失败',
  TOKEN_EXPIRED: '登录已过期，请重新登录',
  UNAUTHORIZED: '请先登录',
  FORBIDDEN: '没有操作权限',
  NICKNAME_REQUIRED: '请输入昵称',
  PASSWORD_REQUIRED: '请输入密码',
  PASSWORD_TOO_SHORT: '密码长度不能少于6位',
  PASSWORD_MISMATCH: '两次输入的密码不一致'
}

export const CHECKIN = {
  CHECKIN_SUCCESS: '打卡成功',
  CHECKIN_FAILED: '打卡失败',
  ALREADY_CHECKED_IN: '今日已完成打卡',
  STREAK_BROKEN: '连续打卡中断了，重新开始吧',
  STREAK_KEEP: '连续打卡 {days} 天，继续保持！',
  TASK_COMPLETED: '任务已完成',
  TASK_NOT_FOUND: '任务不存在',
  FETCH_TASKS_FAILED: '获取任务列表失败',
  FETCH_STREAK_FAILED: '获取连续打卡数据失败'
}

export const LOTTERY = {
  DRAW_SUCCESS: '抽奖成功',
  DRAW_FAILED: '抽奖失败',
  NO_CHANCE: '今日抽奖次数已用完',
  POINTS_NOT_ENOUGH: '积分不足',
  PRIZE_WON: '恭喜获得 {prize}',
  THANKS: '谢谢参与',
  FETCH_PRIZES_FAILED: '获取奖品列表失败'
}

export const UPLOAD = {
  UPLOAD_SUCCESS: '上传成功',
  UPLOAD_FAILED: '上传失败',
  FILE_TOO_LARGE: '文件大小超过限制',
  INVALID_FILE_TYPE: '不支持的文件类型',
  SELECT_FILE: '请选择文件',
  UPLOADING: '上传中...'
}

export const COMMON = {
  SAVE_SUCCESS: '保存成功',
  SAVE_FAILED: '保存失败',
  DELETE_SUCCESS: '删除成功',
  DELETE_FAILED: '删除失败',
  UPDATE_SUCCESS: '更新成功',
  UPDATE_FAILED: '更新失败',
  FETCH_FAILED: '获取数据失败',
  NETWORK_ERROR: '网络错误，请稍后重试',
  SERVER_ERROR: '服务器繁忙，请稍后重试',
  UNKNOWN_ERROR: '未知错误',
  CONFIRM_DELETE: '确认删除吗？此操作不可撤销',
  CONFIRM_CANCEL: '确认取消吗？',
  LOADING: '加载中...',
  PLEASE_WAIT: '请稍候...',
  OPERATION_SUCCESS: '操作成功',
  OPERATION_FAILED: '操作失败'
}
