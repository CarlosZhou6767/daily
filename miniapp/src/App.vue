<!--
  小程序根组件
  uni-app 应用生命周期入口，全局样式定义
-->
<script>
export default {
  onLaunch() {
  },
  onError(err) {
    console.error('全局错误:', err)
  },
  onUnhandledRejection(err) {
    console.error('未处理的Promise拒绝:', err)
  },
}
</script>

<style>
/* 全局页面背景色 */
page {
  background-color: #f8fafc;
}
</style>
