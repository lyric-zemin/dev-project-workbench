/**
 * 子进程环境净化。
 *
 * 背景：Electron 桌面版把后端 import() 进主进程，二者共享同一个 process.env；
 * 主进程为了向后端传配置会写入 PORT / DWB_* 等变量，而后端 spawn 出的子进程
 * 默认继承整个环境，导致：
 *   - 从应用打开的终端 / 编辑器运行在错误的 NODE_ENV 下；
 *   - 项目自身的 dev server 误用 5177 端口，与后端自身监听冲突。
 * 因此所有派生子进程的地方都必须用 childEnv() 构造干净的环境。
 */

/** 应用自身保留的环境变量：只描述本应用的配置，不应泄漏给子进程 */
const APP_RESERVED_KEYS = ['DWB_PORT', 'DWB_DATA_DIR', 'DWB_DIST_DIR', 'PORT', 'NODE_ENV'];

/**
 * 构造子进程环境。
 *
 * 采用「黑名单剔除」而非「白名单重建」：白名单会误伤用户 shell 里的合法变量
 * （代理配置、各类 SDK token 等），黑名单只剔除应用自身保留的 5 个变量，
 * 其余原样透传。
 *
 * @param {Record<string, string>} [extra] 需要覆盖或追加的额外项（优先级最高）
 * @returns {Record<string, string>}
 */
export function childEnv(extra) {
  const env = { ...process.env };
  for (const key of APP_RESERVED_KEYS) delete env[key];
  return extra ? { ...env, ...extra } : env;
}
