# 量子人才雷达自动采集（Sprint 3 骨架）

当前只完成 OpenAlex 的只读连接器和 dry-run 入口：

```powershell
python automation/quantum_radar/run.py
python automation/quantum_radar/run.py --query "quantum error correction" --live
```

默认不会访问外部服务，也不会写 Supabase。`--live` 仅读取 OpenAlex，持久化和自动关联尚未启用。
