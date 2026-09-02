import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { CheckCircle2, CircleSlash, Loader2, Square, XCircle } from 'lucide-react';
import Modal from './Modal';
import { api, subscribeBuild } from '@/lib/api';
import { toast } from '@/stores/toastStore';
import type { BuildJob, Project } from '@/types';

interface BuildLogModalProps {
  open: boolean;
  job: BuildJob | null;
  project: Project | null;
  onClose: () => void;
  onStatusChange?: (status: BuildJob['status']) => void;
}

export default function BuildLogModal({ open, job, project, onClose, onStatusChange }: BuildLogModalProps) {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<BuildJob['status']>('running');
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef(true);

  useEffect(() => {
    if (!open || !job) return;
    setLogs(job.logs ?? []);
    setStatus(job.status);
    setExitCode(job.exitCode);
    setElapsed(0);

    const start = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - start), 500);

    const unsubscribe = subscribeBuild(job.id, {
      onSnapshot: (snapshot) => {
        setLogs(snapshot.logs ?? []);
        setStatus(snapshot.status);
        setExitCode(snapshot.exitCode);
      },
      onLog: () => {
        // 增量日志通过 snapshot 无法获得，这里主动拉取最新状态
      },
      onDone: (payload) => {
        const nextStatus = payload.status as BuildJob['status'];
        setStatus(nextStatus);
        setExitCode(payload.exitCode);
        clearInterval(timer);
        onStatusChange?.(nextStatus);
        void api.getBuild(job.id).then((fresh) => setLogs(fresh.logs ?? []));
        if (payload.status === 'success') toast.success(`「${job.projectName}」构建成功`);
        else if (payload.status === 'failed') toast.error(`「${job.projectName}」构建失败`);
        else toast.info(`「${job.projectName}」构建已取消`);
      },
    });

    // 轮询补齐日志（SSE 的 log 事件仅推送增量文本，服务端状态始终是权威来源）
    const poller = setInterval(() => {
      void api.getBuild(job.id).then((fresh) => {
        setLogs(fresh.logs ?? []);
        setStatus(fresh.status);
        setExitCode(fresh.exitCode);
        if (fresh.status !== 'running') {
          clearInterval(poller);
          onStatusChange?.(fresh.status);
        }
      });
    }, 1200);

    return () => {
      clearInterval(timer);
      clearInterval(poller);
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, job?.id]);

  useEffect(() => {
    if (autoScroll.current && bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [logs]);

  const stop = async () => {
    if (!job) return;
    try {
      await api.stopBuild(job.id);
      toast.info('已发送终止信号');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const StatusIcon =
    status === 'success' ? CheckCircle2 : status === 'failed' ? XCircle : status === 'cancelled' ? CircleSlash : Loader2;

  return (
    <Modal
      open={open}
      title={
        <span className="flex items-center gap-2">
          <StatusIcon className={clsx('h-4 w-4', status === 'running' && 'animate-spin', status === 'success' && 'text-emerald-500', status === 'failed' && 'text-rose-500')} />
          构建日志 · {job?.projectName ?? project?.name ?? ''}
        </span>
      }
      description={
        <span className="block truncate font-mono text-[11px]">
          {job?.cwd} $ {job?.command}
        </span>
      }
      size="xl"
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto text-xs text-slate-400">
            耗时 {(elapsed / 1000).toFixed(1)}s
            {exitCode !== null && ` · 退出码 ${exitCode}`}
          </span>
          {status === 'running' ? (
            <button
              type="button"
              onClick={() => void stop()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:text-rose-400 dark:hover:bg-rose-500/10"
            >
              <Square className="h-3.5 w-3.5" />
              终止构建
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
            >
              关闭
            </button>
          )}
        </>
      }
    >
      <div
        ref={bodyRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="log-view max-h-[52vh] min-h-[240px] overflow-auto rounded-lg bg-slate-950 p-3 text-[12px] leading-[1.7] text-slate-200"
      >
        {logs.length === 0 ? (
          <p className="text-slate-500">等待输出…</p>
        ) : (
          logs.map((line, index) => (
            <div key={index} className={clsx('whitespace-pre-wrap break-all', line.startsWith('[错误]') && 'text-rose-400', line.startsWith('[结束]') && 'text-amber-400', line.startsWith('$') && 'text-emerald-400')}>
              {line || ' '}
            </div>
          ))
        )}
        {status === 'running' && <span className="inline-block h-3.5 w-2 animate-pulse bg-emerald-400 align-middle" />}
      </div>
    </Modal>
  );
}
